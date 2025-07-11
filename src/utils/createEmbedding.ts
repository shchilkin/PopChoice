import openAIClient from './openaiClient';
import { supabase } from './supabaseClient';
import { splitDocument } from './createChunks';

const chunks = await splitDocument('../../movies.txt');
const chunksContent = chunks.map((chunk) => chunk.pageContent);

const createAndStoreEmbeddings = async () => {
  const chunksWithEmbeddings = await Promise.all(
    chunksContent.map(async (content) => {
      const embeddingResponse = await openAIClient.embeddings.create({
        model: 'text-embedding-3-large',
        input: content,
      });
      return { content, embedding: embeddingResponse.data[0].embedding };
    }),
  );

  try {
    const { error } = await supabase.from('movies').insert(chunksWithEmbeddings);
    if (error) {
      console.error('Supabase error:', error.message, error.details);
    } else {
      console.log('Embeddings stored successfully');
    }
  } catch (error) {
    console.error('Error creating embeddings:', error);
  }
};

createAndStoreEmbeddings();
