-- Single comprehensive match_movies function for PopChoice movie recommendations
-- This function provides structured movie data with formatted content for the API

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS match_movies(vector, float, int);
DROP FUNCTION IF EXISTS match_movies(vector, double precision, integer);

-- Create the new function with correct return type
create or replace function match_movies (
  query_embedding vector(3072),
  match_threshold float default 0.1,
  match_count int default 5
)
returns table (
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
language sql stable
as $$
  select
    movies.id,
    movies.name,
    movies.age_rating,
    movies.description,
    movies.duration,
    movies.score_rating,
    movies.year,
    1 - (movies.embedding <=> query_embedding) as similarity,
    -- Format content for API consumption
    format(
      '%s (%s) | %s | Duration: %s min | Rating: %s/10%s%s',
      movies.name,
      movies.year,
      movies.age_rating,
      movies.duration,
      movies.score_rating,
      chr(10),  -- newline
      movies.description
    ) as content
  from movies
  where movies.embedding is not null
    and 1 - (movies.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
