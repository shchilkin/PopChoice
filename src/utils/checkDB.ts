import openAIClient from './openaiClient';
import { supabase } from './supabaseClient';

// const query = 'Which movies can I take my child to?';
const query = 'I feel like having a good laugh!';
main(query);

async function main(input: string) {
  const embedding = await createEmbedding(input);
  const match = await findNearestMatch(embedding);
  console.log('match ', match);

  if (match) {
    await getChatCompletion(match, input);
  } else {
    console.log('No match found');
  }
}

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const chatMessages: ChatCompletionMessageParam[] = [
  {
    role: 'system',
    content: `You are an enthusiastic movie expert who loves recommending movies to people. You will be given two pieces of information - some context about movies and a question. Your main job is to formulate a short answer to the question using the provided context. If you are unsure and cannot find the answer in the context, say, "Sorry, I don't know the answer." Please do not make up the answer.`,
  },
];

async function createEmbedding(input: string) {
  const embeddingResponse = await openAIClient.embeddings.create({
    model: 'text-embedding-3-large',
    input,
  });
  return embeddingResponse.data[0].embedding;
}

export type MovieMatch = {
  id: number;
  content: string;
  similarity: number;
};

async function findNearestMatch(embedding: number[]): Promise<string | null> {
  const { error, data } = await supabase.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 3,
  });

  if (error) {
    console.error('Error finding nearest match:', error);
    return null;
  }
  return data.map((item: MovieMatch) => item.content).join('\n');
}

async function getChatCompletion(text: string, query: string) {
  chatMessages.push({
    role: 'user',
    content: `Context: ${text} Question: ${query}`,
  });

  const response = await openAIClient.chat.completions.create({
    model: 'gpt-4',
    messages: chatMessages,
    temperature: 0.5,
    frequency_penalty: 0.5,
  });
  console.log(response.choices[0].message.content);
}
