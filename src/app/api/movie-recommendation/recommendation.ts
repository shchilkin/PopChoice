import { getOpenAIClient } from '@/clients';
import { getDbClient } from '@/clients/dbClient';
import { LOCALE_LANGUAGE, LOCALE_TO_TMDB_LANG, type Locale } from '@/lib/locale';
import logger from '@/lib/logger';
import { MODELS } from '@/lib/models';
import { MovieService } from '@/services';

import { combineAllPeopleDataToString } from './embedding';
import { recommendationResponseJsonSchema, recommendationResponseSchema } from './types';

import type { EnhancedMovieMatch, PersonFormData } from './types';

// ---------------------------------------------------------------------------
// Locale helpers
// ---------------------------------------------------------------------------

const recommendationResponseFormat = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'recommendationAPIRequestEvent',
    strict: true,
    schema: recommendationResponseJsonSchema,
  },
};

const buildPrompt = (locale: Locale, isGroup: boolean) => {
  const language = LOCALE_LANGUAGE[locale] ?? 'English';
  const groupExtra = isGroup
    ? `
For multiple people:
- Use the provided "Group analysis" section to identify overlap and conflicts.
- Prioritize strong common ground first.
- Treat listed disliked genres as strict avoid constraints.
- If there are conflicts, choose a movie that still gives each person at least one meaningful reason to enjoy it.
`
    : '';
  return `You are PopChoice, a friendly and enthusiastic movie expert who loves helping people discover the perfect film for their mood and situation. 
You will receive two pieces of information: 
1. Context about available movies (including their plots, ratings, and vibes).
2. User preferences (either from a single person or a group of people).

Your job is to recommend the single most suitable movie in a short, engaging, and human-like way. 

For single person:
- Start with a warm greeting or a fun comment.
- Clearly state your top recommendation and why it fits their preferences.

${groupExtra}

- Mention a couple of relevant details about the movie (genre, mood, why it's a good fit).
- Do not suggest alternatives. Only provide one best match.
- If you're unsure, say "Sorry, I don't know the answer," and encourage them to try again.

Keep your tone upbeat, conversational, and helpful. Avoid making up facts or recommending movies not in the context.
IMPORTANT: Write all description and explanation text in ${language}. Do not use any other language.
IMPORTANT: The "title" field must be returned exactly as it appears in the provided movie context. Do not translate, transliterate, rephrase, or normalize the title.
`;
};

const movieService = new MovieService();

// ---------------------------------------------------------------------------
// Vector DB search
// ---------------------------------------------------------------------------

async function findNearestMatch(
  embedding: number[],
  matchCount: number = 6,
): Promise<EnhancedMovieMatch[] | null> {
  const db = getDbClient();
  const { error, data } = await db.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: matchCount,
  });

  if (error) {
    logger.error({ err: error }, 'Error finding nearest match');
    return null;
  }

  if (!data || data.length === 0) {
    logger.warn('No movies found matching the criteria');
    return null;
  }

  return data as EnhancedMovieMatch[];
}

/** Find similar movies in the local vector store. Returns an empty array if none found or DB unavailable. */
export async function getSimilarMovies(
  embedding: number[],
  matchCount: number = 6,
): Promise<EnhancedMovieMatch[]> {
  try {
    const similarMovies = await findNearestMatch(embedding, matchCount);
    const result = similarMovies ?? [];
    logger.info({ count: result.length }, 'Local similar movies found');
    return result;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to search for similar movies in local DB');
    return [];
  }
}

type ScoredMovie = EnhancedMovieMatch & {
  avgSimilarity: number;
  minSimilarity: number;
};

/** Movies that appear in every person's top-N list, ranked by average similarity. */
export function intersectResults(perPersonResults: EnhancedMovieMatch[][]): EnhancedMovieMatch[] {
  if (perPersonResults.length === 0) return [];
  if (perPersonResults.length === 1) return [...perPersonResults[0]];

  const indexed = perPersonResults.map(
    (results) => new Map(results.map((movie) => [movie.id, movie] as const)),
  );
  const firstResults = perPersonResults[0];

  const intersection: ScoredMovie[] = [];
  for (const movie of firstResults) {
    const matches = indexed.map((m) => m.get(movie.id)).filter(Boolean) as EnhancedMovieMatch[];
    if (matches.length !== perPersonResults.length) continue;

    const sum = matches.reduce((acc, item) => acc + item.similarity, 0);
    const avgSimilarity = sum / matches.length;
    const minSimilarity = Math.min(...matches.map((item) => item.similarity));

    intersection.push({ ...movie, similarity: avgSimilarity, avgSimilarity, minSimilarity });
  }

  return intersection.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
}

/**
 * Fallback ranking across union of per-person results.
 * Score = highest worst-case similarity (max-min fairness).
 */
export function maxMinFallback(perPersonResults: EnhancedMovieMatch[][]): EnhancedMovieMatch[] {
  if (perPersonResults.length === 0) return [];

  const indexed = perPersonResults.map(
    (results) => new Map(results.map((movie) => [movie.id, movie] as const)),
  );
  const unionMap = new Map<number, EnhancedMovieMatch>();

  for (const results of perPersonResults) {
    for (const movie of results) {
      const existing = unionMap.get(movie.id);
      if (!existing || movie.similarity > existing.similarity) {
        unionMap.set(movie.id, movie);
      }
    }
  }

  const ranked: ScoredMovie[] = [];
  for (const movie of unionMap.values()) {
    const perPersonSimilarity = indexed.map((m) => m.get(movie.id)?.similarity ?? 0);
    const minSimilarity = Math.min(...perPersonSimilarity);
    const avgSimilarity =
      perPersonSimilarity.reduce((acc, value) => acc + value, 0) / perPersonSimilarity.length;
    ranked.push({ ...movie, similarity: minSimilarity, minSimilarity, avgSimilarity });
  }

  return ranked.sort((a, b) => {
    if (b.minSimilarity !== a.minSimilarity) return b.minSimilarity - a.minSimilarity;
    return b.avgSimilarity - a.avgSimilarity;
  });
}

/** Group retrieval strategy: intersection first, then max-min fallback. */
export async function getGroupSimilarMovies(embeddings: number[][]): Promise<EnhancedMovieMatch[]> {
  const perPersonResults = await Promise.all(
    embeddings.map((embedding) => getSimilarMovies(embedding, 15)),
  );

  const intersected = intersectResults(perPersonResults);
  if (intersected.length >= 3) {
    return intersected.slice(0, 6);
  }

  const fallback = maxMinFallback(perPersonResults);
  return fallback.slice(0, 6);
}

function uniqueValues(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}

export function buildGroupAnalysis(allPeopleData: PersonFormData[]): string {
  if (allPeopleData.length <= 1) return '';

  const moodSets = allPeopleData.map((person) => new Set(person.moodPreference));
  const commonMoods = allPeopleData[0].moodPreference.filter((mood) =>
    moodSets.every((set) => set.has(mood)),
  );

  const moodCounts = new Map<string, number>();
  for (const person of allPeopleData) {
    const uniqueMoods = new Set(person.moodPreference);
    for (const mood of uniqueMoods) {
      moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
    }
  }
  const conflictingMoods = Array.from(moodCounts.entries())
    .filter(([, count]) => count > 0 && count < allPeopleData.length)
    .map(([mood]) => mood);

  const toneValues = uniqueValues(allPeopleData.map((person) => person.tonePreference));
  const eraValues = uniqueValues(allPeopleData.map((person) => person.newVsClassic));
  const hardConstraints = uniqueValues(
    allPeopleData.flatMap((person) => person.dislikedGenres ?? []),
  );

  const lines = [
    `Group size: ${allPeopleData.length}`,
    `Common moods: ${commonMoods.length > 0 ? commonMoods.join(', ') : 'none'}`,
    `Conflicting moods: ${conflictingMoods.length > 0 ? conflictingMoods.join(', ') : 'none'}`,
    `Tone agreement: ${toneValues.length === 1 ? toneValues[0] : toneValues.join(' | ')}`,
    `Era agreement: ${eraValues.length === 1 ? eraValues[0] : eraValues.join(' | ')}`,
    `Hard avoid genres: ${hardConstraints.length > 0 ? hardConstraints.join(', ') : 'none'}`,
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// OpenAI recommendation
// ---------------------------------------------------------------------------

/** Ask OpenAI to pick the single best movie from the candidates. */
export async function getRecommendation(
  similarMovies: EnhancedMovieMatch[],
  locale: Locale,
  allPeopleData: PersonFormData[],
) {
  try {
    const isGroup = allPeopleData.length > 1;
    const moviesContext = similarMovies.map((movie) => movie.content).join('\n\n');
    const preferencesContext = combineAllPeopleDataToString(allPeopleData);
    const groupAnalysis = isGroup ? buildGroupAnalysis(allPeopleData) : '';
    const userContext = [
      `Movies context:\n${moviesContext}`,
      `User preferences:\n${preferencesContext}`,
      ...(groupAnalysis ? [`Group analysis:\n${groupAnalysis}`] : []),
    ].join('\n\n');

    const recommendation = await getOpenAIClient().chat.completions.create({
      model: MODELS.RECOMMENDATION,
      messages: [
        { role: 'system', content: buildPrompt(locale, isGroup) },
        { role: 'user', content: userContext },
      ],
      response_format: recommendationResponseFormat,
    });
    if (!recommendation.choices[0].message.content) {
      throw new Error('No output text from OpenAI.');
    }
    return recommendationResponseSchema.parse(
      JSON.parse(recommendation.choices[0].message.content),
    );
  } catch (error) {
    throw new Error(`Failed to get recommendation from OpenAI: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// AI descriptions
// ---------------------------------------------------------------------------

/** Generate a short personalized AI description for each movie in `movies`. */
export async function generateMovieDescriptions(
  movies: (EnhancedMovieMatch & {
    posterURL?: string;
    localizedName?: string;
    localizedOverview?: string;
  })[],
  userPreferences: PersonFormData[],
  locale: Locale,
): Promise<
  (EnhancedMovieMatch & {
    posterURL?: string;
    localizedName?: string;
    localizedOverview?: string;
    aiDescription?: string;
  })[]
> {
  logger.info({ count: movies.length }, 'Generating AI descriptions for movies');

  const language = LOCALE_LANGUAGE[locale] ?? 'English';
  // Create a prompt specifically for individual movie descriptions
  const descriptionPrompt = `CRITICAL: Your entire response MUST be written in ${language} only. Never use English or any other language unless ${language} is English.

You are PopChoice, a movie expert creating personalized movie descriptions. Write a brief, engaging description (2-3 sentences) that:

1. Explains why this movie would appeal to the user based on their preferences
2. Highlights the most compelling aspects of the film
3. Uses an enthusiastic, conversational tone
4. Avoids spoilers but creates excitement

User preferences context: ${combineAllPeopleDataToString(userPreferences)}

Respond in ${language} only.`;

  const enhancedMovies: (EnhancedMovieMatch & {
    posterURL?: string;
    localizedName?: string;
    localizedOverview?: string;
    aiDescription?: string;
  })[] = [];

  // Process descriptions serially in batches of 2 to avoid rate-limit bursts.
  // gpt-5.4-mini has per-minute request limits; 6 simultaneous calls can exceed them.
  const BATCH_SIZE = 2;
  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (movie) => {
        try {
          const movieContext = `Movie: ${movie.name} (${movie.year})
Rating: ${movie.age_rating} | Duration: ${movie.duration}min | Score: ${movie.score_rating}/10
Plot: ${movie.description}

Remember: respond in ${language} only.`;

          const descriptionResponse = await getOpenAIClient().chat.completions.create({
            model: MODELS.MINI,
            messages: [
              { role: 'system', content: descriptionPrompt },
              { role: 'user', content: movieContext },
            ],
            max_completion_tokens: 150,
          });

          const aiDescription =
            descriptionResponse.choices[0]?.message?.content?.trim() || movie.description;

          return { ...movie, aiDescription };
        } catch (error) {
          const isRateLimit =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            (error as { status?: number }).status === 429;
          if (isRateLimit) {
            logger.warn(
              { movieTitle: movie.name },
              'OpenAI rate limit hit while generating description, using movie plot as fallback',
            );
          } else {
            logger.warn(
              { err: error, movieTitle: movie.name },
              'Failed to generate AI description for movie',
            );
          }
          // Use the localized TMDB overview fetched earlier (free, no extra API call).
          // This ensures non-English users see a description in their language even when OpenAI is unavailable.
          const fallback = movie.localizedOverview || movie.description;
          return { ...movie, aiDescription: fallback };
        }
      }),
    );
    enhancedMovies.push(...batchResults);

    // Small pause between batches to stay within rate limits
    if (i + BATCH_SIZE < movies.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return enhancedMovies;
}

// ---------------------------------------------------------------------------
// Poster & localization lookups
// ---------------------------------------------------------------------------

/**
 * Get poster URL and optional localized name/overview for a movie.
 * For TMDB-sourced movies (negative ID), does a direct ID lookup — no title search needed.
 */
export async function getMovieInfo(
  movieTitle: string,
  locale: Locale,
  year?: number,
  tmdbId?: number, // When provided (TMDB-sourced movies), skips title search entirely
): Promise<{ posterURL?: string; localizedName?: string; localizedOverview?: string }> {
  try {
    // Direct ID lookup is 100% accurate — use it whenever we know the TMDB ID
    const enDetails = tmdbId
      ? await movieService.getMovieById(tmdbId)
      : await movieService.getMovieByTitle(movieTitle, year);
    if (!enDetails) {
      logger.warn({ movieTitle }, 'No movie found with title');
      return {};
    }
    const enPosterURL = movieService.getPosterURL(enDetails.poster_path, 'w500');

    if (locale === 'en') return { posterURL: enPosterURL };

    const tmdbLocale = LOCALE_TO_TMDB_LANG[locale] ?? 'en-US';
    const localized = await movieService.getLocalizedMovieInfo(enDetails.id, tmdbLocale);

    const posterURL = localized?.poster_path
      ? movieService.getPosterURL(localized.poster_path, 'w500')
      : enPosterURL;
    // Only surface a localized name when TMDB actually has a different translation
    const localizedName =
      localized?.title && localized.title !== enDetails.title ? localized.title : undefined;
    // Localized overview from TMDB — used as fallback description if OpenAI fails
    const localizedOverview = localized?.overview || undefined;

    return { posterURL, localizedName, localizedOverview };
  } catch (error) {
    logger.warn(
      { err: error, movieTitle, locale },
      'Error fetching movie by title, returning empty',
    );
    return {};
  }
}

/** Batch-fetch poster URLs and localized info for all similar movies. */
export async function enhanceSimilarMoviesWithPosters(
  similarMovies: EnhancedMovieMatch[],
  locale: Locale,
  batchSize: number = 3,
): Promise<
  (EnhancedMovieMatch & {
    posterURL?: string;
    localizedName?: string;
    localizedOverview?: string;
  })[]
> {
  const enhancedMovies: (EnhancedMovieMatch & {
    posterURL?: string;
    localizedName?: string;
    localizedOverview?: string;
  })[] = [];

  // Process movies in batches to avoid overwhelming the TMDB API
  for (let i = 0; i < similarMovies.length; i += batchSize) {
    const batch = similarMovies.slice(i, i + batchSize);

    const batchPromises = batch.map(async (movie) => {
      // TMDB-sourced movies already carry a poster URL — skip the redundant re-query.
      // localizedName is not applicable for TMDB-sourced movies (title is already the TMDB title).
      if (movie.posterURL) {
        return movie;
      }
      try {
        // For TMDB-sourced movies, the ID is stored as negative (-tmdbId).
        // Pass the real TMDB ID so getMovieInfo can do a direct lookup instead of a title search.
        const tmdbId = movie.id < 0 ? -movie.id : undefined;
        const { posterURL, localizedName, localizedOverview } = await getMovieInfo(
          movie.name,
          locale,
          movie.year,
          tmdbId,
        );
        return { ...movie, posterURL, localizedName, localizedOverview };
      } catch (error) {
        logger.warn({ err: error, movieTitle: movie.name }, 'Failed to fetch poster for movie');
        return {
          ...movie,
          posterURL: undefined,
          localizedName: undefined,
          localizedOverview: undefined,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    enhancedMovies.push(...batchResults);

    // Small delay between batches to be respectful to the API
    if (i + batchSize < similarMovies.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return enhancedMovies;
}
