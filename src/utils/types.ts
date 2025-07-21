import {
  chunkWithEmbeddingSchema,
  embeddableChunkSchema,
  movieChunkSchema,
  movieDocumentSchema,
  movieRecordSchema,
  parsedMovieSchema,
} from './schemas';

import type { z } from 'zod';

// Inferred types from schemas
export type EmbeddableChunk = z.infer<typeof embeddableChunkSchema>;
export type ChunkWithEmbedding<T extends EmbeddableChunk> = T &
  z.infer<typeof chunkWithEmbeddingSchema>;
export type MovieRecord = z.infer<typeof movieRecordSchema>;
export type MovieChunk = z.infer<typeof movieChunkSchema>;
export type MovieDocument = z.infer<typeof movieDocumentSchema>;
export type ParsedMovie = z.infer<typeof parsedMovieSchema>;
