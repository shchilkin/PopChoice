#!/usr/bin/env bash
set -euo pipefail

echo "Stopping and removing Docker containers..."
docker compose down -v

echo ""
echo "Containers stopped and volumes removed."
echo "Run 'npm run setup:local-db' to start fresh."
