 create table if not exists movies (
  id bigserial primary key,
  name text not null,
  age_rating text not null,
  description text not null,  
  duration integer not null,
  score_rating float not null,
  year int not null,
  embedding vector(3072),
    UNIQUE(name, year)
);

CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);