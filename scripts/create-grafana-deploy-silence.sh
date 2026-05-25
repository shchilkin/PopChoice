#!/usr/bin/env bash
set -euo pipefail

grafana_url="${GRAFANA_URL:-}"
grafana_token="${GRAFANA_SERVICE_ACCOUNT_TOKEN:-${GRAFANA_TOKEN:-}}"
duration_minutes="${DEPLOY_SILENCE_MINUTES:-15}"
created_by="${DEPLOY_SILENCE_CREATED_BY:-github-actions}"
comment="${DEPLOY_SILENCE_COMMENT:-PopChoice production deploy window}"

if [[ -z "$grafana_url" || -z "$grafana_token" ]]; then
  echo "GRAFANA_URL and GRAFANA_SERVICE_ACCOUNT_TOKEN are not set; skipping deploy silence."
  exit 0
fi

if ! [[ "$duration_minutes" =~ ^[0-9]+$ ]] || [[ "$duration_minutes" -lt 1 ]]; then
  echo "DEPLOY_SILENCE_MINUTES must be a positive integer."
  exit 1
fi

timestamps="$(DURATION_MINUTES="$duration_minutes" node -e '
const durationMinutes = Number(process.env.DURATION_MINUTES);
const startsAt = new Date();
const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
process.stdout.write(`${startsAt.toISOString()} ${endsAt.toISOString()}`);
')"
starts_at="${timestamps%% *}"
ends_at="${timestamps##* }"

payload="$(STARTS_AT="$starts_at" ENDS_AT="$ends_at" CREATED_BY="$created_by" COMMENT="$comment" node -e '
const payload = {
  matchers: [
    { name: "noise_profile", value: "deploy-sensitive", isRegex: false },
    { name: "severity", value: "p2", isRegex: false }
  ],
  startsAt: process.env.STARTS_AT,
  endsAt: process.env.ENDS_AT,
  createdBy: process.env.CREATED_BY,
  comment: process.env.COMMENT
};
process.stdout.write(JSON.stringify(payload));
')"

curl -fsS \
  --request POST \
  --header "Authorization: Bearer ${grafana_token}" \
  --header "Content-Type: application/json" \
  --data "$payload" \
  "${grafana_url%/}/api/alertmanager/grafana/api/v2/silences"

echo
echo "Created Grafana deploy silence for deploy-sensitive alerts until ${ends_at}."
