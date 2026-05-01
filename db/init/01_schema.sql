-- Docker init script: runs automatically on first container start.
-- Keep in sync with db/createDB.sql.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS movies (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  age_rating text NOT NULL,
  description text NOT NULL,
  duration integer NOT NULL,
  score_rating float NOT NULL,
  year int NOT NULL,
  embedding vector(3072),
  UNIQUE(name, year)
);

CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
