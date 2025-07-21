import { readFile } from 'fs/promises';

import { Document } from 'langchain/document';

/**
 * Movie metadata interface for type safety
 */
export interface MovieMetadata {
  movieIndex: number;
  movieName: string;
  chunkSize: number;
  source: string;
}

/**
 * Type-safe Document with movie metadata
 */
export type MovieDocument = Document<MovieMetadata>;

/**
 * Custom movie splitter that preserves movie boundaries
 * Each movie becomes exactly one chunk
 */
export const splitMovieDocument = async (pathToFile: string): Promise<MovieDocument[]> => {
  const content = await readFile(pathToFile, 'utf-8');

  // Split by double newlines to separate movies
  const movieChunks = content.split('\n\n');

  const documents: MovieDocument[] = [];

  movieChunks.forEach((chunk, index) => {
    const trimmedChunk = chunk.trim();

    // Skip empty chunks
    if (!trimmedChunk) return;

    const lines = trimmedChunk.split('\n');

    // Check if this is a valid movie entry (starts with movie title and year)
    if (lines.length > 0 && /^[A-Za-z].*: \d{4} \|/.test(lines[0])) {
      const movieName = lines[0].split(':')[0].trim();

      // Create a Document object with typed metadata
      const document = new Document({
        pageContent: trimmedChunk,
        metadata: {
          movieIndex: index + 1,
          movieName,
          chunkSize: trimmedChunk.length,
          source: pathToFile,
        } satisfies MovieMetadata,
      }) as MovieDocument;

      documents.push(document);
    }
  });

  return documents;
};

/**
 * Get statistics about movie chunks without splitting
 */
export const getMovieFileStats = async (pathToFile: string) => {
  const chunks = await splitMovieDocument(pathToFile);

  const chunkSizes = chunks.map((chunk) => chunk.pageContent.length);
  const totalChunks = chunks.length;
  const avgChunkSize = Math.round(chunkSizes.reduce((a, b) => a + b, 0) / totalChunks);
  const maxChunkSize = Math.max(...chunkSizes);
  const minChunkSize = Math.min(...chunkSizes);

  return {
    totalChunks,
    avgChunkSize,
    maxChunkSize,
    minChunkSize,
    chunkSizes,
  };
};
