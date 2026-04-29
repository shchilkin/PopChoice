import { readFile } from 'fs/promises';

import { Document } from '@langchain/core/documents';

import { movieMetadataSchema } from '@/utils/schemas';

import type { LangChainMovieDocument, MovieMetadata } from '@/utils/types';


/**
 * Custom movie splitter that preserves movie boundaries
 * Each movie becomes exactly one chunk
 */
export const splitMovieDocument = async (pathToFile: string): Promise<LangChainMovieDocument[]> => {
  const content = await readFile(pathToFile, 'utf-8');

  // Split by blank lines to separate movies (CRLF-safe)
  const movieChunks = content.split(/(?:\r?\n){2,}/);

  const documents: LangChainMovieDocument[] = [];

  movieChunks.forEach((chunk, index) => {
    const trimmedChunk = chunk.trim();

    // Skip empty chunks
    if (!trimmedChunk) return;

    const lines = trimmedChunk.split(/\r?\n/);

    // Check if this is a valid movie entry (starts with movie title and year)
    if (lines.length > 0 && /^[A-Za-z0-9].*: \d{4} \|/.test(lines[0])) {
      const movieHeaderMatch = lines[0].match(/^(.*): \d{4} \|/);
      const movieName = movieHeaderMatch ? movieHeaderMatch[1].trim() : lines[0].trim();

      // Create metadata object
      const metadata: MovieMetadata = {
        movieIndex: index + 1,
        movieName,
        chunkSize: trimmedChunk.length,
        source: pathToFile,
      };

      // Validate metadata against schema
      const validatedMetadata = movieMetadataSchema.parse(metadata);

      // Create a Document object with validated metadata
      const document = new Document({
        pageContent: trimmedChunk,
        metadata: validatedMetadata,
      }) as LangChainMovieDocument;

      documents.push(document);
    }
  });

  return documents;
};
