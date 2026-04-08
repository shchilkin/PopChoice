DROP FUNCTION IF EXISTS match_movies(vector, float, int);

CREATE OR REPLACE FUNCTION match_movies (
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  name text,
  age_rating text,
  description text,
  duration integer,
  score_rating float,
  year int,
  similarity float,
  content text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    movies.id, movies.name, movies.age_rating, movies.description,
    movies.duration, movies.score_rating, movies.year,
    1 - (movies.embedding <=> query_embedding) AS similarity,
    format(
      '%s (%s) | %s | Duration: %s min | Rating: %s/10%s%s',
      movies.name, movies.year, movies.age_rating, movies.duration,
      movies.score_rating, chr(10), movies.description
    ) AS content
  FROM movies
  WHERE movies.embedding IS NOT NULL
    AND 1 - (movies.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
