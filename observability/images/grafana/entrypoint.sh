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
      {{ define "popchoice.alert.target" -}}
      {{- with index .Labels "service" }}{{ . }}{{ else }}{{ with index .Labels "job" }}{{ . }}{{ else }}target{{ end }}{{ end -}}
      {{- with index .Labels "instance" }} ({{ . }}){{ end -}}
      {{- end }}
      {{ define "popchoice.telegram.message" }}
      {{ if eq .Status "firing" }}FIRING{{ else }}RESOLVED{{ end }} {{ with index .CommonLabels "severity" }}{{ . }}{{ end }}: {{ with index .CommonLabels "alertname" }}{{ . }}{{ else }}Grafana alert{{ end }}
      {{ with index .CommonAnnotations "summary" }}
      {{ . }}
      {{ end }}
      {{ with index .CommonAnnotations "action" }}
      Action: {{ . }}
      {{ end }}

      {{ if .Alerts.Firing }}
      Firing: {{ len .Alerts.Firing }}
      {{ range .Alerts.Firing }}
      - {{ template "popchoice.alert.target" . }}
        {{ with index .Annotations "description" }}
        {{ . }}
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
      Resolved: {{ len .Alerts.Resolved }}
      {{ range .Alerts.Resolved }}
      - {{ template "popchoice.alert.target" . }}
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
