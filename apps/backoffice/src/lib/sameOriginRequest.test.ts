import { describe, expect, it } from 'vitest';

import { isSameOriginRequest } from './sameOriginRequest';

type SameOriginRequest = Parameters<typeof isSameOriginRequest>[0];

function request(url: string, headers: HeadersInit): SameOriginRequest {
  return { headers: new Headers(headers), url } as SameOriginRequest;
}

describe('isSameOriginRequest', () => {
  it('accepts matching origin headers', () => {
    expect(
      isSameOriginRequest(
        request('https://backoffice.pop-choice.shchilkin.dev/catalog-health/actions', {
          origin: 'https://backoffice.pop-choice.shchilkin.dev',
        }),
      ),
    ).toBe(true);
  });

  it('accepts forwarded Coolify origins', () => {
    expect(
      isSameOriginRequest(
        request('http://127.0.0.1:3004/catalog-health/actions', {
          origin: 'https://backoffice.pop-choice.shchilkin.dev',
          'x-forwarded-host': 'backoffice.pop-choice.shchilkin.dev',
          'x-forwarded-proto': 'https',
        }),
      ),
    ).toBe(true);
  });

  it('rejects requests without origin or referer evidence', () => {
    expect(
      isSameOriginRequest(
        request('https://backoffice.pop-choice.shchilkin.dev/catalog-health/actions', {}),
      ),
    ).toBe(false);
  });
});
