'use strict';

function replaceUrlHostname(envName, serviceNameEnvName) {
  const serviceName = process.env[serviceNameEnvName];
  const value = process.env[envName];

  if (!serviceName || !value) return;

  try {
    const url = new URL(value);
    url.hostname = serviceName;
    process.env[envName] = url.toString();
  } catch {
    // Leave invalid URLs untouched so the app reports the original config error.
  }
}

replaceUrlHostname('DATABASE_URL', 'SERVICE_NAME_DB');
replaceUrlHostname('REDIS_URL', 'SERVICE_NAME_REDIS');
