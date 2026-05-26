#!/bin/bash

set -e

ROOT_ENV=".env"

if [ ! -f "$ROOT_ENV" ]; then
  echo "Error: $ROOT_ENV not found in project root"
  exit 1
fi

TARGETS=(
  apps/backoffice
  apps/web
  services/movie-backfill
  services/movie-discovery
  services/movie-seed
  packages/shared
)

for dir in "${TARGETS[@]}"; do
  if [ -d "$dir" ]; then
    cp "$ROOT_ENV" "$dir/.env"
    echo "Copied → $dir/.env"
  else
    echo "Skipped (dir not found): $dir"
  fi
done
