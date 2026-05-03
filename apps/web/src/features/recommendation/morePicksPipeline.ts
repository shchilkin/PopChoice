/**
 * Core pipeline for fetching additional TMDB movie picks.
 * Extracted from route.ts so it can be called both from the HTTP route
 * (legacy real-time path) and the new BullMQ worker (async path).
 */

import z from 'zod';

import { getOpenAIClient } from '@/clients/openaiClient';
import { IMAGE_BASE_URL } from '@/integrations/tmdb';
import { MOVIE_SEED_JOB_OPTIONS, seedQueue } from '@/lib/jobQueue';
import { LOCALE_LANGUAGE, LOCALE_TO_TMDB_LANG } from '@/lib/locale';
import logger from '@/lib/logger';
import { MODELS } from '@/lib/models';
import {
  GENRE_LABEL_TO_TMDB_ID,
  cosineSimilarity,
  normalizeGenreLabel,
  parseTMDBReleaseYear,
} from '@/lib/tmdb';

import type { TMDBDiscoverMovie } from './tmdb';
import type { MovieRowToInsert } from '@/lib/db/recommendations';
import type { Locale } from '@/lib/locale';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
export const MORE_PICKS_PAGE_SIZE = 6;
const TMDB_DISCOVER_FETCH_TIMEOUT_MS = 8_000;
const TMDB_MOVIE_DETAILS_FETCH_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const personFormDataSchema = z.object({
  favoriteMovie: z.string().min(1),
  newVsClassic: z.string().min(1),
  moodPreference: z.array(z.string()).min(1),
  tonePreference: z.string().min(1),
});

export type MorePicksPersonFormData = z.infer<typeof personFormDataSchema>;

const tmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  release_date: z.string(),
  vote_average: z.number(),
  vote_count: z.number().optional(),
  genre_ids: z.array(z.number()).optional(),
  popularity: z.number().optional(),
  poster_path: z.string().nullable(),
});

const tmdbDiscoverResponseSchema = z.object({
  results: z.array(tmdbMovieSchema).optional(),
});

const tmdbMovieDetailSchema = z.object({
  title: z.string().optional(),
  runtime: z.number().nullable().optional(),
  overview: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers (exported for unit testing; callers should prefer runMorePicksPipeline)
// ---------------------------------------------------------------------------

export function extractTMDBParams(allPeopleData: MorePicksPersonFormData[]) {
  const moodCounts: Record<string, number> = {};
  allPeopleData.forEach((p) => {
    p.moodPreference.forEach((mood) => {
      const key = normalizeGenreLabel(mood);
      moodCounts[key] = (moodCounts[key] ?? 0) + 1;
    });
  });

  const genre_ids = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => GENRE_LABEL_TO_TMDB_ID[key])
    .filter((id): id is number => id !== undefined);

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
    primary_release_date_gte = `${currentYear - 10}-01-01`;
  } else if (dominantEra === 'classic') {
    primary_release_date_lte = `${currentYear - 20}-12-31`;
  }

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

function combineAllPeopleDataToString(allPeopleData: MorePicksPersonFormData[]): string {
  if (allPeopleData.length === 1) {
    const data = allPeopleData[0];
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }
  let combined = `Group of ${allPeopleData.length} people preferences:\n\n`;
  allPeopleData.forEach((personData, index) => {
    combined += `Person ${index + 1}:\n`;
    combined += Object.entries(personData)
      .map(([key, value]) => `  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
    combined += '\n\n';
  });
  return combined.trim();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetches a batch of TMDB movie picks tailored to the given quiz data.
 *
 * @param quizData   - Raw quiz answers (single person or group).
 * @param excludeIds - Negative TMDB IDs (as stored in recommendation_movies) to skip.
 * @param page       - TMDB discover page number (≥2; page 1 is used by the main pipeline).
 * @param locale     - UI locale used for localized titles and AI descriptions.
 * @returns          Array of `MovieRowToInsert` ready to be persisted.
 * @throws           If TMDB is not configured or the API is unreachable.
 */
export async function runMorePicksPipeline(
  quizData: unknown,
  excludeIds: number[],
  page: number,
  locale: Locale,
): Promise<MovieRowToInsert[]> {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) throw new Error('TMDB_API_KEY not configured');

  const language = LOCALE_LANGUAGE[locale] ?? 'English';
  const tmdbLang = LOCALE_TO_TMDB_LANG[locale] ?? 'en-US';

  // Parse quiz data with the permissive schema (extra fields like favoriteMovieWhy are fine)
  const parsed = z
    .union([personFormDataSchema, z.array(personFormDataSchema).min(1)])
    .safeParse(quizData);
  if (!parsed.success) throw new Error('Invalid quiz data in recommendation');
  const allPeopleData: MorePicksPersonFormData[] = Array.isArray(parsed.data)
    ? parsed.data
    : [parsed.data];

  const params = extractTMDBParams(allPeopleData);

  // Build TMDB discover URL
  const url = new URL(`${TMDB_API_BASE}/discover/movie`);
  if (params.genre_ids.length > 0) {
    url.searchParams.set('with_genres', params.genre_ids.join('|'));
  }
  url.searchParams.set('sort_by', params.sort_by);
  url.searchParams.set('vote_count.gte', '100');
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('page', String(page));
  if (params.primary_release_date_gte) {
    url.searchParams.set('primary_release_date.gte', params.primary_release_date_gte);
  }
  if (params.primary_release_date_lte) {
    url.searchParams.set('primary_release_date.lte', params.primary_release_date_lte);
  }

  const tmdbResponse = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${tmdbApiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(TMDB_DISCOVER_FETCH_TIMEOUT_MS),
  });

  if (!tmdbResponse.ok) {
    throw new Error(`TMDB discover failed with status ${tmdbResponse.status}`);
  }

  const parsedDiscover = tmdbDiscoverResponseSchema.safeParse(await tmdbResponse.json());
  if (!parsedDiscover.success) {
    logger.error(
      { err: parsedDiscover.error },
      'more-picks pipeline: Invalid TMDB discover response',
    );
    throw new Error('TMDB discover response validation failed');
  }

  // Deduplicate against already-shown movies (excludeIds uses negative TMDB IDs in DB)
  const excludedTmdbIds = new Set(excludeIds.map((id) => -id));
  const candidates = (parsedDiscover.data.results ?? [])
    .filter((m) => !excludedTmdbIds.has(m.id))
    .slice(0, MORE_PICKS_PAGE_SIZE);

  if (candidates.length === 0) return [];

  // Queue seeding job so TMDB movies are persisted for future local searches
  if (seedQueue) {
    const tmdbMoviesForSeeding: TMDBDiscoverMovie[] = candidates.map((m) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      release_date: m.release_date,
      vote_average: m.vote_average,
      vote_count: m.vote_count ?? 100,
      genre_ids: m.genre_ids ?? [],
      popularity: m.popularity ?? 0,
      poster_path: m.poster_path,
    }));
    seedQueue
      .add(
        'seed-movies',
        { tmdbMovies: tmdbMoviesForSeeding, localKeys: [] },
        MOVIE_SEED_JOB_OPTIONS,
      )
      .then(() =>
        logger.info({ queuedMovies: candidates.length }, 'more-picks pipeline: Queued seeding job'),
      )
      .catch((err) => logger.warn({ err }, 'more-picks pipeline: Failed to enqueue seeding job'));
  }

  // Compute cosine similarity scores
  const queryText = combineAllPeopleDataToString(allPeopleData);
  const candidateTexts = candidates.map((m) => {
    const year = parseTMDBReleaseYear(m.release_date);
    const score = Number(m.vote_average?.toFixed(1)) || 0;
    return [`${m.title} (${year}) | TMDB Score: ${score}/10`, m.overview || '']
      .filter(Boolean)
      .join('\n');
  });

  const similarityMap = new Map<number, number>();
  try {
    const [queryEmbedRes, movieEmbedRes] = await Promise.all([
      getOpenAIClient().embeddings.create({ model: MODELS.EMBEDDING, input: queryText }),
      getOpenAIClient().embeddings.create({ model: MODELS.EMBEDDING, input: candidateTexts }),
    ]);
    const queryEmbedding = queryEmbedRes.data[0]?.embedding;
    if (queryEmbedding && queryEmbedding.length > 0) {
      candidates.forEach((m, i) => {
        const movieEmbedding = movieEmbedRes.data[i]?.embedding;
        if (movieEmbedding && movieEmbedding.length === queryEmbedding.length) {
          similarityMap.set(m.id, cosineSimilarity(queryEmbedding, movieEmbedding));
        }
      });
    }
  } catch (err) {
    logger.warn({ err }, 'more-picks pipeline: embedding similarity failed — using fallback score');
  }

  const preferenceContext = queryText;
  const descriptionSystemPrompt = `CRITICAL: Your entire response MUST be written in ${language} only. Never use English or any other language unless ${language} is English.

You are PopChoice, a movie expert creating personalized movie descriptions. Write a brief, engaging description (2-3 sentences) that:

1. Explains why this movie would appeal to the user based on their preferences
2. Highlights the most compelling aspects of the film
3. Uses an enthusiastic, conversational tone
4. Avoids spoilers but creates excitement

User preferences context: ${preferenceContext}

Respond in ${language} only.`;

  const movies: MovieRowToInsert[] = [];
  const BATCH_SIZE = 2;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (tmdb) => {
        const year = parseTMDBReleaseYear(tmdb.release_date);
        const score = Number(tmdb.vote_average?.toFixed(1)) || 0;
        const posterURL = tmdb.poster_path
          ? `${IMAGE_BASE_URL}/w500${tmdb.poster_path}`
          : undefined;

        // Fetch localized title + runtime
        let localizedTitle = tmdb.title;
        let runtime: number | undefined;
        let localizedOverview = tmdb.overview;
        try {
          const detailRes = await fetch(`${TMDB_API_BASE}/movie/${tmdb.id}?language=${tmdbLang}`, {
            headers: { Authorization: `Bearer ${tmdbApiKey}`, Accept: 'application/json' },
            signal: AbortSignal.timeout(TMDB_MOVIE_DETAILS_FETCH_TIMEOUT_MS),
          });

          if (detailRes.ok) {
            const parsedDetail = tmdbMovieDetailSchema.safeParse(await detailRes.json());
            if (parsedDetail.success) {
              localizedTitle = parsedDetail.data.title || localizedTitle;
              runtime = parsedDetail.data.runtime ?? undefined;
              localizedOverview = parsedDetail.data.overview || localizedOverview;
            }
          }
        } catch (err) {
          logger.warn(
            { err, tmdbId: tmdb.id },
            'more-picks pipeline: detail fetch failed — using discover response fields',
          );
        }

        // AI-generated description in the target language
        let aiDescription = localizedOverview;
        try {
          const descriptionResponse = await getOpenAIClient().chat.completions.create({
            model: MODELS.MINI,
            messages: [
              { role: 'system', content: descriptionSystemPrompt },
              {
                role: 'user',
                content: `Movie: ${localizedTitle} (${year})\nRating: ${score}/10\nPlot: ${localizedOverview}`,
              },
            ],
            max_completion_tokens: 150,
          });
          aiDescription = descriptionResponse.choices[0]?.message?.content?.trim() || aiDescription;
        } catch (err) {
          logger.warn(
            { err, tmdbId: tmdb.id },
            'more-picks pipeline: description generation failed — using localized overview',
          );
        }

        return {
          id: -tmdb.id,
          name: tmdb.title,
          year,
          similarity: similarityMap.get(tmdb.id) ?? 0.35,
          age_rating: 'NR',
          duration: runtime,
          score_rating: score,
          posterURL,
          aiDescription,
          localizedName: localizedTitle !== tmdb.title ? localizedTitle : undefined,
          isMainRecommendation: false,
          fromTMDB: true,
        } satisfies MovieRowToInsert;
      }),
    );

    movies.push(...batchResults);

    if (i + BATCH_SIZE < candidates.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return movies;
}
