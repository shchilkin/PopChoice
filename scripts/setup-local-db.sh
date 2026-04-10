#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-popchoice}"
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"

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

echo "Generating local database credentials..."
set_env_var "POSTGRES_USER" "$POSTGRES_USER"
set_env_var "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
set_env_var "POSTGRES_DB" "$POSTGRES_DB"
set_env_var "DATABASE_URL" "$DATABASE_URL"
echo "Credentials written to ${ENV_FILE}"
echo ""

echo "Starting Docker container..."
docker compose up -d
echo ""

echo "Local PostgreSQL is ready."
echo "Run 'npm run populate-db' to seed the database."
