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

  it('uses the last forwarded host and first forwarded protocol', () => {
    expect(
      isSameOriginRequest(
        request('http://127.0.0.1:3004/catalog-health/actions', {
          origin: 'https://backoffice.pop-choice.shchilkin.dev',
          'x-forwarded-host': 'internal.invalid, backoffice.pop-choice.shchilkin.dev',
          'x-forwarded-proto': 'https, http',
        }),
      ),
    ).toBe(true);
  });

  it('accepts matching referer headers when origin is absent', () => {
    expect(
      isSameOriginRequest(
        request('https://backoffice.pop-choice.shchilkin.dev/catalog-health/actions', {
          referer: 'https://backoffice.pop-choice.shchilkin.dev/catalog-health',
        }),
      ),
    ).toBe(true);
  });

  it('rejects a mismatched origin even when referer matches', () => {
    expect(
      isSameOriginRequest(
        request('https://backoffice.pop-choice.shchilkin.dev/catalog-health/actions', {
          origin: 'https://evil.example',
          referer: 'https://backoffice.pop-choice.shchilkin.dev/catalog-health',
        }),
      ),
    ).toBe(false);
  });

  it('rejects requests without origin or referer evidence', () => {
    expect(
      isSameOriginRequest(
        request('https://backoffice.pop-choice.shchilkin.dev/catalog-health/actions', {}),
      ),
    ).toBe(false);
  });

  it('rejects malformed origin evidence', () => {
    expect(
      isSameOriginRequest(
        request('https://backoffice.pop-choice.shchilkin.dev/catalog-health/actions', {
          origin: 'not a url',
        }),
      ),
    ).toBe(false);
  });
});
