import { NextRequest, NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import z from 'zod';

import { MovieService } from '@/services';
import openAIClient from '@/utils/openaiClient';
import { supabase } from '@/utils/supabaseClient';

const prompt = `
You are PopChoice, a friendly and enthusiastic movie expert who loves helping people discover the perfect film for their mood and situation. 
You will receive two pieces of information: 
1. Context about available movies (including their plots, ratings, and vibes).
2. User preferences (either from a single person or a group of people).

Your job is to recommend the single most suitable movie in a short, engaging, and human-like way. 

For single person:
- Start with a warm greeting or a fun comment.
- Clearly state your top recommendation and why it fits their preferences.

For multiple people:
- Start with a fun comment about finding a movie for the group.
- Analyze the common themes and preferences across all group members.
- Recommend a movie that best satisfies the group's combined preferences.
- Mention how it appeals to different members' tastes.

- Mention a couple of relevant details about the movie (genre, mood, why it's a good fit).
- Do not suggest alternatives. Only provide one best match.
- If you're unsure, say "Sorry, I don't know the answer," and encourage them to try again.

Keep your tone upbeat, conversational, and helpful. Avoid making up facts or recommending movies not in the context.
`;

const movieService = new MovieService();

export type MovieMatch = {
  id: number;
  content: string;
  similarity: number;
};

interface PersonFormData {
  favoriteMovie: string;
  newVsClassic: string;
  moodPreference: string[];
  tonePreference: string;
}

const combineAllPeopleDataToString = (allPeopleData: PersonFormData[]): string => {
  if (allPeopleData.length === 1) {
    // Single person - same as before
    const data = allPeopleData[0];
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }

  // Multiple people - combine all preferences
  let combinedString = `Group of ${allPeopleData.length} people preferences:\n\n`;

  allPeopleData.forEach((personData, index) => {
    combinedString += `Person ${index + 1}:\n`;
    combinedString += Object.entries(personData)
      .map(([key, value]) => `  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
    combinedString += '\n\n';
  });

  return combinedString.trim();
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
async function createEmbedding(allPeopleData: PersonFormData[]) {
  try {
    const embeddingResponse = await openAIClient.embeddings.create({
      model: 'text-embedding-3-large',
      input: combineAllPeopleDataToString(allPeopleData),
    });
    if (!embeddingResponse?.data?.[0]?.embedding) {
      throw new Error('No embedding returned from OpenAI.');
    }
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to create embedding: ${error}`);
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
    throw new Error(`Failed to search for similar movies: ${error}`);
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
    throw new Error(`Failed to get recommendation from OpenAI: ${error}`);
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

    console.log(body);

    // Body should now be an array of PersonFormData
    const allPeopleData: PersonFormData[] = Array.isArray(body) ? body : [body];

    // Step 1: Create embedding from all people's data
    const embedding = await createEmbedding(allPeopleData);

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
