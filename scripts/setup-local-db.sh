#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"

# Set or update a key=value pair in the .env file
set_env_var() {
  local key="$1"
  local value="$2"
  if [ -f "$ENV_FILE" ] && grep -q "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

# Resolve credentials: reuse existing .env values, generate password only on first run
if [ -f "$ENV_FILE" ] && grep -q "^POSTGRES_PASSWORD=" "$ENV_FILE"; then
  POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2-)
  POSTGRES_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "postgres")
  POSTGRES_DB=$(grep "^POSTGRES_DB=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "popchoice")
  echo "Reusing existing credentials from ${ENV_FILE}"
else
  POSTGRES_USER="${POSTGRES_USER:-postgres}"
  POSTGRES_DB="${POSTGRES_DB:-popchoice}"
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  echo "Generating new local database credentials..."
  set_env_var "POSTGRES_USER" "$POSTGRES_USER"
  set_env_var "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
  set_env_var "POSTGRES_DB" "$POSTGRES_DB"
  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
  set_env_var "DATABASE_URL" "$DATABASE_URL"
  set_env_var "REDIS_URL" "redis://localhost:6379"
  echo "Credentials written to ${ENV_FILE}"
fi

echo ""
echo "Starting Docker container..."
docker compose up -d --wait
echo ""
echo "PostgreSQL is healthy and ready."
echo "Redis is running at localhost:6379."
echo "Run 'npm run populate-db' to seed the database."
