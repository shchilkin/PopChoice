import { readFile } from 'fs/promises';

import { Document } from 'langchain/document';

import { movieMetadataSchema } from '@/utils/schemas';

import type { LangChainMovieDocument, MovieMetadata } from '@/utils/types';

/**
 * Custom movie splitter that preserves movie boundaries
 * Each movie becomes exactly one chunk
 */
export const splitMovieDocument = async (pathToFile: string): Promise<LangChainMovieDocument[]> => {
  const content = await readFile(pathToFile, 'utf-8');

  // Split by double newlines to separate movies
  const movieChunks = content.split('\n\n');

  const documents: LangChainMovieDocument[] = [];

  movieChunks.forEach((chunk, index) => {
    const trimmedChunk = chunk.trim();

    // Skip empty chunks
    if (!trimmedChunk) return;

    const lines = trimmedChunk.split('\n');

    // Check if this is a valid movie entry (starts with movie title and year)
    if (lines.length > 0 && /^[A-Za-z0-9].*: \d{4} \|/.test(lines[0])) {
      const movieName = lines[0].split(':')[0].trim();

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
