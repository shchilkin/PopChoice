import { describe, expect, it } from 'vitest';

import { getUmamiConfig } from './getUmamiConfig';

describe('getUmamiConfig', () => {
  it('returns null when required env vars are missing', () => {
    expect(getUmamiConfig({})).toBeNull();
    expect(
      getUmamiConfig({
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'https://analytics.example.com/script.js',
      }),
    ).toBeNull();
    expect(
      getUmamiConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'website-id',
      }),
    ).toBeNull();
  });

  it('returns null when the script URL is invalid', () => {
    expect(
      getUmamiConfig({
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'not-a-url',
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'website-id',
      }),
    ).toBeNull();
  });

  it('returns normalized Umami config when env vars are valid', () => {
    expect(
      getUmamiConfig({
        NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'https://analytics.example.com/script.js',
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'website-id',
      }),
    ).toEqual({
      scriptOrigin: 'https://analytics.example.com',
      scriptUrl: 'https://analytics.example.com/script.js',
      websiteId: 'website-id',
    });
  });
});
