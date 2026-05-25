#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${POPCHOICE_PRODUCTION_BASE_URL:-}}"
expected_sha="${EXPECTED_SOURCE_COMMIT:-${GITHUB_SHA:-}}"
attempts="${POST_DEPLOY_VERIFY_ATTEMPTS:-30}"
delay_seconds="${POST_DEPLOY_VERIFY_DELAY_SECONDS:-10}"

if [[ -z "$base_url" ]]; then
  echo "POPCHOICE_PRODUCTION_BASE_URL is not set; skipping post-deploy verification."
  exit 0
fi

if ! [[ "$attempts" =~ ^[0-9]+$ ]] || [[ "$attempts" -lt 1 ]]; then
  echo "POST_DEPLOY_VERIFY_ATTEMPTS must be a positive integer."
  exit 1
fi

if ! [[ "$delay_seconds" =~ ^[0-9]+$ ]] || [[ "$delay_seconds" -lt 1 ]]; then
  echo "POST_DEPLOY_VERIFY_DELAY_SECONDS must be a positive integer."
  exit 1
fi

health_url="${base_url%/}/api/health"
build_url="${base_url%/}/api/build"
work_dir="${RUNNER_TEMP:-/tmp}"
health_body="${work_dir}/popchoice-health.json"
build_body="${work_dir}/popchoice-build.json"

for attempt in $(seq 1 "$attempts"); do
  echo "Post-deploy verification attempt ${attempt}/${attempts}..."

  health_status="$(curl -fsS -o "$health_body" -w '%{http_code}' "$health_url" || true)"
  build_status="$(curl -fsS -o "$build_body" -w '%{http_code}' "$build_url" || true)"

  if [[ "$health_status" == "200" && "$build_status" == "200" ]]; then
    if [[ -z "$expected_sha" ]] || grep -q "$expected_sha" "$build_body"; then
      echo "Production health and build metadata verified."
      exit 0
    fi

    echo "Build endpoint is healthy but does not report expected source commit ${expected_sha} yet."
  else
    echo "Health status: ${health_status:-request failed}; build status: ${build_status:-request failed}."
  fi

  if [[ "$attempt" -lt "$attempts" ]]; then
    sleep "$delay_seconds"
  fi
done

echo "Production deploy verification did not recover in time."
echo "Last /api/health response:"
cat "$health_body" 2>/dev/null || true
echo
echo "Last /api/build response:"
cat "$build_body" 2>/dev/null || true
echo
exit 1
