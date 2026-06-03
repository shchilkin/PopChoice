import { expect } from 'vitest';

type FormRequestOptions = {
  accept?: string;
  fetch?: boolean;
  fields?: Record<string, string>;
  json?: boolean;
  requestedWith?: string;
  url: string;
};

export function createBackofficeFormRequest({
  accept,
  fetch,
  fields,
  json,
  requestedWith,
  url,
}: FormRequestOptions): Request {
  const formData = new FormData();
  Object.entries(fields ?? {}).forEach(([key, value]) => {
    formData.set(key, value);
  });

  const headers = new Headers();
  if (json) headers.set('accept', 'application/json');
  if (accept) headers.set('accept', accept);
  if (fetch) headers.set('x-requested-with', 'fetch');
  if (requestedWith) headers.set('x-requested-with', requestedWith);

  return new Request(url, {
    body: formData,
    headers,
    method: 'POST',
  });
}

export async function expectBackofficeActionJson(
  response: Response,
  {
    body,
    status,
  }: {
    body: unknown;
    status: number;
  },
): Promise<void> {
  expect(response.status).toBe(status);
  expect(response.headers.get('content-type')).toContain('application/json');
  await expect(response.json()).resolves.toEqual(body);
}

export async function expectBackofficeActionFailureJson(
  response: Response,
  {
    message,
    status,
  }: {
    message: string;
    status: number;
  },
): Promise<void> {
  await expectBackofficeActionJson(response, {
    body: { ok: false, status: 'failed', message },
    status,
  });
}
