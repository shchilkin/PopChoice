import { describe, expect, it } from 'vitest';

import { getClientIp } from './requestIp';

describe('getClientIp', () => {
  const makeRequest = (headers: Record<string, string> = {}, ip?: string) => {
    const req = new Request('http://localhost', {
      headers: new Headers(headers),
    }) as Request & { ip?: string };
    if (ip) {
      req.ip = ip;
    }
    return req;
  };

  it('returns req.ip if present and valid', () => {
    const req = makeRequest({}, '1.1.1.1');
    expect(getClientIp(req)).toBe('1.1.1.1');
  });

  it('prefers req.ip over headers', () => {
    const req = makeRequest(
      {
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3',
      },
      '1.1.1.1',
    );
    expect(getClientIp(req)).toBe('1.1.1.1');
  });

  it('falls back to x-real-ip if req.ip is missing', () => {
    const req = makeRequest({
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3',
    });
    expect(getClientIp(req)).toBe('2.2.2.2');
  });

  it('falls back to x-forwarded-for if both req.ip and x-real-ip are missing', () => {
    const req = makeRequest({
      'x-forwarded-for': '3.3.3.3',
    });
    expect(getClientIp(req)).toBe('3.3.3.3');
  });

  it('takes the LAST valid IP from x-forwarded-for (prevents spoofing)', () => {
    const req = makeRequest({
      'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3',
    });
    expect(getClientIp(req)).toBe('3.3.3.3');
  });

  it('skips invalid IPs in x-forwarded-for when looking for the last one', () => {
    const req = makeRequest({
      'x-forwarded-for': '1.1.1.1, 2.2.2.2, not-an-ip',
    });
    expect(getClientIp(req)).toBe('2.2.2.2');
  });

  it('returns null if no valid IP is found', () => {
    const req = makeRequest({
      'x-forwarded-for': 'not-an-ip, also-not-an-ip',
    });
    expect(getClientIp(req)).toBeNull();
  });

  it('handles IPv6 addresses', () => {
    const req = makeRequest({
      'x-forwarded-for': '2001:db8:85a3:8d3:1319:8a2e:370:7348',
    });
    expect(getClientIp(req)).toBe('2001:db8:85a3:8d3:1319:8a2e:370:7348');
  });

  it('ignores invalid req.ip and falls back to headers', () => {
    const req = makeRequest({ 'x-real-ip': '2.2.2.2' }, 'not-an-ip');
    expect(getClientIp(req)).toBe('2.2.2.2');
  });
});
