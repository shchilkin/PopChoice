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
      <code>{{- with index .Labels "service" }}{{ . | html }}{{ else }}{{ with index .Labels "job" }}{{ . | html }}{{ else }}target{{ end }}{{ end -}}
      {{- with index .Labels "instance" }} ({{ . | html }}){{ end -}}</code>
      {{- end }}
      {{ define "popchoice.alert.links" -}}
      {{- with .SilenceURL }}  🔕 <a href="{{ . | html }}">Silence</a>{{ "\n" }}{{- end }}
      {{- with .DashboardURL }}  📊 <a href="{{ . | html }}">Dashboard</a>{{ "\n" }}{{- end }}
      {{- with index .Annotations "runbook_url" }}  📘 Runbook: <code>{{ . | html }}</code>{{ "\n" }}{{- end }}
      {{- end }}
      {{ define "popchoice.telegram.message" -}}
      {{ if eq .Status "firing" }}🔥 <b>FIRING</b>{{ else }}✅ <b>RESOLVED</b>{{ end }}{{ with index .CommonLabels "severity" }} <code>{{ . | html }}</code>{{ end }}
      <b>{{ with index .CommonLabels "alertname" }}{{ . | html }}{{ else }}Grafana alert{{ end }}</b>
      {{- with index .CommonAnnotations "summary" }}
      {{ . | html }}
      {{- end }}
      {{- with index .CommonAnnotations "action" }}

      🛠 <b>Action:</b> {{ . | html }}
      {{- end }}
      {{- with index .CommonLabels "owner" }}
      👤 <b>Owner:</b> <code>{{ . | html }}</code>
      {{- end }}
      {{- if .Alerts.Firing }}

      🚨 <b>Firing:</b> {{ len .Alerts.Firing }}
      {{- range .Alerts.Firing }}
      • {{ template "popchoice.alert.target" . }}
      {{- with index .Annotations "description" }}
        ↳ {{ . | html }}
      {{- end }}
      {{ template "popchoice.alert.links" . }}
      {{- end }}
      {{- end }}
      {{- if .Alerts.Resolved }}

      ✅ <b>Resolved:</b> {{ len .Alerts.Resolved }}
      {{- range .Alerts.Resolved }}
      • {{ template "popchoice.alert.target" . }}
      {{ template "popchoice.alert.links" . }}
      {{- end }}
      {{- end }}
      {{- with .ExternalURL -}}

      🔎 <a href="{{ . | html }}">Open Grafana</a>
      {{- end }}
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
          parse_mode: HTML
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
