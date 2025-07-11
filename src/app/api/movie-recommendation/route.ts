import { NextRequest, NextResponse } from 'next/server';
import openAIClient from '@/utils/openaiClient';
import { supabase } from '@/utils/supabaseClient';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Create embedding for user request
    let embeddingResponse;
    try {
      embeddingResponse = await openAIClient.embeddings.create({
        model: 'text-embedding-3-large',
        input: combineFormDataToString(body),
      });
    } catch (embeddingError) {
      console.error('Error creating embedding:', embeddingError);
      return NextResponse.json({ error: 'Failed to create embedding.' }, { status: 500 });
    }
    if (!embeddingResponse?.data?.[0]?.embedding) {
      console.error('No embedding returned from OpenAI.');
      return NextResponse.json({ error: 'No embedding returned from OpenAI.' }, { status: 500 });
    }

    // 2. Find similar embedding in storage
    let similarMovies;
    try {
      similarMovies = await findNearestMatch(embeddingResponse.data[0].embedding);
    } catch (dbError) {
      console.error('Error searching for similar movies:', dbError);
      return NextResponse.json({ error: 'Failed to search for similar movies.' }, { status: 500 });
    }
    if (!similarMovies) {
      console.error('No similar movies found.');
      return NextResponse.json({ error: 'No similar movies found.' }, { status: 404 });
    }

    // 3. Get recommendation from OpenAI
    let recommendation;
    try {
      recommendation = await openAIClient.responses.create({
        model: 'gpt-4',
        instructions: prompt,
        input: similarMovies,
      });
    } catch (openAIError) {
      console.error('Error getting recommendation from OpenAI:', openAIError);
      return NextResponse.json(
        { error: 'Failed to get recommendation from OpenAI.' },
        { status: 500 },
      );
    }
    if (!recommendation?.output_text) {
      console.error('No output text from OpenAI.');
      return NextResponse.json({ error: 'No output text from OpenAI.' }, { status: 500 });
    }

    const responseMessage = recommendation.output_text;

    console.log('Response from OpenAI:', responseMessage);

    return NextResponse.json({
      data: responseMessage,
    });
  } catch (error) {
    console.error('Unexpected error in movie recommendation API:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
