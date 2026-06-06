export const MOVIE_METADATA_SCHEMA_SQL = `
    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS poster_url text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS localized_name text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_id bigint;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_match_confidence float;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_match_source text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_matched_at timestamptz;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_metadata_refreshed_at timestamptz;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS original_title text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS original_language text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS release_date date;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS vote_count integer;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS popularity float;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS metadata_quality_score integer NOT NULL DEFAULT 0;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS metadata_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

    ALTER TABLE movies
      DROP CONSTRAINT IF EXISTS movies_tmdb_match_source_check;

    ALTER TABLE movies
      ADD CONSTRAINT movies_tmdb_match_source_check
      CHECK (tmdb_match_source IS NULL OR tmdb_match_source IN ('tmdb_discovery', 'backfill_auto', 'manual'));

    CREATE UNIQUE INDEX IF NOT EXISTS movies_tmdb_id_unique
      ON movies (tmdb_id)
      WHERE tmdb_id IS NOT NULL;
  `;
