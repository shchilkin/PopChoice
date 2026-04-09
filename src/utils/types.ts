import {
  chunkWithEmbeddingSchema,
  embeddableChunkSchema,
  movieChunkSchema,
  movieDocumentSchema,
  movieFileStatsSchema,
  movieMetadataSchema,
  movieRecordSchema,
  movieSchema,
  parsedMovieSchema,
  rawMovieEntrySchema,
} from './schemas';

import type { Document } from '@langchain/core/documents';
import type { z } from 'zod';

// Inferred types from schemas
export type EmbeddableChunk = z.infer<typeof embeddableChunkSchema>;
export type ChunkWithEmbedding<T extends EmbeddableChunk> = T &
  z.infer<typeof chunkWithEmbeddingSchema>;
export type MovieRecord = z.infer<typeof movieRecordSchema>;
export type MovieChunk = z.infer<typeof movieChunkSchema>;
export type MovieDocument = z.infer<typeof movieDocumentSchema>;
export type MovieFileStats = z.infer<typeof movieFileStatsSchema>;
export type MovieMetadata = z.infer<typeof movieMetadataSchema>;
export type ParsedMovie = z.infer<typeof parsedMovieSchema>;

// Movie parser types
export type MovieEntry = z.infer<typeof movieSchema>;
export type RawMovieEntry = z.infer<typeof rawMovieEntrySchema>;

// LangChain document types
/**
 * Type-safe Document with movie metadata for LangChain processing
 */
export type LangChainMovieDocument = Document<MovieMetadata>;
