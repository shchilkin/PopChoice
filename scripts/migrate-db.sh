#!/usr/bin/env bash
# Applies all schema SQL files from db/init/ against the local database.
# Safe to re-run — all statements use IF NOT EXISTS.
#
# Usage:
#   npm run migrate:db
#   DATABASE_URL=<url> bash scripts/migrate-db.sh
set -euo pipefail

ENV_FILE=".env"

# Resolve DATABASE_URL: prefer env var, fall back to .env file
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "$ENV_FILE" ] && grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)
  else
    echo "Error: DATABASE_URL is not set. Run 'npm run setup:local-db' first." >&2
    exit 1
  fi
fi

MIGRATIONS_DIR="db/init"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: migrations directory '$MIGRATIONS_DIR' not found." >&2
  exit 1
fi

echo "Applying migrations from $MIGRATIONS_DIR ..."

for sql_file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$sql_file" ] || continue
  echo "  → $(basename "$sql_file")"
  psql "$DATABASE_URL" -f "$sql_file" -v ON_ERROR_STOP=1
done

echo "Migrations complete."
