#!/bin/sh
set -eu

token_file=/tmp/popchoice-metrics-bearer-token
config_file=/tmp/prometheus.yml

printf '%s' "${METRICS_BEARER_TOKEN:-}" > "$token_file"

sed \
  -e "s|\${POPCHOICE_WEB_METRICS_TARGET}|${POPCHOICE_WEB_METRICS_TARGET:-web:3000}|g" \
  -e "s|\${POPCHOICE_WORKERS_METRICS_TARGET}|${POPCHOICE_WORKERS_METRICS_TARGET:-workers:9464}|g" \
  /etc/prometheus/prometheus.yml.template > "$config_file"

exec /bin/prometheus "$@"
