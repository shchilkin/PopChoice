/**
 * Core pipeline for fetching additional TMDB movie picks.
 * Extracted from route.ts so it can be called both from the HTTP route
 * (legacy real-time path) and the new BullMQ worker (async path).
 */

import z from 'zod';

import { getOpenAIClient } from '@/clients/openaiClient';
import { IMAGE_BASE_URL } from '@/integrations/tmdb';
import { MOVIE_SEED_JOB_NAME, MOVIE_SEED_JOB_OPTIONS, seedQueue } from '@/lib/jobQueue';
import { LOCALE_LANGUAGE, LOCALE_TO_TMDB_LANG } from '@/lib/locale';
import logger from '@/lib/logger';
import { MODELS } from '@/lib/models';
import { OPENAI_TIMEOUTS_MS, openAIRequestOptions } from '@/lib/openaiTimeout';
import { cosineSimilarity, parseTMDBReleaseYear } from '@/lib/tmdb';
import { getTraceCarrier, withTraceSpan } from '@/lib/tracing';

import { morePicksPersonFormDataSchema } from './morePicksSchemas';
import { formatTMDBMovieEmbeddingText } from './tmdb/embeddingText';
import { getTopTMDBGenreIds } from './tmdb/genreSelection';

import type { MorePicksPersonFormData } from './morePicksSchemas';
import type { TMDBDiscoverMovie } from './tmdb';
import type { MovieRowToInsert } from '@/lib/db/recommendations';
import type { Locale } from '@/lib/locale';

export type { MorePicksPersonFormData } from './morePicksSchemas';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const MORE_PICKS_PAGE_SIZE = 6;
const MORE_PICKS_BATCH_SIZE = 2;
const MORE_PICKS_BATCH_DELAY_MS = 200;
const TMDB_DISCOVER_FETCH_TIMEOUT_MS = 8_000;
const TMDB_MOVIE_DETAILS_FETCH_TIMEOUT_MS = 5_000;

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

type MorePicksTMDBMovie = z.infer<typeof tmdbMovieSchema>;

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

type MorePicksEraPreference = 'new' | 'classic' | 'both';
type MorePicksTonePreference = 'serious' | 'dark' | 'balanced' | 'light';

function getDominantValue<TValue extends string>(values: TValue[], fallback: TValue): TValue {
  const counts = new Map<TValue, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ?? fallback;
}

function getTopGenreIds(allPeopleData: MorePicksPersonFormData[]): number[] {
  return getTopTMDBGenreIds(allPeopleData.flatMap((person) => person.moodPreference));
}

function normalizeEraPreference(value: string): MorePicksEraPreference {
  const era = value.toLowerCase();
  if (era.includes('both')) return 'both';
  if (era.includes('classic')) return 'classic';
  if (era.includes('new')) return 'new';
  return 'both';
}

function getReleaseDateFilters(dominantEra: MorePicksEraPreference): {
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
} {
  const currentYear = new Date().getFullYear();
  if (dominantEra === 'new') {
    return { primary_release_date_gte: `${currentYear - 10}-01-01` };
  }

  if (dominantEra === 'classic') {
    return { primary_release_date_lte: `${currentYear - 20}-12-31` };
  }

  return {};
}

function normalizeTonePreference(value: string): MorePicksTonePreference {
  const tone = value.toLowerCase();
  if (tone.includes('serious')) return 'serious';
  if (tone.includes('dark')) return 'dark';
  if (tone.includes('balanced')) return 'balanced';
  return 'light';
}

function getSortBy(dominantTone: MorePicksTonePreference): string {
  return dominantTone === 'serious' || dominantTone === 'dark'
    ? 'vote_average.desc'
    : 'popularity.desc';
}

export function extractTMDBParams(allPeopleData: MorePicksPersonFormData[]) {
  const dominantEra = getDominantValue(
    allPeopleData.map((person) => normalizeEraPreference(person.newVsClassic)),
    'both',
  );
  const dominantTone = getDominantValue(
    allPeopleData.map((person) => normalizeTonePreference(person.tonePreference)),
    'light',
  );

  return {
    genre_ids: getTopGenreIds(allPeopleData),
    sort_by: getSortBy(dominantTone),
    ...getReleaseDateFilters(dominantEra),
  };
}

function combineAllPeopleDataToString(allPeopleData: MorePicksPersonFormData[]): string {
  if (allPeopleData.length === 1) {
    const data = allPeopleData[0];
    return Object.entries(data)
      .filter(([, value]) => !(typeof value === 'string' && value.trim().length === 0))
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }
  let combined = `Group of ${allPeopleData.length} people preferences:\n\n`;
  allPeopleData.forEach((personData, index) => {
    combined += `Person ${index + 1}:\n`;
    combined += Object.entries(personData)
      .filter(([, value]) => !(typeof value === 'string' && value.trim().length === 0))
      .map(([key, value]) => `  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
    combined += '\n\n';
  });
  return combined.trim();
}

function parseMorePicksQuizData(quizData: unknown): MorePicksPersonFormData[] {
  const parsed = z
    .union([morePicksPersonFormDataSchema, z.array(morePicksPersonFormDataSchema).min(1)])
    .safeParse(quizData);

  if (!parsed.success) throw new Error('Invalid quiz data in recommendation');
  return Array.isArray(parsed.data) ? parsed.data : [parsed.data];
}

function buildTMDBDiscoverUrl(params: ReturnType<typeof extractTMDBParams>, page: number): URL {
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
  return url;
}

async function fetchMorePicksCandidates(input: {
  tmdbApiKey: string;
  params: ReturnType<typeof extractTMDBParams>;
  page: number;
  excludeIds: number[];
}): Promise<MorePicksTMDBMovie[]> {
  const url = buildTMDBDiscoverUrl(input.params, input.page);
  const tmdbResponse = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${input.tmdbApiKey}`, Accept: 'application/json' },
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

  const excludedTmdbIds = new Set(input.excludeIds.map((id) => -id));
  return (parsedDiscover.data.results ?? [])
    .filter((movie) => !excludedTmdbIds.has(movie.id))
    .slice(0, MORE_PICKS_PAGE_SIZE);
}

function toTMDBSeedMovie(movie: MorePicksTMDBMovie): TMDBDiscoverMovie {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count ?? 100,
    genre_ids: movie.genre_ids ?? [],
    popularity: movie.popularity ?? 0,
    poster_path: movie.poster_path,
  };
}

async function enqueueMorePicksSeedJob(candidates: MorePicksTMDBMovie[]): Promise<void> {
  if (!seedQueue) return;

  const queue = seedQueue;
  const tmdbMoviesForSeeding = candidates.map(toTMDBSeedMovie);
  await withTraceSpan(
    'movie_seed.enqueue',
    {
      attributes: {
        'messaging.system': 'bullmq',
        'messaging.destination.name': 'movie-seed',
        'messaging.operation.name': 'enqueue',
        'movie.count': tmdbMoviesForSeeding.length,
      },
    },
    async (span) => {
      const job = await queue.add(
        MOVIE_SEED_JOB_NAME,
        { tmdbMovies: tmdbMoviesForSeeding, localKeys: [], trace: getTraceCarrier() },
        MOVIE_SEED_JOB_OPTIONS,
      );
      span.setAttribute('job.id', String(job.id ?? 'unknown'));
    },
  )
    .then(() =>
      logger.info({ queuedMovies: candidates.length }, 'more-picks pipeline: Queued seeding job'),
    )
    .catch((err) => logger.warn({ err }, 'more-picks pipeline: Failed to enqueue seeding job'));
}

async function computeMorePicksSimilarityMap(
  allPeopleData: MorePicksPersonFormData[],
  candidates: MorePicksTMDBMovie[],
): Promise<Map<number, number>> {
  const similarityMap = new Map<number, number>();
  const queryText = combineAllPeopleDataToString(allPeopleData);
  const candidateTexts = candidates.map(formatTMDBMovieEmbeddingText);

  try {
    const [queryEmbedRes, movieEmbedRes] = await Promise.all([
      getOpenAIClient().embeddings.create(
        { model: MODELS.EMBEDDING, input: queryText },
        openAIRequestOptions(OPENAI_TIMEOUTS_MS.embedding),
      ),
      getOpenAIClient().embeddings.create(
        { model: MODELS.EMBEDDING, input: candidateTexts },
        openAIRequestOptions(OPENAI_TIMEOUTS_MS.embedding),
      ),
    ]);
    const queryEmbedding = queryEmbedRes.data[0]?.embedding;
    if (!queryEmbedding || queryEmbedding.length === 0) return similarityMap;

    candidates.forEach((movie, index) => {
      const movieEmbedding = movieEmbedRes.data[index]?.embedding;
      if (movieEmbedding && movieEmbedding.length === queryEmbedding.length) {
        similarityMap.set(movie.id, cosineSimilarity(queryEmbedding, movieEmbedding));
      }
    });
  } catch (err) {
    logger.warn({ err }, 'more-picks pipeline: embedding similarity failed — using fallback score');
  }

  return similarityMap;
}

function buildDescriptionSystemPrompt(language: string, preferenceContext: string): string {
  return `CRITICAL: Your entire response MUST be written in ${language} only. Never use English or any other language unless ${language} is English.

You are PopChoice, a movie expert creating personalized movie descriptions. Write a brief, engaging description (2-3 sentences) that:

1. Explains why this movie would appeal to the user based on their preferences
2. Highlights the most compelling aspects of the film
3. Uses an enthusiastic, conversational tone
4. Avoids spoilers but creates excitement

User preferences context: ${preferenceContext}

Respond in ${language} only.`;
}

async function fetchLocalizedMovieDetail(input: {
  tmdbApiKey: string;
  tmdb: MorePicksTMDBMovie;
  tmdbLang: string;
}): Promise<{ title: string; runtime?: number; overview: string }> {
  const fallback = { title: input.tmdb.title, overview: input.tmdb.overview };

  try {
    const detailRes = await fetch(
      `${TMDB_API_BASE}/movie/${input.tmdb.id}?language=${input.tmdbLang}`,
      {
        headers: { Authorization: `Bearer ${input.tmdbApiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TMDB_MOVIE_DETAILS_FETCH_TIMEOUT_MS),
      },
    );
    if (!detailRes.ok) return fallback;

    const parsedDetail = tmdbMovieDetailSchema.safeParse(await detailRes.json());
    if (!parsedDetail.success) return fallback;

    return {
      title: parsedDetail.data.title || fallback.title,
      runtime: parsedDetail.data.runtime ?? undefined,
      overview: parsedDetail.data.overview || fallback.overview,
    };
  } catch (err) {
    logger.warn(
      { err, tmdbId: input.tmdb.id },
      'more-picks pipeline: detail fetch failed — using discover response fields',
    );
    return fallback;
  }
}

async function generateLocalizedDescription(input: {
  tmdbId: number;
  localizedTitle: string;
  year: number;
  score: number;
  localizedOverview: string;
  descriptionSystemPrompt: string;
}): Promise<string> {
  try {
    const descriptionResponse = await getOpenAIClient().chat.completions.create(
      {
        model: MODELS.MINI,
        messages: [
          { role: 'system', content: input.descriptionSystemPrompt },
          {
            role: 'user',
            content: `Movie: ${input.localizedTitle} (${input.year})\nRating: ${input.score}/10\nPlot: ${input.localizedOverview}`,
          },
        ],
        max_completion_tokens: 150,
      },
      openAIRequestOptions(OPENAI_TIMEOUTS_MS.description),
    );
    return descriptionResponse.choices[0]?.message?.content?.trim() || input.localizedOverview;
  } catch (err) {
    logger.warn(
      { err, tmdbId: input.tmdbId },
      'more-picks pipeline: description generation failed — using localized overview',
    );
    return input.localizedOverview;
  }
}

async function createMorePicksMovieRow(input: {
  tmdb: MorePicksTMDBMovie;
  tmdbApiKey: string;
  tmdbLang: string;
  descriptionSystemPrompt: string;
  similarityMap: Map<number, number>;
}): Promise<MovieRowToInsert> {
  const year = parseTMDBReleaseYear(input.tmdb.release_date);
  const score = Number(input.tmdb.vote_average?.toFixed(1)) || 0;
  const posterURL = input.tmdb.poster_path
    ? `${IMAGE_BASE_URL}/w500${input.tmdb.poster_path}`
    : undefined;
  const detail = await fetchLocalizedMovieDetail({
    tmdbApiKey: input.tmdbApiKey,
    tmdb: input.tmdb,
    tmdbLang: input.tmdbLang,
  });
  const aiDescription = await generateLocalizedDescription({
    tmdbId: input.tmdb.id,
    localizedTitle: detail.title,
    year,
    score,
    localizedOverview: detail.overview,
    descriptionSystemPrompt: input.descriptionSystemPrompt,
  });

  return {
    id: -input.tmdb.id,
    name: input.tmdb.title,
    year,
    similarity: input.similarityMap.get(input.tmdb.id) ?? 0.35,
    age_rating: 'NR',
    duration: detail.runtime,
    score_rating: score,
    posterURL,
    aiDescription,
    localizedName: detail.title !== input.tmdb.title ? detail.title : undefined,
    isMainRecommendation: false,
    fromTMDB: true,
    source: 'tmdb-search',
  };
}

async function buildMorePicksMovieRows(input: {
  candidates: MorePicksTMDBMovie[];
  tmdbApiKey: string;
  tmdbLang: string;
  descriptionSystemPrompt: string;
  similarityMap: Map<number, number>;
}): Promise<MovieRowToInsert[]> {
  const movies: MovieRowToInsert[] = [];

  for (let i = 0; i < input.candidates.length; i += MORE_PICKS_BATCH_SIZE) {
    const batch = input.candidates.slice(i, i + MORE_PICKS_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((tmdb) =>
        createMorePicksMovieRow({
          tmdb,
          tmdbApiKey: input.tmdbApiKey,
          tmdbLang: input.tmdbLang,
          descriptionSystemPrompt: input.descriptionSystemPrompt,
          similarityMap: input.similarityMap,
        }),
      ),
    );
    movies.push(...batchResults);

    if (i + MORE_PICKS_BATCH_SIZE < input.candidates.length) {
      await new Promise((resolve) => setTimeout(resolve, MORE_PICKS_BATCH_DELAY_MS));
    }
  }

  return movies;
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
  const allPeopleData = parseMorePicksQuizData(quizData);
  const params = extractTMDBParams(allPeopleData);
  const candidates = await fetchMorePicksCandidates({ tmdbApiKey, params, page, excludeIds });

  if (candidates.length === 0) return [];

  await enqueueMorePicksSeedJob(candidates);
  const queryText = combineAllPeopleDataToString(allPeopleData);
  const similarityMap = await computeMorePicksSimilarityMap(allPeopleData, candidates);
  return buildMorePicksMovieRows({
    candidates,
    tmdbApiKey,
    tmdbLang,
    descriptionSystemPrompt: buildDescriptionSystemPrompt(language, queryText),
    similarityMap,
  });
}
