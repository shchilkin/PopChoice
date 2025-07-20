import path from 'path';

import { openAIClient, supabase } from '@/clients';

import { splitDocument } from './createChunks/createChunks';

/**
 * Creates embeddings for movie chunks and stores them in the database
 */
export const createAndStoreEmbeddings = async (pathToMoviesFile: string) => {
  try {
    // Split document into chunks
    const chunks = await splitDocument(pathToMoviesFile);
    const chunksContent = chunks.map((chunk) => chunk.pageContent);

    // eslint-disable-next-line no-console
    console.log(`Processing ${chunksContent.length} movie chunks...`);

    // Create embeddings for each chunk
    const chunksWithEmbeddings = await Promise.all(
      chunksContent.map(async (content) => {
        const embeddingResponse = await openAIClient.embeddings.create({
          model: 'text-embedding-3-large',
          input: content,
        });
        return { content, embedding: embeddingResponse.data[0].embedding };
      }),
    );

    // eslint-disable-next-line no-console
    console.log('Embeddings created, storing in database...');

    // Store embeddings in database
    const { error } = await supabase.from('movies').insert(chunksWithEmbeddings);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Supabase error:', error.message, error.details);
      throw new Error(`Database error: ${error.message}`);
    }

    // eslint-disable-next-line no-console
    console.log(`Successfully stored ${chunksWithEmbeddings.length} embeddings`);

    return {
      chunksProcessed: chunksWithEmbeddings.length,
      success: true,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating embeddings:', error);
    throw error;
  }
};

// Run the function if this file is executed directly
if (
  process.argv[1]?.endsWith('/createEmbedding.ts') ||
  process.argv[1]?.endsWith('\\createEmbedding.ts')
) {
  // Resolve path to movies.txt relative to project root
  const moviesPath = path.resolve(process.cwd(), 'movies.txt');

  createAndStoreEmbeddings(moviesPath)
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log('Embedding process completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Embedding process failed:', error);
      process.exit(1);
    });
}
