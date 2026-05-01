import { checkTableExists, closeDatabase, getPool, initDatabase, logger } from '@pop-choice/shared';

export { initDatabase, closeDatabase, checkTableExists };

export interface IncompleteMovie {
  id: string;
  name: string;
  year: number;
  score_rating: number;
  description: string;
}

export async function getIncompleteMovies(limit: number): Promise<IncompleteMovie[]> {
  const query =
    limit > 0
      ? 'SELECT id, name, year, score_rating, description FROM movies WHERE duration = 0 ORDER BY id LIMIT $1'
      : 'SELECT id, name, year, score_rating, description FROM movies WHERE duration = 0 ORDER BY id';

  const result = await getPool().query<{
    id: string;
    name: string;
    year: number;
    score_rating: number;
    description: string;
  }>(query, limit > 0 ? [limit] : []);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    year: row.year,
    score_rating: Number(row.score_rating),
    description: row.description,
  }));
}

export async function updateMovie(
  id: string,
  duration: number,
  ageRating: string,
  embedding: number[],
): Promise<void> {
  await getPool().query(
    `UPDATE movies SET duration = $1, age_rating = $2, embedding = $3::vector WHERE id = $4`,
    [duration, ageRating, JSON.stringify(embedding), id],
  );
  logger.debug('Movie updated in database', { id, duration, ageRating });
}
