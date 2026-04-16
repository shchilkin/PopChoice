import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { openAIClient } from '@/clients';
import { LOCALE_LANGUAGE, LOCALE_TO_TMDB_LANG, parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { MODELS } from '@/lib/models';
import { applyRateLimit } from '@/lib/rateLimit';
import {
  GENRE_LABEL_TO_TMDB_ID,
  cosineSimilarity,
  normalizeGenreLabel,
  parseTMDBReleaseYear,
} from '@/lib/tmdb';
import { IMAGE_BASE_URL } from '@/services';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const RESULTS_PER_PAGE = 6;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const personFormDataSchema = z.object({
  favoriteMovie: z.string().min(1),
  newVsClassic: z.string().min(1),
  moodPreference: z.array(z.string()).min(1),
  tonePreference: z.string().min(1),
});

const requestBodySchema = z.object({
  quizData: z.union([personFormDataSchema, z.array(personFormDataSchema).min(1)]),
  /** TMDB discover page number (2 = first "more" page, since page 1 was used in main route). */
  page: z.number().int().min(2).max(10).optional().default(2),
  /** Negative IDs of TMDB movies already shown to the user; used to deduplicate. */
  excludeIds: z.array(z.number()).optional().default([]),
});

type PersonFormData = z.infer<typeof personFormDataSchema>;

const tmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  release_date: z.string(),
  vote_average: z.number(),
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
// Helpers
// ---------------------------------------------------------------------------

function extractTMDBParams(allPeopleData: PersonFormData[]) {
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

function combineAllPeopleDataToString(allPeopleData: PersonFormData[]): string {
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
// Main handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const locale = parseLocaleFromRequest(req);
  const language = LOCALE_LANGUAGE[locale] ?? 'English';
  const tmdbLang = LOCALE_TO_TMDB_LANG[locale] ?? 'en-US';

  try {
    const body = await req.json();
    const { quizData, page, excludeIds } = requestBodySchema.parse(body);

    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      return NextResponse.json({ error: 'TMDB not configured' }, { status: 503 });
    }

    const allPeopleData: PersonFormData[] = Array.isArray(quizData) ? quizData : [quizData];
    const params = extractTMDBParams(allPeopleData);

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
    });

    if (!tmdbResponse.ok) {
      logger.warn({ status: tmdbResponse.status }, 'more-tmdb-picks: TMDB discover failed');
      return NextResponse.json({ error: 'TMDB request failed' }, { status: 502 });
    }

    const parsedDiscoverResponse = tmdbDiscoverResponseSchema.safeParse(await tmdbResponse.json());
    if (!parsedDiscoverResponse.success) {
      logger.warn(
        { zodError: parsedDiscoverResponse.error },
        'more-tmdb-picks: TMDB discover response validation failed',
      );
    }

    // Deduplicate against already-shown movies (excludeIds uses negative TMDB IDs)
    const excludedTmdbIds = new Set(excludeIds.map((id) => -id));
    const candidates = (
      parsedDiscoverResponse.success ? (parsedDiscoverResponse.data.results ?? []) : []
    )
      .filter((m) => !excludedTmdbIds.has(m.id))
      .slice(0, RESULTS_PER_PAGE);

    if (candidates.length === 0) {
      return NextResponse.json({ movies: [] });
    }

    // Compute real cosine similarities between the query and each TMDB candidate.
    // Both embeddings use the same model so their dot product is the cosine similarity.
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
        openAIClient.embeddings.create({ model: MODELS.EMBEDDING, input: queryText }),
        openAIClient.embeddings.create({ model: MODELS.EMBEDDING, input: candidateTexts }),
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
      logger.warn(
        { err },
        'more-tmdb-picks: embedding for similarity failed — using fallback score',
      );
    }

    // Build descriptions in parallel
    const preferenceContext = queryText;
    const descriptionSystemPrompt = `CRITICAL: Your entire response MUST be written in ${language} only. Never use English or any other language unless ${language} is English.

You are PopChoice, a movie expert creating personalized movie descriptions. Write a brief, engaging description (2-3 sentences) that:

1. Explains why this movie would appeal to the user based on their preferences
2. Highlights the most compelling aspects of the film
3. Uses an enthusiastic, conversational tone
4. Avoids spoilers but creates excitement

User preferences context: ${preferenceContext}

Respond in ${language} only.`;

    const movies: {
      id: number;
      name: string;
      year: number;
      similarity: number;
      age_rating: undefined;
      duration: number | undefined;
      score_rating: number;
      posterURL: string | undefined;
      aiDescription: string;
      fromTMDB: true;
    }[] = [];

    // Process descriptions serially in batches of 2 to avoid rate-limit bursts.
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

          // Fetch localized details: title, runtime, and localized overview in one call.
          let localizedTitle = tmdb.title;
          let runtime: number | undefined;
          let localizedOverview = tmdb.overview;
          try {
            const detailRes = await fetch(
              `${TMDB_API_BASE}/movie/${tmdb.id}?language=${tmdbLang}`,
              { headers: { Authorization: `Bearer ${tmdbApiKey}`, Accept: 'application/json' } },
            );
            if (detailRes.ok) {
              const parsedDetailResponse = tmdbMovieDetailSchema.safeParse(await detailRes.json());
              if (parsedDetailResponse.success) {
                const detail = parsedDetailResponse.data;
                if (detail.title) localizedTitle = detail.title;
                if (detail.runtime) runtime = detail.runtime;
                if (detail.overview) localizedOverview = detail.overview;
              } else {
                logger.warn(
                  { zodError: parsedDetailResponse.error, tmdbId: tmdb.id },
                  'more-tmdb-picks: TMDB detail response validation failed',
                );
              }
            }
          } catch {
            // Non-critical — fall back to discover-provided values
          }

          let aiDescription: string;
          try {
            const movieContext = `Movie: ${localizedTitle} (${year})\nScore: ${score}/10\nPlot: ${localizedOverview}\n\nRemember: respond in ${language} only.`;
            const res = await openAIClient.chat.completions.create({
              model: MODELS.MINI,
              messages: [
                { role: 'system', content: descriptionSystemPrompt },
                { role: 'user', content: movieContext },
              ],
              max_completion_tokens: 150,
            });
            aiDescription = res.choices[0]?.message?.content?.trim() ?? tmdb.overview;
          } catch (error) {
            const isRateLimit =
              typeof error === 'object' &&
              error !== null &&
              'status' in error &&
              (error as { status?: number }).status === 429;
            if (isRateLimit) {
              logger.warn(
                { movieTitle: tmdb.title },
                'more-tmdb-picks: OpenAI rate limit hit, using TMDB overview as fallback',
              );
            } else {
              logger.warn(
                { err: error, movieTitle: tmdb.title },
                'more-tmdb-picks: Failed to generate AI description',
              );
            }
            // Fall back: for non-English locales, attempt a minimal translation of the localized TMDB overview.
            if (locale !== 'en' && localizedOverview) {
              try {
                const translationResponse = await openAIClient.chat.completions.create({
                  model: MODELS.MINI,
                  messages: [
                    {
                      role: 'system',
                      content: `Translate the following movie description to ${language}. Return only the translated text, nothing else.`,
                    },
                    { role: 'user', content: localizedOverview },
                  ],
                  max_completion_tokens: 150,
                });
                const translated = translationResponse.choices[0]?.message?.content?.trim();
                aiDescription = translated || localizedOverview;
              } catch {
                aiDescription = localizedOverview;
              }
            } else {
              aiDescription = tmdb.overview;
            }
          }

          return {
            id: -tmdb.id,
            name: localizedTitle,
            year,
            similarity: similarityMap.get(tmdb.id) ?? 0.35,
            age_rating: undefined as undefined,
            duration: runtime,
            score_rating: score,
            posterURL,
            aiDescription,
            fromTMDB: true as const,
          };
        }),
      );
      movies.push(...batchResults);

      // Small pause between batches to stay within rate limits
      if (i + BATCH_SIZE < candidates.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    logger.info({ count: movies.length, page }, 'more-tmdb-picks: returned movies');
    return NextResponse.json({ movies });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 },
      );
    }
    logger.error({ err: error }, 'more-tmdb-picks: unexpected error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
