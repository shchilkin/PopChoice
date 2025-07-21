import { z } from 'zod';

/**
 * Base schema for any chunk that can be embedded
 */
export const embeddableChunkSchema = z.object({
  pageContent: z.string(),
});

/**
 * Schema for chunks with embeddings added
 */
export const chunkWithEmbeddingSchema = embeddableChunkSchema.extend({
  embedding: z.array(z.number()),
});
