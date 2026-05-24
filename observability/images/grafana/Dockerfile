FROM grafana/grafana:12.3.0

USER root

COPY --chmod=755 observability/images/grafana/entrypoint.sh /usr/local/bin/popchoice-grafana-entrypoint
COPY --chown=grafana:root observability/grafana/dashboards /etc/grafana/dashboards
COPY --chown=grafana:root observability/grafana/provisioning /etc/grafana/provisioning

RUN chmod -R g=u /etc/grafana/provisioning

USER grafana

ENTRYPOINT ["/usr/local/bin/popchoice-grafana-entrypoint"]
