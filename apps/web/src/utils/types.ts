import {
  movieChunkSchema,
  movieFileStatsSchema,
  movieMetadataSchema,
  movieRecordSchema,
  parsedMovieSchema,
} from './schemas';

import type { Document } from '@langchain/core/documents';
import type { z } from 'zod';

// Inferred types from schemas
export type MovieRecord = z.infer<typeof movieRecordSchema>;
export type MovieChunk = z.infer<typeof movieChunkSchema>;
export type MovieFileStats = z.infer<typeof movieFileStatsSchema>;
export type MovieMetadata = z.infer<typeof movieMetadataSchema>;
export type ParsedMovie = z.infer<typeof parsedMovieSchema>;

// LangChain document types
/**
 * Type-safe Document with movie metadata for LangChain processing
 */
export type LangChainMovieDocument = Document<MovieMetadata>;
