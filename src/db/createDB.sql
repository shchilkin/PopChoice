create table if not exists movies (
  id bigserial primary key,
  content text,
  embedding vector(3072)
);