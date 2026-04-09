import { NextRequest, NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import z from 'zod';

import { openAIClient } from '@/clients';
import { getDbClient } from '@/clients/dbClient';
import { MovieService } from '@/services';

const LOCALE_LANGUAGE: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  fi: 'Finnish',
};

const buildPrompt = (locale: string) => {
  const language = LOCALE_LANGUAGE[locale] ?? 'English';
  return `You are PopChoice, a friendly and enthusiastic movie expert who loves helping people discover the perfect film for their mood and situation. 
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
IMPORTANT: You must respond entirely in ${language}. Do not use any other language.
`;
};

const movieService = new MovieService();

// Request validation schemas
const personFormDataSchema = z.object({
  favoriteMovie: z.string().min(1, 'Favorite movie is required'),
  newVsClassic: z.string().min(1, 'New vs Classic preference is required'),
  moodPreference: z.array(z.string()).min(1, 'At least one mood preference is required'),
  tonePreference: z.string().min(1, 'Tone preference is required'),
});

const requestBodySchema = z.union([
  personFormDataSchema, // Single person
  z.array(personFormDataSchema).min(1, 'At least one person is required'), // Multiple people
]);

// Response schemas
const recommendationResponseSchema = z.object({
  description: z.string(),
  title: z.string().describe('The title of the recommended movie'),
});

const apiResponseSchema = z.object({
  description: z.string(),
  title: z.string(),
  posterURL: z.string().url().optional(),
  // Enhanced movie details from the matched result
  movieDetails: z
    .object({
      year: z.number(),
      age_rating: z.string(),
      duration: z.number(),
      score_rating: z.number(),
      similarity: z.number(),
    })
    .optional(),
  // All similar movies found (for debugging or alternative suggestions)
  similarMovies: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        year: z.number(),
        similarity: z.number(),
        age_rating: z.string(),
        duration: z.number(),
        score_rating: z.number(),
        posterURL: z.string().url().optional(), // Added poster URL support
        aiDescription: z.string().optional(), // Added AI-generated description
        isMainRecommendation: z.boolean().optional(), // Mark main recommendation
      }),
    )
    .optional(),
});

// Enhanced type for the full movie match result
export type EnhancedMovieMatch = {
  id: number;
  name: string;
  age_rating: string;
  description: string;
  duration: number;
  score_rating: number;
  year: number;
  similarity: number;
  content: string;
};

// Keep the original type for backward compatibility
export type MovieMatch = {
  id: number;
  content: string;
  similarity: number;
};

type PersonFormData = z.infer<typeof personFormDataSchema>;
type ApiResponse = z.infer<typeof apiResponseSchema>;

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

async function findNearestMatch(embedding: number[]): Promise<EnhancedMovieMatch[] | null> {
  const db = getDbClient();
  const { error, data } = await db.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 6, // Get 6 movies: 1 main recommendation + 5 additional movies
  });

  if (error) {
    console.error('Error finding nearest match:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn('No movies found matching the criteria');
    return null;
  }

  return data as EnhancedMovieMatch[];
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

    console.log('similar movies', similarMovies);
    return similarMovies;
  } catch (error) {
    throw new Error(`Failed to search for similar movies: ${error}`);
  }
}

// Helper: Get recommendation from OpenAI using enhanced movie data
async function getRecommendation(similarMovies: EnhancedMovieMatch[], locale: string) {
  try {
    // Convert enhanced movie data to formatted string for AI consumption
    const moviesContext = similarMovies.map((movie) => movie.content).join('\n\n');

    const recommendation = await openAIClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildPrompt(locale) },
        { role: 'user', content: moviesContext },
      ],
      response_format: zodResponseFormat(
        recommendationResponseSchema,
        'recommendationAPIRequestEvent',
      ),
    });
    if (!recommendation.choices[0].message.content) {
      throw new Error('No output text from OpenAI.');
    }
    return JSON.parse(recommendation.choices[0].message.content);
  } catch (error) {
    throw new Error(`Failed to get recommendation from OpenAI: ${error}`);
  }
}

// Helper: Generate AI descriptions for individual movies
async function generateMovieDescriptions(
  movies: (EnhancedMovieMatch & { posterURL?: string })[],
  userPreferences: PersonFormData[],
  locale: string,
): Promise<(EnhancedMovieMatch & { posterURL?: string; aiDescription?: string })[]> {
  console.log(`Generating AI descriptions for ${movies.length} movies...`);

  const language = LOCALE_LANGUAGE[locale] ?? 'English';
  // Create a prompt specifically for individual movie descriptions
  const descriptionPrompt = `
You are PopChoice, a movie expert creating personalized movie descriptions. For each movie provided, write a brief, engaging description (2-3 sentences) that:

1. Explains why this movie would appeal to the user based on their preferences
2. Highlights the most compelling aspects of the film
3. Uses an enthusiastic, conversational tone
4. Avoids spoilers but creates excitement

User preferences context: ${combineAllPeopleDataToString(userPreferences)}

For each movie, return a description that makes the user excited to watch it.
IMPORTANT: You must respond entirely in ${language}. Do not use any other language.
`;

  const enhancedMovies = await Promise.all(
    movies.map(async (movie) => {
      try {
        const movieContext = `
Movie: ${movie.name} (${movie.year})
Rating: ${movie.age_rating} | Duration: ${movie.duration}min | Score: ${movie.score_rating}/10
Plot: ${movie.description}
Match Score: ${Math.round(movie.similarity * 100)}%
`;

        const descriptionResponse = await openAIClient.chat.completions.create({
          model: 'gpt-4o-mini', // Use mini model for cost efficiency on individual descriptions
          messages: [
            { role: 'system', content: descriptionPrompt },
            { role: 'user', content: movieContext },
          ],
          max_tokens: 150, // Keep descriptions concise
          temperature: 0.7, // Add some creativity
        });

        const aiDescription =
          descriptionResponse.choices[0]?.message?.content?.trim() ||
          `${movie.name} is a ${movie.age_rating} ${movie.year} film with a ${movie.score_rating}/10 rating. This ${Math.round(movie.similarity * 100)}% match offers exactly what you're looking for!`;

        return {
          ...movie,
          aiDescription,
        };
      } catch (error) {
        console.warn(`Failed to generate description for ${movie.name}:`, error);
        // Fallback to a basic description
        return {
          ...movie,
          aiDescription: `${movie.name} (${movie.year}) is a ${movie.age_rating} film with a ${movie.score_rating}/10 rating. This ${Math.round(movie.similarity * 100)}% match aligns perfectly with your preferences!`,
        };
      }
    }),
  );

  return enhancedMovies;
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

// Helper: Enhanced poster fetching for similar movies with batching
async function enhanceSimilarMoviesWithPosters(
  similarMovies: EnhancedMovieMatch[],
  batchSize: number = 3,
): Promise<(EnhancedMovieMatch & { posterURL?: string })[]> {
  const enhancedMovies: (EnhancedMovieMatch & { posterURL?: string })[] = [];

  // Process movies in batches to avoid overwhelming the TMDB API
  for (let i = 0; i < similarMovies.length; i += batchSize) {
    const batch = similarMovies.slice(i, i + batchSize);

    const batchPromises = batch.map(async (movie) => {
      try {
        const posterURL = await getPosterURL(movie.name);
        return { ...movie, posterURL };
      } catch (error) {
        console.warn(`Failed to fetch poster for movie: ${movie.name}`, error);
        return { ...movie, posterURL: undefined };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    enhancedMovies.push(...batchResults);

    // Small delay between batches to be respectful to the API
    if (i + batchSize < similarMovies.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return enhancedMovies;
}

// Main POST handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();

    // Validate request body
    const validatedBody = requestBodySchema.parse(body);

    // Read locale from Accept-Language header, default to English
    const acceptLanguage = req.headers.get('accept-language') ?? 'en';
    const locale = ['en', 'ru', 'fi'].includes(acceptLanguage) ? acceptLanguage : 'en';

    // Normalize to array format for consistent processing
    const allPeopleData: PersonFormData[] = Array.isArray(validatedBody)
      ? validatedBody
      : [validatedBody];

    console.log(
      `Processing recommendation request for ${allPeopleData.length} person(s), locale: ${locale}`,
    );

    // Step 1: Create embedding from all people's data
    const embedding = await createEmbedding(allPeopleData);

    // Step 2: Find similar movies
    const similarMovies = await getSimilarMovies(embedding);

    // Step 3: Get recommendation from OpenAI
    const responseMessage = await getRecommendation(similarMovies, locale);

    // Step 4: Get poster URL for main recommendation
    const posterURL = await getPosterURL(responseMessage.title);

    // Step 5: Enhance similar movies with poster URLs (in batches)
    console.log('Enhancing similar movies with posters...');
    const enhancedSimilarMovies = await enhanceSimilarMoviesWithPosters(similarMovies);

    // Step 6: Generate AI descriptions for each movie
    console.log('Generating personalized AI descriptions for each movie...');
    const moviesWithDescriptions = await generateMovieDescriptions(
      enhancedSimilarMovies,
      allPeopleData,
      locale,
    );

    // Find the recommended movie in our similar movies to get its details
    const recommendedMovie = moviesWithDescriptions.find(
      (movie) =>
        movie.name.toLowerCase().includes(responseMessage.title.toLowerCase()) ||
        responseMessage.title.toLowerCase().includes(movie.name.toLowerCase()),
    );

    // Don't filter out any movies - include all movies in the response
    // The main recommendation info is still provided for context, but UI will show all movies together
    console.log(`Returning all ${moviesWithDescriptions.length} movies in unified list`);

    // Validate and return response with enhanced data
    const response: ApiResponse = {
      description: responseMessage.description,
      title: responseMessage.title,
      posterURL: posterURL,
      movieDetails: recommendedMovie
        ? {
            year: recommendedMovie.year,
            age_rating: recommendedMovie.age_rating,
            duration: recommendedMovie.duration,
            score_rating: recommendedMovie.score_rating,
            similarity: recommendedMovie.similarity,
          }
        : undefined,
      similarMovies: moviesWithDescriptions.map((movie) => ({
        id: Number(movie.id),
        name: movie.name,
        year: movie.year,
        similarity: movie.similarity,
        age_rating: movie.age_rating,
        duration: movie.duration,
        score_rating: movie.score_rating,
        posterURL: movie.posterURL,
        aiDescription: movie.aiDescription,
        // Mark the main recommendation for potential UI highlighting (optional)
        isMainRecommendation: recommendedMovie ? movie.id === recommendedMovie.id : false,
      })),
    };

    const duration = Date.now() - startTime;
    console.log(`Recommendation request completed in ${duration}ms`);

    return NextResponse.json(apiResponseSchema.parse(response));
  } catch (error) {
    console.error('Error in movie recommendation API:', error);

    // Handle validation errors specifically
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 },
      );
    }

    // Handle other known errors
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);

      // Return more specific error messages based on error content
      if (error.message.includes('embedding')) {
        return NextResponse.json({ error: 'Failed to process preferences' }, { status: 500 });
      }
      if (error.message.includes('similar movies')) {
        return NextResponse.json({ error: 'Failed to find matching movies' }, { status: 500 });
      }
      if (error.message.includes('OpenAI')) {
        return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
      }
    }

    // Generic error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: GET handler for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'PopChoice Movie Recommendation API',
    description: 'Get personalized movie recommendations based on preferences',
    version: '1.0.0',
    methods: {
      POST: {
        description: 'Get movie recommendation',
        requestBody: {
          type: 'object | array',
          description: 'Single person data or array of people data',
          schema: {
            favoriteMovie: 'string (required)',
            newVsClassic: 'string (required)',
            moodPreference: 'string[] (required, min 1)',
            tonePreference: 'string (required)',
          },
        },
        response: {
          description: 'string - AI-generated recommendation explanation',
          title: 'string - Recommended movie title',
          posterURL: 'string (optional) - Movie poster URL from TMDB',
          movieDetails: {
            year: 'number - Release year',
            age_rating: 'string - Age rating (G, PG, R, etc.)',
            duration: 'number - Duration in minutes',
            score_rating: 'number - Rating score (0-10)',
            similarity: 'number - Similarity score to user preferences (0-1)',
          },
          similarMovies: 'array - All similar movies found with their details',
        },
      },
    },
    examples: {
      singlePerson: {
        favoriteMovie: 'The Matrix',
        newVsClassic: 'new',
        moodPreference: ['action', 'sci-fi'],
        tonePreference: 'serious',
      },
      multiplePeople: [
        {
          favoriteMovie: 'The Matrix',
          newVsClassic: 'new',
          moodPreference: ['action'],
          tonePreference: 'serious',
        },
        {
          favoriteMovie: 'The Godfather',
          newVsClassic: 'classic',
          moodPreference: ['drama'],
          tonePreference: 'dark',
        },
      ],
    },
  });
}
