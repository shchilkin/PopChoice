FROM prom/prometheus:v3.7.3

COPY --chmod=755 observability/images/prometheus/entrypoint.sh /usr/local/bin/popchoice-prometheus-entrypoint
COPY observability/prometheus/prometheus.yml /etc/prometheus/prometheus.yml.template
COPY observability/prometheus/rules /etc/prometheus/rules

ENTRYPOINT ["/usr/local/bin/popchoice-prometheus-entrypoint"]
