import { readFile } from 'fs/promises';
import { z } from 'zod/v4';

// TODO: Convert to function (input: filePath) => Processed Movie Entry[]

const movieSchema = z.object({
  movieName: z.string(),
  ageRating: z.enum(['PG', 'PG-13', 'R']),
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

const data = await readFile('../../movies.txt', 'utf-8');
const entries = data.split(/\r?\n/).filter(Boolean);

if (entries.length % 2 !== 0) {
  console.warn('Warning: Odd number of lines, last entry may be incomplete.');
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
  console.log('Validated movies:', parseResult.data);
} else {
  console.error('Validation errors:', parseResult.error);
}
