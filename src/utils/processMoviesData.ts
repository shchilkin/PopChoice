import { readFile } from 'fs/promises';

import { z } from 'zod/v4';

// Currently not used, will be used for stretch goals to create better embeddings

export const ageRatings = z.enum(['G', 'PG', 'PG-13', 'R', 'NR', '12+', '15', '16+', '18+']);

export const movieSchema = z.object({
  movieName: z.string(),
  ageRating: ageRatings,
  duration: z.string(),
  scoreRating: z
    .string()
    .transform((val) => Number(val.replace(/rating/i, '').trim()))
    .refine((num) => !isNaN(num), { message: 'Score rating must be a number' }),
  description: z.string(),
});

const moviesArraySchema = z.array(movieSchema);

type RawMovieEntry = {
  movieName: string;
  ageRating: string;
  duration: string;
  scoreRating: string;
  description: string;
};

type MovieEntry = z.infer<typeof movieSchema>;

export async function processMoviesFile(filePath: string): Promise<MovieEntry[]> {
  let data: string;
  try {
    data = await readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
  const entries = data.split(/\r?\n/).filter(Boolean);

  if (entries.length % 2 !== 0) {
    throw new Error(
      'Invalid file format: Odd number of lines detected. Each movie entry must have a description line.',
    );
  }

  const rawMovies: RawMovieEntry[] = [];
  for (let i = 0; i < entries.length; i += 2) {
    const [movieName, ageRating, duration, scoreRating] = entries[i]
      .split('|')
      .map((part) => part.trim());
    const description = entries[i + 1]?.trim() || '';
    rawMovies.push({ movieName, ageRating, duration, scoreRating, description });
  }

  const parseResult = moviesArraySchema.safeParse(rawMovies);

  if (parseResult.success) {
    return parseResult.data;
  } else {
    // TODO: Implement better error handling
    // eslint-disable-next-line no-console
    console.error('Validation errors:', parseResult.error);
    return [];
  }
}
