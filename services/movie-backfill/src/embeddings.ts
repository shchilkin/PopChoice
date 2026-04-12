/**
 * OpenAI embedding utilities for movie-backfill service.
 */

import OpenAI from 'openai';

import { logger } from './logger.js';

export { OpenAI };

/**
 * Create a single OpenAI client to reuse across the whole run.
 */
export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

/**
 * Create embeddings for an array of text strings using the provided client.
 * Processes in batches to avoid rate limits.
 */
export async function createEmbeddings(
  client: OpenAI,
  texts: string[],
  options: { model?: string; batchSize?: number } = {},
): Promise<number[][]> {
  const { model = 'text-embedding-3-large', batchSize = 50 } = options;

  const allEmbeddings: number[][] = [];

  logger.info('Creating embeddings', { count: texts.length, model, batchSize });

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await client.embeddings.create({
      model,
      input: batch,
    });

    const batchEmbeddings = response.data.map((item) => item.embedding);
    allEmbeddings.push(...batchEmbeddings);

    logger.info('Embeddings batch complete', {
      processed: Math.min(i + batchSize, texts.length),
      total: texts.length,
    });
  }

  logger.info('All embeddings created', { total: allEmbeddings.length });
  return allEmbeddings;
}
