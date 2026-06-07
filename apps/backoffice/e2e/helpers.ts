export function backofficeBaseUrl(): string {
  return process.env.E2E_BACKOFFICE_BASE_URL ?? 'http://127.0.0.1:3104';
}

export function operatorHeaders(): Record<string, string> {
  const username = process.env.E2E_BACKOFFICE_OPERATOR_USERNAME ?? 'e2e-operator';
  const password = process.env.E2E_BACKOFFICE_OPERATOR_PASSWORD ?? 'e2e-password';
  const token = Buffer.from(`${username}:${password}`).toString('base64');

  return {
    authorization: `Basic ${token}`,
  };
}
