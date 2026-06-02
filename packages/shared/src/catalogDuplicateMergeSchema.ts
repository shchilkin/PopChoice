export const CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS catalog_duplicate_merge_audit (
    id bigserial PRIMARY KEY,
    action text NOT NULL,
    actor text NOT NULL,
    canonical_movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE RESTRICT,
    loser_movie_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
    result jsonb NOT NULL DEFAULT '{}'::jsonb,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT catalog_duplicate_merge_audit_action_check CHECK (
      action IN ('merge_movies')
    )
  );

  ALTER TABLE catalog_duplicate_merge_audit
    DROP CONSTRAINT IF EXISTS catalog_duplicate_merge_audit_action_check;

  ALTER TABLE catalog_duplicate_merge_audit
    ADD CONSTRAINT catalog_duplicate_merge_audit_action_check CHECK (
      action IN ('merge_movies')
    );

  CREATE INDEX IF NOT EXISTS idx_catalog_duplicate_merge_audit_canonical_created_at
    ON catalog_duplicate_merge_audit (canonical_movie_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_catalog_duplicate_merge_audit_created_at
    ON catalog_duplicate_merge_audit (created_at DESC, id DESC);
`;
