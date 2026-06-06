export const CATALOG_METADATA_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS catalog_people (
      id bigserial PRIMARY KEY,
      tmdb_id int,
      name text NOT NULL,
      profile_path text,
      popularity float,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE catalog_people
      ALTER COLUMN tmdb_id TYPE int USING tmdb_id::int;

    CREATE UNIQUE INDEX IF NOT EXISTS catalog_people_tmdb_id_unique
      ON catalog_people (tmdb_id)
      WHERE tmdb_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_catalog_people_name_lower
      ON catalog_people (lower(name));

    CREATE TABLE IF NOT EXISTS catalog_genres (
      id bigserial PRIMARY KEY,
      tmdb_id int,
      name text NOT NULL,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS catalog_genres_tmdb_id_unique
      ON catalog_genres (tmdb_id)
      WHERE tmdb_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_catalog_genres_name_lower
      ON catalog_genres (lower(name));

    CREATE TABLE IF NOT EXISTS catalog_keywords (
      id bigserial PRIMARY KEY,
      tmdb_id int,
      name text NOT NULL,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE catalog_keywords
      ALTER COLUMN tmdb_id TYPE int USING tmdb_id::int;

    CREATE UNIQUE INDEX IF NOT EXISTS catalog_keywords_tmdb_id_unique
      ON catalog_keywords (tmdb_id)
      WHERE tmdb_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_catalog_keywords_name_lower
      ON catalog_keywords (lower(name));

    CREATE TABLE IF NOT EXISTS movie_people (
      id bigserial PRIMARY KEY,
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      person_id bigint NOT NULL REFERENCES catalog_people(id) ON DELETE CASCADE,
      tmdb_credit_id text,
      role text NOT NULL,
      character_name text,
      job text,
      department text,
      billing_order int,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT movie_people_role_check CHECK (role IN ('cast', 'director'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS movie_people_tmdb_credit_unique
      ON movie_people (movie_id, tmdb_credit_id)
      WHERE tmdb_credit_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_movie_people_movie_role_order
      ON movie_people (movie_id, role, billing_order NULLS LAST);

    CREATE INDEX IF NOT EXISTS idx_movie_people_person_role
      ON movie_people (person_id, role);

    CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      genre_id bigint NOT NULL REFERENCES catalog_genres(id) ON DELETE CASCADE,
      source text NOT NULL DEFAULT 'tmdb',
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT movie_genres_source_check CHECK (source IN ('tmdb', 'manual')),
      PRIMARY KEY (movie_id, genre_id)
    );

    ALTER TABLE movie_genres
      DROP CONSTRAINT IF EXISTS movie_genres_source_check;

    ALTER TABLE movie_genres
      ADD CONSTRAINT movie_genres_source_check CHECK (source IN ('tmdb', 'manual'));

    CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_id
      ON movie_genres (genre_id);

    CREATE TABLE IF NOT EXISTS movie_keywords (
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      keyword_id bigint NOT NULL REFERENCES catalog_keywords(id) ON DELETE CASCADE,
      source text NOT NULL DEFAULT 'tmdb',
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT movie_keywords_source_check CHECK (source IN ('tmdb', 'manual')),
      PRIMARY KEY (movie_id, keyword_id)
    );

    ALTER TABLE movie_keywords
      DROP CONSTRAINT IF EXISTS movie_keywords_source_check;

    ALTER TABLE movie_keywords
      ADD CONSTRAINT movie_keywords_source_check CHECK (source IN ('tmdb', 'manual'));

    CREATE INDEX IF NOT EXISTS idx_movie_keywords_keyword_id
      ON movie_keywords (keyword_id);

    CREATE TABLE IF NOT EXISTS catalog_watch_providers (
      id bigserial PRIMARY KEY,
      tmdb_id int,
      provider_name text NOT NULL,
      logo_path text,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS catalog_watch_providers_tmdb_id_unique
      ON catalog_watch_providers (tmdb_id)
      WHERE tmdb_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_catalog_watch_providers_name_lower
      ON catalog_watch_providers (lower(provider_name));

    CREATE TABLE IF NOT EXISTS movie_watch_providers (
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      provider_id bigint NOT NULL REFERENCES catalog_watch_providers(id) ON DELETE CASCADE,
      region text NOT NULL,
      availability_type text NOT NULL,
      display_priority int,
      link text,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT movie_watch_providers_availability_type_check CHECK (
        availability_type IN ('flatrate', 'rent', 'buy', 'ads', 'free')
      ),
      PRIMARY KEY (movie_id, provider_id, region, availability_type)
    );

    CREATE INDEX IF NOT EXISTS idx_movie_watch_providers_region_type
      ON movie_watch_providers (region, availability_type);

    CREATE INDEX IF NOT EXISTS idx_movie_watch_providers_provider_id
      ON movie_watch_providers (provider_id);
  `;
