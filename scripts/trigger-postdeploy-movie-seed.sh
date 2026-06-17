#!/usr/bin/env bash
set -euo pipefail

enabled="${POSTDEPLOY_SEED_ENABLED:-false}"
case "${enabled}" in
  1 | true | TRUE | yes | YES)
    ;;
  *)
    echo "POSTDEPLOY_SEED_ENABLED is not enabled; skipping movie seed."
    exit 0
    ;;
esac

if [[ -z "${BACKOFFICE_BASE_URL:-}" ]]; then
  echo "POSTDEPLOY_SEED_ENABLED is enabled, but BACKOFFICE_BASE_URL is missing."
  exit 1
fi

if [[ -z "${BACKOFFICE_AUTOMATION_TOKEN:-}" ]]; then
  echo "POSTDEPLOY_SEED_ENABLED is enabled, but BACKOFFICE_AUTOMATION_TOKEN is missing."
  exit 1
fi

endpoint="${BACKOFFICE_BASE_URL%/}/api/operator/catalog-seed"
echo "Queueing post-deploy movie seed through ${endpoint}"

curl -fsS --request POST "${endpoint}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${BACKOFFICE_AUTOMATION_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{}'

echo
