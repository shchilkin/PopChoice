export const MOVIES_TABLE_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS movies (
      id bigserial PRIMARY KEY,
      name text NOT NULL,
      age_rating text NOT NULL,
      description text NOT NULL,
      duration integer NOT NULL,
      score_rating float NOT NULL,
      year int NOT NULL,
      original_title text,
      original_language text,
      release_date date,
      vote_count integer,
      popularity float,
      metadata_quality_score integer NOT NULL DEFAULT 0,
      metadata_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
      poster_url text,
      localized_name text,
      tmdb_id bigint,
      tmdb_match_confidence float,
      tmdb_match_source text,
      tmdb_matched_at timestamptz,
      embedding vector(3072),
      UNIQUE(name, year)
    );
  `;
