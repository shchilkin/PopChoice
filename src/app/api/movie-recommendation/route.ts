import { NextRequest, NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import z from 'zod';

import { openAIClient } from '@/clients';
import { getDbClient } from '@/clients/dbClient';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { IMAGE_BASE_URL, MovieService } from '@/services';
import {
  ALWAYS_BLOCK_CATEGORIES,
  checkForPromptInjection,
  judgeForMoviePlatform,
  moderateInput,
} from '@/utils/ai/moderation';

// ---------------------------------------------------------------------------
// Hybrid search constants
// ---------------------------------------------------------------------------

/** Minimum cosine similarity for a local result to be considered "high quality".
 * text-embedding-3-large cosine similarity peaks at 0.55–0.62 for movie queries,
 * so the threshold must stay below that ceiling. */
export const SIMILARITY_THRESHOLD = 0.4;

/** Trigger TMDB fallback when fewer than this many high-quality local results are found. */
export const MIN_HIGH_QUALITY_LOCAL = 3;

/** Pure routing helper — separated so it can be unit-tested without mocking the full route. */
export function shouldFallBackToTMDB(movies: { similarity: number }[]): boolean {
  return movies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD).length < MIN_HIGH_QUALITY_LOCAL;
}

/** Maximum movies in the final merged result set. */
const MAX_TOTAL_MOVIES = 6;

/** Maximum number of TMDB movies to JIT-seed per request. */
const MAX_JIT_SEED_MOVIES = 5;

/** TMDB API base URL (v3). */
const TMDB_API_BASE = 'https://api.themoviedb.org/3';

/**
 * Mapping from stable genre IDs to TMDB genre IDs.
 * The quiz sends genre *labels* (e.g. "Sci-Fi") via toApiFormat. We normalize
 * labels to IDs by stripping non-alpha chars and lowercasing before lookup.
 */
const GENRE_LABEL_TO_TMDB_ID: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  drama: 18,
  horror: 27,
  romance: 10749,
  scifi: 878,
  thriller: 53,
  documentary: 99,
};

/**
 * Normalize a quiz genre label to a stable genre key.
 * Strips non-alpha characters and lowercases so "Sci-Fi" → "scifi", "Action" → "action".
 */
function normalizeGenreLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z]/g, '');
}

const LOCALE_LANGUAGE: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  fi: 'Finnish',
};

const TMDB_LOCALE: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  fi: 'fi-FI',
};

const buildPrompt = (locale: string) => {
  const language = LOCALE_LANGUAGE[locale] ?? 'English';
  return `You are PopChoice, a friendly and enthusiastic movie expert who loves helping people discover the perfect film for their mood and situation. 
You will receive two pieces of information: 
1. Context about available movies (including their plots, ratings, and vibes).
2. User preferences (either from a single person or a group of people).

Your job is to recommend the single most suitable movie in a short, engaging, and human-like way. 

For single person:
- Start with a warm greeting or a fun comment.
- Clearly state your top recommendation and why it fits their preferences.

For multiple people:
- Start with a fun comment about finding a movie for the group.
- Analyze the common themes and preferences across all group members.
- Recommend a movie that best satisfies the group's combined preferences.
- Mention how it appeals to different members' tastes.

- Mention a couple of relevant details about the movie (genre, mood, why it's a good fit).
- Do not suggest alternatives. Only provide one best match.
- If you're unsure, say "Sorry, I don't know the answer," and encourage them to try again.

Keep your tone upbeat, conversational, and helpful. Avoid making up facts or recommending movies not in the context.
IMPORTANT: Write all description and explanation text in ${language}. Do not use any other language.
IMPORTANT: The "title" field must be returned exactly as it appears in the provided movie context. Do not translate, transliterate, rephrase, or normalize the title.
`;
};

const movieService = new MovieService();

// Request validation schemas
const personFormDataSchema = z.object({
  favoriteMovie: z.string().min(1, 'Favorite movie is required'),
  newVsClassic: z.string().min(1, 'New vs Classic preference is required'),
  moodPreference: z.array(z.string()).min(1, 'At least one mood preference is required'),
  tonePreference: z.string().min(1, 'Tone preference is required'),
});

const requestBodySchema = z.union([
  personFormDataSchema, // Single person
  z.array(personFormDataSchema).min(1, 'At least one person is required'), // Multiple people
]);

// Response schemas
const recommendationResponseSchema = z.object({
  description: z.string(),
  title: z.string().describe('The title of the recommended movie'),
});

const apiResponseSchema = z.object({
  description: z.string(),
  title: z.string(),
  posterURL: z.string().url().optional(),
  // Enhanced movie details from the matched result
  movieDetails: z
    .object({
      year: z.number(),
      age_rating: z.string(),
      duration: z.number(),
      score_rating: z.number(),
      similarity: z.number(),
    })
    .optional(),
  // All similar movies found (for debugging or alternative suggestions)
  similarMovies: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        year: z.number(),
        similarity: z.number(),
        age_rating: z.string(),
        duration: z.number(),
        score_rating: z.number(),
        posterURL: z.string().url().optional(), // Added poster URL support
        aiDescription: z.string().optional(), // Added AI-generated description
        localizedName: z.string().optional(), // Localized title from TMDB
        isMainRecommendation: z.boolean().optional(), // Mark main recommendation
        fromTMDB: z.boolean().optional(), // True for movies sourced from TMDB fallback
      }),
    )
    .optional(),
  // Flag indicating that TMDB fallback was used to broaden results
  usedBroaderSearch: z.boolean().optional(),
  // Actual number of movies in the local database (for display)
  dbMovieCount: z.number().optional(),
});

// Enhanced type for the full movie match result
export type EnhancedMovieMatch = {
  id: number;
  name: string;
  age_rating: string;
  description: string;
  duration: number;
  score_rating: number;
  year: number;
  similarity: number;
  content: string;
  /** Pre-populated poster URL, e.g. from TMDB discover response — skips re-lookup if set. */
  posterURL?: string;
};

// Keep the original type for backward compatibility
export type MovieMatch = {
  id: number;
  content: string;
  similarity: number;
};

type PersonFormData = z.infer<typeof personFormDataSchema>;
type ApiResponse = z.infer<typeof apiResponseSchema>;

// ---------------------------------------------------------------------------
// TMDB types & helpers (hybrid search)
// ---------------------------------------------------------------------------

interface TMDBDiscoverMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  poster_path: string | null;
}

/** Extract a 4-digit year from a TMDB `release_date` string ("YYYY-MM-DD"), defaulting to 0. */
function parseTMDBReleaseYear(releaseDate: string | null | undefined): number {
  return releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
}

/**
 * Derive TMDB /discover/movie query parameters from user quiz preferences.
 * Uses a deterministic mapping to avoid an extra LLM call.
 *
 * The quiz sends human-readable labels (e.g. "Sci-Fi", "New", "Serious and thought-provoking")
 * which we normalize to stable keys before mapping.
 */
function extractTMDBParams(allPeopleData: PersonFormData[]): {
  genre_ids: number[];
  sort_by: string;
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
} {
  // Aggregate mood preferences across all people.
  // Normalize labels: "Sci-Fi" → "scifi", "Action" → "action", etc.
  const moodCounts: Record<string, number> = {};
  allPeopleData.forEach((p) => {
    p.moodPreference.forEach((mood) => {
      const key = normalizeGenreLabel(mood);
      moodCounts[key] = (moodCounts[key] ?? 0) + 1;
    });
  });

  // Top genres (up to 3) mapped to TMDB IDs
  const genre_ids = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => GENRE_LABEL_TO_TMDB_ID[key])
    .filter((id): id is number => id !== undefined);

  // Era preference: normalize to 'new' | 'classic' | 'both' by keyword matching.
  // Quiz sends e.g. "New", "Classic", "Both new and classic".
  const eraCounts: Record<string, number> = {};
  allPeopleData.forEach((p) => {
    const era = p.newVsClassic.toLowerCase();
    let key: string;
    if (era.includes('both')) {
      key = 'both';
    } else if (era.includes('classic')) {
      key = 'classic';
    } else if (era.includes('new')) {
      key = 'new';
    } else {
      key = 'both';
    }
    eraCounts[key] = (eraCounts[key] ?? 0) + 1;
  });
  const dominantEra = Object.entries(eraCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'both';

  const currentYear = new Date().getFullYear();
  let primary_release_date_gte: string | undefined;
  let primary_release_date_lte: string | undefined;
  if (dominantEra === 'new') {
    primary_release_date_gte = `${currentYear - 5}-01-01`;
  } else if (dominantEra === 'classic') {
    primary_release_date_lte = '2000-12-31';
  }

  // Tone → sort order. Quiz sends e.g. "Serious and thought-provoking", "Dark and intense".
  // Normalize by keyword matching.
  const toneCounts: Record<string, number> = {};
  allPeopleData.forEach((p) => {
    const tone = p.tonePreference.toLowerCase();
    let key: string;
    if (tone.includes('serious')) {
      key = 'serious';
    } else if (tone.includes('dark')) {
      key = 'dark';
    } else if (tone.includes('balanced')) {
      key = 'balanced';
    } else {
      key = 'light';
    }
    toneCounts[key] = (toneCounts[key] ?? 0) + 1;
  });
  const dominantTone = Object.entries(toneCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'light';
  const sort_by =
    dominantTone === 'serious' || dominantTone === 'dark' ? 'vote_average.desc' : 'popularity.desc';

  return { genre_ids, sort_by, primary_release_date_gte, primary_release_date_lte };
}

/**
 * Call TMDB /discover/movie and return up to MAX_TOTAL_MOVIES results.
 * Returns an empty array on any error so callers can treat failures gracefully.
 */
async function fetchTMDBDiscoverMovies(
  allPeopleData: PersonFormData[],
  tmdbApiKey: string,
): Promise<TMDBDiscoverMovie[]> {
  try {
    const params = extractTMDBParams(allPeopleData);

    const url = new URL(`${TMDB_API_BASE}/discover/movie`);
    if (params.genre_ids.length > 0) {
      url.searchParams.set('with_genres', params.genre_ids.join('|'));
    }
    url.searchParams.set('sort_by', params.sort_by);
    url.searchParams.set('vote_count.gte', '100');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('page', '1');
    if (params.primary_release_date_gte) {
      url.searchParams.set('primary_release_date.gte', params.primary_release_date_gte);
    }
    if (params.primary_release_date_lte) {
      url.searchParams.set('primary_release_date.lte', params.primary_release_date_lte);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${tmdbApiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'TMDB discover request failed');
      return [];
    }

    const data = (await response.json()) as { results?: TMDBDiscoverMovie[] };
    return (data.results ?? []).slice(0, MAX_TOTAL_MOVIES);
  } catch (error) {
    logger.warn({ err: error }, 'Error fetching movies from TMDB discover');
    return [];
  }
}

/**
 * Convert a TMDB discover result to the EnhancedMovieMatch shape used by the rest of the route.
 * Uses a negative TMDB ID so it is distinct from positive local DB IDs.
 */
function tmdbMovieToEnhancedMatch(movie: TMDBDiscoverMovie): EnhancedMovieMatch {
  const year = parseTMDBReleaseYear(movie.release_date);
  const score = Number(movie.vote_average?.toFixed(1)) || 0;

  const content = [`${movie.title} (${year}) | TMDB Score: ${score}/10`, movie.overview || '']
    .filter(Boolean)
    .join('\n');

  // Carry the TMDB poster path through so enhanceSimilarMoviesWithPosters can skip its re-query
  const posterURL = movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : undefined;

  return {
    id: -movie.id, // Negative ID distinguishes TMDB-sourced movies from local DB rows (positive bigserial IDs)
    name: movie.title,
    age_rating: 'NR',
    description: movie.overview || '',
    duration: 0,
    score_rating: score,
    year,
    similarity: 0.6, // Below SIMILARITY_THRESHOLD — clearly a broadened result
    content,
    posterURL,
  };
}

/**
 * Fire-and-forget: generate embeddings for TMDB movies that are not already in the local DB
 * and insert them so that future local searches can find them.
 *
 * NOTE: This runs as a fire-and-forget async task. In serverless environments the runtime
 * may freeze the process after the response is sent, so seeding is best-effort. For
 * guaranteed background work consider a queue/cron worker or a platform `waitUntil` hook.
 */
function seedMoviesInBackground(
  tmdbMovies: TMDBDiscoverMovie[],
  existingLocalNames: Set<string>,
): void {
  const db = getDbClient();
  if (!db.isConfigured()) return;

  // Avoid re-seeding movies already present in the local results for this request
  const toSeed = tmdbMovies.filter((m) => !existingLocalNames.has(m.title.toLowerCase()));
  if (toSeed.length === 0) return;

  // Process in the background — intentionally not awaited
  void (async () => {
    const candidateMovies = toSeed.slice(0, MAX_JIT_SEED_MOVIES);
    if (candidateMovies.length === 0) return;

    // Bulk DB existence check to avoid wasting OpenAI embedding tokens on rows that already exist.
    // The DB uniqueness constraint is (name, year). We query by the movies.name column (matching
    // the TMDB title) only, then filter by year in-memory to build exact composite keys —
    // avoids a Cartesian product from two .in() clauses.
    const existingMovieKeys = new Set<string>();
    try {
      // TMDB movies use `title`; the DB column is `name` — same value, different field names.
      const movieNames = candidateMovies.map((m) => m.title);
      const { data: existingMovies, error } = await db
        .from<{ name: string; year: number }>('movies')
        .select('name, year')
        .in('name', movieNames);

      if (error) {
        logger.warn({ err: error }, 'JIT seeding existence pre-check failed');
      } else {
        for (const row of existingMovies ?? []) {
          existingMovieKeys.add(`${row.name.toLowerCase()}|${Number(row.year ?? 0)}`);
        }
      }
    } catch (err) {
      logger.warn({ err }, 'JIT seeding existence pre-check failed with unexpected error');
    }

    for (const movie of candidateMovies) {
      try {
        const year = parseTMDBReleaseYear(movie.release_date);
        const movieKey = `${movie.title.toLowerCase()}|${year}`;

        if (existingMovieKeys.has(movieKey)) {
          logger.debug(
            { movieTitle: movie.title, year },
            'JIT seeding skipped — movie already in database',
          );
          continue;
        }

        const score = Number(movie.vote_average?.toFixed(1)) || 0;

        const embeddingText = [
          `${movie.title} (${year})`,
          `Rating: NR`,
          `Duration: 0 min`,
          `Score: ${score}/10`,
          `Description: ${movie.overview || ''}`,
        ].join('\n');

        const embeddingResponse = await openAIClient.embeddings.create({
          model: 'text-embedding-3-large',
          input: embeddingText,
        });
        const embedding = embeddingResponse.data[0]?.embedding;
        if (!embedding) continue;

        await db.from('movies').insert({
          name: movie.title,
          year,
          age_rating: 'NR',
          description: movie.overview || '',
          duration: 0,
          score_rating: score,
          embedding,
        });

        logger.info({ movieTitle: movie.title, year }, 'JIT seeded TMDB movie into database');
      } catch (err) {
        // Distinguish expected constraint violations (movie already in DB) from unexpected errors
        const errMsg = err instanceof Error ? err.message : String(err);
        const isDuplicateEntry =
          errMsg.toLowerCase().includes('unique') ||
          errMsg.toLowerCase().includes('duplicate') ||
          errMsg.toLowerCase().includes('already exists');

        if (isDuplicateEntry) {
          logger.debug(
            { movieTitle: movie.title },
            'JIT seeding skipped — movie already in database',
          );
        } else {
          logger.warn({ err, movieTitle: movie.title }, 'JIT seeding failed with unexpected error');
        }
      }
    }
  })();
}

const combineAllPeopleDataToString = (allPeopleData: PersonFormData[]): string => {
  if (allPeopleData.length === 1) {
    // Single person - same as before
    const data = allPeopleData[0];
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }

  // Multiple people - combine all preferences
  let combinedString = `Group of ${allPeopleData.length} people preferences:\n\n`;

  allPeopleData.forEach((personData, index) => {
    combinedString += `Person ${index + 1}:\n`;
    combinedString += Object.entries(personData)
      .map(([key, value]) => `  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
    combinedString += '\n\n';
  });

  return combinedString.trim();
};

async function findNearestMatch(embedding: number[]): Promise<EnhancedMovieMatch[] | null> {
  const db = getDbClient();
  const { error, data } = await db.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 6, // Get 6 movies: 1 main recommendation + 5 additional movies
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

// Helper: Create embedding for user request
async function createEmbedding(allPeopleData: PersonFormData[]) {
  try {
    const embeddingResponse = await openAIClient.embeddings.create({
      model: 'text-embedding-3-large',
      input: combineAllPeopleDataToString(allPeopleData),
    });
    if (!embeddingResponse?.data?.[0]?.embedding) {
      throw new Error('No embedding returned from OpenAI.');
    }
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to create embedding: ${error}`);
  }
}

// Helper: Find similar movies in storage (returns empty array if none found or DB unavailable)
async function getSimilarMovies(embedding: number[]): Promise<EnhancedMovieMatch[]> {
  try {
    const similarMovies = await findNearestMatch(embedding);
    const result = similarMovies ?? [];
    logger.info({ count: result.length }, 'Local similar movies found');
    return result;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to search for similar movies in local DB');
    return [];
  }
}

// Helper: Get recommendation from OpenAI using enhanced movie data
async function getRecommendation(similarMovies: EnhancedMovieMatch[], locale: string) {
  try {
    // Convert enhanced movie data to formatted string for AI consumption
    const moviesContext = similarMovies.map((movie) => movie.content).join('\n\n');

    const recommendation = await openAIClient.chat.completions.create({
      model: 'gpt-5.4',
      messages: [
        { role: 'system', content: buildPrompt(locale) },
        { role: 'user', content: moviesContext },
      ],
      response_format: zodResponseFormat(
        recommendationResponseSchema,
        'recommendationAPIRequestEvent',
      ),
    });
    if (!recommendation.choices[0].message.content) {
      throw new Error('No output text from OpenAI.');
    }
    return JSON.parse(recommendation.choices[0].message.content);
  } catch (error) {
    throw new Error(`Failed to get recommendation from OpenAI: ${error}`);
  }
}

// Helper: Generate AI descriptions for individual movies
async function generateMovieDescriptions(
  movies: (EnhancedMovieMatch & {
    posterURL?: string;
    localizedName?: string;
    localizedOverview?: string;
  })[],
  userPreferences: PersonFormData[],
  locale: string,
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

          const descriptionResponse = await openAIClient.chat.completions.create({
            model: 'gpt-5.4-mini',
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

// Helper: Get poster URL and optional localized name for a movie.
// For TMDB-sourced movies (negative ID), does a direct ID lookup — no title search needed.
async function getMovieInfo(
  movieTitle: string,
  locale: string,
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

    const tmdbLocale = TMDB_LOCALE[locale] ?? 'en-US';
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

// Helper: Enhanced poster + localized info fetching for similar movies with batching
async function enhanceSimilarMoviesWithPosters(
  similarMovies: EnhancedMovieMatch[],
  locale: string,
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

// Main POST handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const rateLimitResponse = await applyRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();

    // Validate request body
    const validatedBody = requestBodySchema.parse(body);

    // Read locale from Accept-Language header, default to English
    // Parse real-world values like "ru-RU,ru;q=0.9,en-US;q=0.8" by taking the first language tag
    const acceptLanguage = req.headers.get('accept-language') ?? 'en';
    const primaryLang = acceptLanguage.split(',')[0].split(';')[0].split('-')[0].toLowerCase();
    const locale = ['en', 'ru', 'fi'].includes(primaryLang) ? primaryLang : 'en';

    // Normalize to array format for consistent processing
    const allPeopleData: PersonFormData[] = Array.isArray(validatedBody)
      ? validatedBody
      : [validatedBody];

    logger.info({ personCount: allPeopleData.length, locale }, 'Processing recommendation request');

    // Step 0: Protect against prompt injection, then moderate + judge all user inputs.
    //
    // Phase A — structural injection check on favoriteMovie (fast regex, no API call).
    // This must run before any LLM sees the text.
    const injectionDetected = allPeopleData.some((p) => checkForPromptInjection(p.favoriteMovie));
    if (injectionDetected) {
      logger.warn('Prompt injection attempt detected in favoriteMovie field');
      return NextResponse.json(
        {
          error:
            'Your input contains content that cannot be processed. Please revise your preferences and try again.',
        },
        { status: 422 },
      );
    }

    // Phase B — Moderation API on all fields including the movie title.
    const textsToModerate = allPeopleData.flatMap((p) =>
      [p.favoriteMovie, p.newVsClassic, p.tonePreference, ...p.moodPreference].filter(
        (text): text is string => typeof text === 'string' && text.length > 0,
      ),
    );
    const moderationResult = await moderateInput(textsToModerate);

    if (moderationResult.flagged) {
      // Phase C — Always-block categories bypass the judge (no movie context justifies these).
      const hasAlwaysBlockCategory = moderationResult.categories.some((c) =>
        ALWAYS_BLOCK_CATEGORIES.has(c),
      );
      if (hasAlwaysBlockCategory) {
        logger.warn(
          { categories: moderationResult.categories },
          'User input blocked by always-block moderation category',
        );
        return NextResponse.json(
          {
            error:
              'Your input contains content that cannot be processed. Please revise your preferences and try again.',
            flaggedCategories: moderationResult.categories,
          },
          { status: 422 },
        );
      }

      // Phase D — Judge pattern: a cheap LLM decides if the flagged content is legitimate
      // movie-platform input. "Kill Bill" flagged for violence is a real film title; the
      // judge recognises this and returns suitable: true.
      const labeledInputs = allPeopleData.flatMap((p) => [
        { field: 'favoriteMovie', value: p.favoriteMovie },
        { field: 'newVsClassic', value: p.newVsClassic },
        { field: 'tonePreference', value: p.tonePreference },
        ...p.moodPreference.map((m) => ({ field: 'moodPreference', value: m })),
      ]);
      const judgeResult = await judgeForMoviePlatform(labeledInputs, moderationResult.categories);

      if (!judgeResult.suitable) {
        logger.warn(
          { categories: moderationResult.categories },
          'User input blocked by judge after moderation flag',
        );
        return NextResponse.json(
          {
            error:
              'Your input contains content that cannot be processed. Please revise your preferences and try again.',
            flaggedCategories: moderationResult.categories,
          },
          { status: 422 },
        );
      }

      logger.info(
        { categories: moderationResult.categories },
        'Judge approved content flagged by moderation — proceeding',
      );
    }

    // Step 1: Create embedding and fetch DB count in parallel
    const [embedding, dbMovieCountResult] = await Promise.all([
      createEmbedding(allPeopleData),
      (async () => {
        try {
          const db = getDbClient();
          if (!db.isConfigured()) return null;
          const countRes = await db.from('movies').select('id', { count: 'exact', head: true });
          return countRes.count ?? null;
        } catch {
          return null;
        }
      })(),
    ]);
    logger.info({ dbMovieCount: dbMovieCountResult }, 'Embedding created, DB count fetched');

    // Step 2: Find similar movies (local vector search)
    let similarMovies = await getSimilarMovies(embedding);

    // Step 3: Hybrid search — fall back to TMDB if local results are insufficient
    let usedBroaderSearch = false;
    const highQualityLocal = similarMovies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD);
    const needsTMDBFallback = shouldFallBackToTMDB(similarMovies);

    if (needsTMDBFallback) {
      logger.info(
        { highQualityLocal: highQualityLocal.length, threshold: SIMILARITY_THRESHOLD },
        'Local results below quality threshold — trying TMDB fallback',
      );

      const tmdbApiKey = process.env.TMDB_API_KEY;
      if (tmdbApiKey) {
        const tmdbMovies = await fetchTMDBDiscoverMovies(allPeopleData, tmdbApiKey);

        if (tmdbMovies.length > 0) {
          // Keep only the high-quality local results, then fill remaining slots with TMDB.
          const localResultsForMerge = highQualityLocal.slice(0, MAX_TOTAL_MOVIES);

          // Build dedup sets from ALL local DB results (any similarity), not just high-quality
          // ones. This prevents movies that are already in the DB (e.g. from a previous JIT
          // seeding) from being returned again via TMDB with fromTMDB=true, even if their
          // cosine similarity on this query falls just below SIMILARITY_THRESHOLD.
          // - localKeys: composite (name|year) for TMDB dedup (handles remakes/sequels)
          // - localTitles: title-only set passed to seedMoviesInBackground
          const localKeys = new Set<string>();
          const localTitles = new Set<string>();
          for (const m of similarMovies) {
            const nameLower = m.name.toLowerCase();
            localKeys.add(`${nameLower}|${m.year}`);
            localTitles.add(nameLower);
          }
          const slotsRemaining = Math.max(0, MAX_TOTAL_MOVIES - localResultsForMerge.length);
          const newTMDBMatches = tmdbMovies
            .filter((m) => {
              const tmdbYear = parseTMDBReleaseYear(m.release_date);
              return !localKeys.has(`${m.title.toLowerCase()}|${tmdbYear}`);
            })
            .slice(0, slotsRemaining)
            .map(tmdbMovieToEnhancedMatch);

          similarMovies = [...localResultsForMerge, ...newTMDBMatches].slice(0, MAX_TOTAL_MOVIES);

          // Only show the UI banner when TMDB movies are actually included
          if (newTMDBMatches.length > 0) {
            usedBroaderSearch = true;
          }

          logger.info(
            {
              localCount: localResultsForMerge.length,
              tmdbCount: newTMDBMatches.length,
              finalCount: similarMovies.length,
            },
            'Merged local and TMDB results',
          );

          // JIT seeding in background — do not await so it never blocks the response.
          // Pass only local titles so the TMDB movies just returned to the user can be seeded.
          seedMoviesInBackground(tmdbMovies, localTitles);
        }
      } else {
        logger.warn('TMDB_API_KEY not configured — skipping TMDB fallback');
      }
    }

    // If we still have no movies after all fallbacks, surface a clear error
    if (similarMovies.length === 0) {
      throw new Error('No similar movies found.');
    }

    // Step 4: Get recommendation from OpenAI
    const responseMessage = await getRecommendation(similarMovies, locale);
    logger.info({ recommendedTitle: responseMessage.title }, 'OpenAI recommendation received');

    // Step 5: Get localized poster + name for main recommendation
    const { posterURL } = await getMovieInfo(responseMessage.title, locale);

    // Step 6: Enhance similar movies with poster URLs and localized names (in batches)
    logger.info('Enhancing similar movies with posters');
    const enhancedSimilarMovies = await enhanceSimilarMoviesWithPosters(similarMovies, locale);

    // Step 7: Generate AI descriptions for each movie
    logger.info('Generating personalized AI descriptions for each movie');
    const moviesWithDescriptions = await generateMovieDescriptions(
      enhancedSimilarMovies,
      allPeopleData,
      locale,
    );

    // Find the recommended movie in our similar movies to get its details
    const recommendedMovie = moviesWithDescriptions.find(
      (movie) =>
        movie.name.toLowerCase().includes(responseMessage.title.toLowerCase()) ||
        responseMessage.title.toLowerCase().includes(movie.name.toLowerCase()),
    );

    // Don't filter out any movies - include all movies in the response
    // The main recommendation info is still provided for context, but UI will show all movies together
    logger.info(
      { movieCount: moviesWithDescriptions.length },
      'Returning all movies in unified list',
    );

    // Validate and return response with enhanced data
    const response: ApiResponse = {
      description: responseMessage.description,
      title: responseMessage.title,
      posterURL: posterURL,
      movieDetails: recommendedMovie
        ? {
            year: recommendedMovie.year,
            age_rating: recommendedMovie.age_rating,
            duration: recommendedMovie.duration,
            score_rating: recommendedMovie.score_rating,
            similarity: recommendedMovie.similarity,
          }
        : undefined,
      similarMovies: moviesWithDescriptions.map((movie) => ({
        id: Number(movie.id),
        name: movie.name,
        year: movie.year,
        similarity: movie.similarity,
        age_rating: movie.age_rating,
        duration: movie.duration,
        score_rating: movie.score_rating,
        posterURL: movie.posterURL,
        aiDescription: movie.aiDescription,
        localizedName: movie.localizedName,
        // Mark the main recommendation for potential UI highlighting (optional)
        isMainRecommendation: recommendedMovie ? movie.id === recommendedMovie.id : false,
        // Negative IDs indicate TMDB-sourced movies not yet persisted locally
        fromTMDB: Number(movie.id) < 0,
      })),
      usedBroaderSearch,
      dbMovieCount: dbMovieCountResult ?? undefined,
    };

    const duration = Date.now() - startTime;
    logger.info(
      { durationMs: duration, movieCount: moviesWithDescriptions.length },
      'Recommendation request completed',
    );

    return NextResponse.json(apiResponseSchema.parse(response));
  } catch (error) {
    // Handle validation errors first — these are client errors (400), not server errors
    if (error instanceof z.ZodError) {
      logger.warn({ err: error, issues: error.errors }, 'Invalid request body');
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 },
      );
    }

    logger.error({ err: error }, 'Error in movie recommendation API');

    // Handle other known errors
    if (error instanceof Error) {
      // Return more specific error messages based on error content
      if (error.message.includes('embedding')) {
        return NextResponse.json({ error: 'Failed to process preferences' }, { status: 500 });
      }
      if (error.message.includes('similar movies')) {
        return NextResponse.json({ error: 'Failed to find matching movies' }, { status: 500 });
      }
      if (error.message.includes('OpenAI')) {
        return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
      }
    }

    // Generic error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: GET handler for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'PopChoice Movie Recommendation API',
    description: 'Get personalized movie recommendations based on preferences',
    version: '1.0.0',
    methods: {
      POST: {
        description: 'Get movie recommendation',
        requestBody: {
          type: 'object | array',
          description: 'Single person data or array of people data',
          schema: {
            favoriteMovie: 'string (required)',
            newVsClassic: 'string (required)',
            moodPreference: 'string[] (required, min 1)',
            tonePreference: 'string (required)',
          },
        },
        response: {
          description: 'string - AI-generated recommendation explanation',
          title: 'string - Recommended movie title',
          posterURL: 'string (optional) - Movie poster URL from TMDB',
          movieDetails: {
            year: 'number - Release year',
            age_rating: 'string - Age rating (G, PG, R, etc.)',
            duration: 'number - Duration in minutes',
            score_rating: 'number - Rating score (0-10)',
            similarity: 'number - Similarity score to user preferences (0-1)',
          },
          similarMovies: 'array - All similar movies found with their details',
        },
      },
    },
    examples: {
      singlePerson: {
        favoriteMovie: 'The Matrix',
        newVsClassic: 'new',
        moodPreference: ['action', 'sci-fi'],
        tonePreference: 'serious',
      },
      multiplePeople: [
        {
          favoriteMovie: 'The Matrix',
          newVsClassic: 'new',
          moodPreference: ['action'],
          tonePreference: 'serious',
        },
        {
          favoriteMovie: 'The Godfather',
          newVsClassic: 'classic',
          moodPreference: ['drama'],
          tonePreference: 'dark',
        },
      ],
    },
  });
}
