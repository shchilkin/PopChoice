-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS match_movies(vector, float, int);

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
  tmdb_id bigint,
  tmdb_match_source text,
  original_language text,
  vote_count integer,
  popularity float,
  metadata_quality_score integer,
  metadata_quality_flags jsonb,
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
    movies.tmdb_id,
    movies.tmdb_match_source,
    movies.original_language,
    movies.vote_count,
    movies.popularity,
    movies.metadata_quality_score,
    movies.metadata_quality_flags,
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
    and 1 - (movies.embedding <=> query_embedding) <= 1.0
  order by similarity desc
  limit match_count;
$$;
