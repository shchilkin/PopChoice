import { getOpenAIClient } from '@/clients/openaiClient';
import logger from '@/lib/logger';
import { recordOpenAIProviderError } from '@/lib/metrics';
import { MODELS } from '@/lib/models';
import { OPENAI_TIMEOUTS_MS, openAIRequestOptions } from '@/lib/openaiTimeout';
import { cosineSimilarity } from '@/lib/tmdb';

import { tmdbMovieToEnhancedMatch } from './conversion';
import { formatTMDBMovieEmbeddingText } from './embeddingText';

import type { EnhancedMovieMatch } from '../types';
import type { TMDBDiscoverMovie } from './types';

export async function scoreAndConvertTMDBMovies(
  movies: TMDBDiscoverMovie[],
  queryEmbedding: number[],
): Promise<{ matches: EnhancedMovieMatch[]; embeddings: Map<number, number[]> }> {
  if (movies.length === 0) return { matches: [], embeddings: new Map() };

  const texts = movies.map(formatTMDBMovieEmbeddingText);
  const rawEmbeddings = await embedTMDBMovies(texts);
  const embeddingsMap = new Map<number, number[]>();
  const matches = movies.map((movie, i) => {
    const movieEmbedding = rawEmbeddings[i];
    if (movieEmbedding) embeddingsMap.set(movie.id, movieEmbedding);
    const similarity = getTMDBMovieSimilarity(queryEmbedding, movieEmbedding);
    return tmdbMovieToEnhancedMatch(movie, similarity);
  });

  return { matches, embeddings: embeddingsMap };
}

async function embedTMDBMovies(texts: string[]) {
  try {
    const response = await getOpenAIClient().embeddings.create(
      {
        model: MODELS.EMBEDDING,
        input: texts,
      },
      openAIRequestOptions(OPENAI_TIMEOUTS_MS.embedding),
    );
    return response.data.map((data) => data.embedding);
  } catch (error) {
    recordOpenAIProviderError('similarity_embedding', error);
    logger.warn(
      { err: error },
      'Failed to embed TMDB movies for similarity scoring — using fallback score',
    );
    return [];
  }
}

function getTMDBMovieSimilarity(queryEmbedding: number[], movieEmbedding: number[] | undefined) {
  return movieEmbedding
    ? cosineSimilarity(queryEmbedding, movieEmbedding, (message) => logger.warn(message))
    : 0.35;
}
