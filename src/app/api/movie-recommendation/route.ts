import { NextRequest, NextResponse } from 'next/server';
import openAIClient from '@/utils/openaiClient';
import { supabase } from '@/utils/supabaseClient';
import { zodResponseFormat } from 'openai/helpers/zod';
import z from 'zod';

import { MovieService } from '@/services';

const prompt = `
You are PopChoice, a friendly and enthusiastic movie expert who loves helping people discover the perfect film for their mood and situation. 
You will receive two pieces of information: 
1. Context about available movies (including their plots, ratings, and vibes).
2. A user's question or preferences.

Your job is to recommend the single most suitable movie in a short, engaging, and human-like way. 
- Start with a warm greeting or a fun comment.
- Clearly state your top recommendation and why it fits the user's preferences.
- Mention a couple of relevant details about the movie (genre, mood, why it’s a good fit).
- Do not suggest alternatives. Only provide one best match.
- If you’re unsure, say “Sorry, I don’t know the answer,” and encourage the user to try again.

Keep your tone upbeat, conversational, and helpful. Avoid making up facts or recommending movies not in the context.
`;

const movieService = new MovieService();

export type MovieMatch = {
  id: number;
  content: string;
  similarity: number;
};

const combineFormDataToString = (data: FormData): string => {
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};

const recommendationSchema = z.object({
  description: z.string(),
  title: z.string().describe('The title of the recommended movie'),
});

async function findNearestMatch(embedding: number[]): Promise<string | null> {
  const { error, data } = await supabase.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 1,
  });

  if (error) {
    console.error('Error finding nearest match:', error);
    return null;
  }
  return data.map((item: MovieMatch) => item.content).join('\n');
}

// Helper: Create embedding for user request
async function createEmbedding(body: FormData) {
  try {
    const embeddingResponse = await openAIClient.embeddings.create({
      model: 'text-embedding-3-large',
      input: combineFormDataToString(body),
    });
    if (!embeddingResponse?.data?.[0]?.embedding) {
      throw new Error('No embedding returned from OpenAI.');
    }
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to create embedding: ${error.message || error}`);
  }
}

// Helper: Find similar movies in storage
async function getSimilarMovies(embedding: number[]) {
  try {
    const similarMovies = await findNearestMatch(embedding);
    if (!similarMovies) {
      throw new Error('No similar movies found.');
    }
    return similarMovies;
  } catch (error) {
    throw new Error('Failed to search for similar movies. ' + error);
  }
}

// Helper: Get recommendation from OpenAI
async function getRecommendation(similarMovies: string) {
  try {
    const recommendation = await openAIClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: similarMovies },
      ],
      response_format: zodResponseFormat(recommendationSchema, 'recommendationAPIRequestEvent'),
    });
    if (!recommendation.choices[0].message.content) {
      throw new Error('No output text from OpenAI.');
    }
    return JSON.parse(recommendation.choices[0].message.content);
  } catch (error) {
    throw new Error(`Failed to get recommendation from OpenAI: ${error.message || error}`);
  }
}

// Helper: Get poster URL for recommended movie
async function getPosterURL(movieTitle: string) {
  try {
    const movieDetails = await movieService.getMovieByTitle(movieTitle);
    if (!movieDetails) {
      console.warn(`No movie found with title: ${movieTitle}`);
      return undefined;
    }
    return movieService.getPosterURL(movieDetails.poster_path, 'w500');
  } catch (error) {
    console.error('Error fetching movie by title:', error);
    return undefined;
  }
}

// Main POST handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Create embedding
    const embedding = await createEmbedding(body);

    // Step 2: Find similar movies
    const similarMovies = await getSimilarMovies(embedding);

    // Step 3: Get recommendation from OpenAI
    const responseMessage = await getRecommendation(similarMovies);

    // Step 4: Get poster URL
    const posterURL = await getPosterURL(responseMessage.title);

    // Log for debugging
    console.log('Movie title:', responseMessage.title);
    if (posterURL) {
      console.log('Poster URL:', posterURL);
    }
    console.log('Response from OpenAI:', responseMessage);

    // Return response
    return NextResponse.json({
      description: responseMessage.description,
      title: responseMessage.title,
      posterURL: posterURL,
    });
  } catch (error) {
    console.error('Unexpected error in movie recommendation API:', error);
    if (error instanceof Error) {
      console.error('Unexpected error stack:', error.stack);
    } else {
      console.error('Unexpected error details:', JSON.stringify(error));
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
