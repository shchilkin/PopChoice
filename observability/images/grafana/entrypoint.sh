#!/bin/sh
set -eu

telegram_file=/etc/grafana/provisioning/alerting/popchoice-telegram.yaml

if [ -n "${GRAFANA_TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${GRAFANA_TELEGRAM_CHAT_ID:-}" ]; then
  cat > "$telegram_file" <<YAML
apiVersion: 1

contactPoints:
  - orgId: 1
    name: popchoice-telegram
    receivers:
      - uid: popchoice-telegram
        type: telegram
        disableResolveMessage: false
        settings:
          chatid: "${GRAFANA_TELEGRAM_CHAT_ID}"
          bottoken: "${GRAFANA_TELEGRAM_BOT_TOKEN}"
          uploadImage: false
          message: |
            {{ template "default.message" . }}

policies:
  - orgId: 1
    receiver: popchoice-telegram
    group_by:
      - grafana_folder
      - alertname
      - severity
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
YAML
else
  rm -f "$telegram_file"
fi

exec /run.sh "$@"
