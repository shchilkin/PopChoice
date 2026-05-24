#!/bin/sh
set -eu

telegram_file=/etc/grafana/provisioning/alerting/popchoice-telegram.yaml

if [ -n "${GRAFANA_TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${GRAFANA_TELEGRAM_CHAT_ID:-}" ]; then
  cat > "$telegram_file" <<'YAML'
apiVersion: 1

templates:
  - orgId: 1
    name: popchoice.telegram.message
    template: |
      {{ define "popchoice.telegram.message" }}
      {{ if eq .Status "firing" }}FIRING{{ else }}RESOLVED{{ end }}: {{ with index .CommonLabels "alertname" }}{{ . }}{{ else }}Grafana alert{{ end }}
      {{ with index .CommonLabels "severity" }}
      Severity: {{ . }}
      {{ end }}
      {{ with index .CommonAnnotations "summary" }}
      Summary: {{ . }}
      {{ end }}

      {{ if .Alerts.Firing }}
      Firing ({{ len .Alerts.Firing }}):
      {{ range .Alerts.Firing }}
      - {{ with index .Labels "instance" }}{{ . }}{{ else }}{{ with index .Labels "job" }}{{ . }}{{ else }}alert instance{{ end }}{{ end }}
        {{ with index .Annotations "description" }}
        Description: {{ . }}
        {{ end }}
        {{ with .ValueString }}
        Value: {{ . }}
        {{ end }}
        {{ with .SilenceURL }}
        Silence: {{ . }}
        {{ end }}
        {{ with index .Annotations "runbook_url" }}
        Runbook: {{ . }}
        {{ end }}
      {{ end }}
      {{ end }}

      {{ if .Alerts.Resolved }}
      Resolved ({{ len .Alerts.Resolved }}):
      {{ range .Alerts.Resolved }}
      - {{ with index .Labels "instance" }}{{ . }}{{ else }}{{ with index .Labels "job" }}{{ . }}{{ else }}alert instance{{ end }}{{ end }}
        {{ with .ValueString }}
        Last value: {{ . }}
        {{ end }}
        {{ with .DashboardURL }}
        Dashboard: {{ . }}
        {{ end }}
      {{ end }}
      {{ end }}

      {{ with .ExternalURL }}
      Grafana: {{ . }}
      {{ end }}
      {{- end }}
YAML

  cat >> "$telegram_file" <<YAML
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
            {{ template "popchoice.telegram.message" . }}

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
