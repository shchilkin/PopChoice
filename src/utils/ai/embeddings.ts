import { openAIClient } from '@/clients/openaiClient';

import type { ChunkWithEmbedding, EmbeddableChunk } from '../types';

// Re-export types for convenience
export type { ChunkWithEmbedding, EmbeddableChunk };

/**
 * Generic function to create embeddings for any type of chunks
 * @param chunks - Array of chunks that have pageContent
 * @param model - OpenAI embedding model to use (default: 'text-embedding-3-large')
 * @returns Array of chunks with their embeddings added
 */
export async function createEmbeddingsForChunks<T extends EmbeddableChunk>(
  chunks: T[],
  model: string = 'text-embedding-3-large',
): Promise<ChunkWithEmbedding<T>[]> {
  return Promise.all(
    chunks.map(async (chunk) => {
      const embeddingResponse = await openAIClient.embeddings.create({
        model,
        input: chunk.pageContent,
      });

      return {
        ...chunk,
        embedding: embeddingResponse.data[0].embedding,
      } as ChunkWithEmbedding<T>;
    }),
  );
}

/**
 * Create embeddings for chunks with progress logging
 * @param chunks - Array of chunks to process
 * @param options - Configuration options
 */
export async function createEmbeddingsWithProgress<T extends EmbeddableChunk>(
  chunks: T[],
  options: {
    model?: string;
    batchSize?: number;
    logProgress?: boolean;
  } = {},
): Promise<ChunkWithEmbedding<T>[]> {
  const { model = 'text-embedding-3-large', batchSize = 50, logProgress = true } = options;

  if (logProgress) {
    console.log(`\n🚀 Creating embeddings for ${chunks.length} chunks...`);
  }

  const results: ChunkWithEmbedding<T>[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchResults = await createEmbeddingsForChunks(batch, model);
    results.push(...batchResults);

    if (logProgress) {
      console.log(`✅ Processed ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks`);
    }
  }

  if (logProgress) {
    console.log(`🎉 Created ${results.length} embeddings successfully!`);
  }

  return results;
}
