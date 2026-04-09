import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConnect = vi.fn();
const mockIncr = vi.fn();
const mockExpire = vi.fn();
const mockQuit = vi.fn();

const mockClient = {
  connect: mockConnect,
  incr: mockIncr,
  expire: mockExpire,
  quit: mockQuit,
};

// Mock redis before any imports that depend on it
vi.mock('redis', () => ({
  createClient: vi.fn(() => mockClient),
}));

// Import AFTER the mock is registered
const { applyRateLimit, closeRateLimiter } = await import('./rateLimit');

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/movie-recommendation', {
    method: 'POST',
    headers,
  });
}

describe('applyRateLimit', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module state between tests
    await closeRateLimiter();
  });

  describe('when REDIS_URL is not set', () => {
    it('returns null (fail-open)', async () => {
      delete process.env.REDIS_URL;
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });
  });

  describe('when Redis connection fails', () => {
    it('returns null (fail-open)', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      mockConnect.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });
  });

  describe('when Redis is available', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      mockConnect.mockResolvedValue(undefined);
      mockExpire.mockResolvedValue(1);
    });

    it('returns null when IP cannot be determined (no headers)', async () => {
      const result = await applyRateLimit(makeRequest());
      expect(result).toBeNull();
      expect(mockIncr).not.toHaveBeenCalled();
    });

    it('extracts client IP from x-forwarded-for (first entry only)', async () => {
      mockIncr.mockResolvedValue(1);
      await applyRateLimit(makeRequest({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' }));
      expect(mockIncr).toHaveBeenCalledWith('rl:movie-recommendation:10.0.0.1');
    });

    it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
      mockIncr.mockResolvedValue(1);
      await applyRateLimit(makeRequest({ 'x-real-ip': '192.168.1.5' }));
      expect(mockIncr).toHaveBeenCalledWith('rl:movie-recommendation:192.168.1.5');
    });

    it('returns null for requests within the limit', async () => {
      mockIncr.mockResolvedValue(5);
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });

    it('sets 60s expiry only on the first request (fixed window)', async () => {
      mockIncr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

      await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(mockExpire).toHaveBeenCalledWith('rl:movie-recommendation:1.2.3.4', 60);

      mockExpire.mockClear();
      await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(mockExpire).not.toHaveBeenCalled();
    });

    it('returns 429 when the request count exceeds 10', async () => {
      mockIncr.mockResolvedValue(11);
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(429);
    });

    it('includes Retry-After: 60 header in the 429 response', async () => {
      mockIncr.mockResolvedValue(11);
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result!.headers.get('Retry-After')).toBe('60');
    });

    it('returns null (fail-open) when Redis incr throws', async () => {
      mockIncr.mockRejectedValue(new Error('Redis error'));
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });
  });
});
