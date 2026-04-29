import OpenAI from 'openai';

import { logger } from './logger.js';

export async function createEmbeddings(
  openaiApiKey: string,
  texts: string[],
  options: { model?: string; batchSize?: number } = {},
): Promise<number[][]> {
  const { model = 'text-embedding-3-large', batchSize = 50 } = options;
  const client = new OpenAI({ apiKey: openaiApiKey, timeout: 60_000 });
  const allEmbeddings: number[][] = [];

  logger.info('Creating embeddings', { count: texts.length, model, batchSize });

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await client.embeddings.create({ model, input: batch });
    allEmbeddings.push(...response.data.map((item) => item.embedding));
    logger.info('Embeddings batch complete', {
      processed: Math.min(i + batchSize, texts.length),
      total: texts.length,
    });
  }

  logger.info('All embeddings created', { total: allEmbeddings.length });
  return allEmbeddings;
}
