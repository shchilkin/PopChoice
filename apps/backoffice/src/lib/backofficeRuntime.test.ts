import { describe, expect, it } from 'vitest';

import {
  backofficeActionError,
  formatBackofficeDateTime,
  getBackofficeErrorStatus,
  parseBackofficeReturnPath,
  parseOperatorActor,
} from './backofficeRuntime';

describe('backoffice runtime helpers', () => {
  it('formats valid dates and leaves invalid date text untouched', () => {
    expect(formatBackofficeDateTime('2026-06-02T12:34:56Z')).toContain('Jun');
    expect(formatBackofficeDateTime('not-a-date')).toBe('not-a-date');
    expect(formatBackofficeDateTime(null)).toBe('-');
  });

  it('extracts the basic-auth username as the operator actor', () => {
    const credentials = Buffer.from('lexi:secret').toString('base64');
    const headers = new Headers({ authorization: `Basic ${credentials}` });

    expect(parseOperatorActor(headers)).toBe('lexi');
  });

  it('uses anonymous operator for missing, malformed, or empty usernames', () => {
    expect(parseOperatorActor(new Headers())).toBe('anonymous-operator');
    expect(parseOperatorActor(new Headers({ authorization: 'Bearer nope' }))).toBe(
      'anonymous-operator',
    );

    const emptyUsername = Buffer.from(':secret').toString('base64');
    expect(parseOperatorActor(new Headers({ authorization: `Basic ${emptyUsername}` }))).toBe(
      'anonymous-operator',
    );
  });

  it('keeps safe relative return paths with query and hash', () => {
    expect(parseBackofficeReturnPath('/movies/42?tab=repair#audit')).toBe(
      '/movies/42?tab=repair#audit',
    );
  });

  it('falls back for external, protocol-relative, or missing return paths', () => {
    expect(parseBackofficeReturnPath('https://evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath('//evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath('\\//evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath('\\/evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath(null)).toBe('/');
  });

  it('uses explicit 4xx and 5xx action statuses while defaulting other errors to 500', () => {
    expect(getBackofficeErrorStatus({ statusCode: 404 })).toBe(404);
    expect(getBackofficeErrorStatus({ statusCode: 503 })).toBe(503);
    expect(getBackofficeErrorStatus({ statusCode: 302 })).toBe(500);
    expect(getBackofficeErrorStatus(new Error('no status'))).toBe(500);
  });

  it('marks action validation errors as safe to show to operators', () => {
    const error = backofficeActionError('Unsupported review action.', 400);

    expect(error.statusCode).toBe(400);
    expect(error.publicMessage).toBe('Unsupported review action.');
  });
});
