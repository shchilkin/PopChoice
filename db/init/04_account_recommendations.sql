ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id_created_at
  ON recommendations (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
