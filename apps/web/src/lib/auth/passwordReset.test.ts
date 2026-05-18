import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import logger from '@/lib/logger';

import { hashPasswordResetToken, sendPasswordResetEmail } from './passwordReset';

describe('hashPasswordResetToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates a stable keyed digest without storing the raw token', () => {
    vi.stubEnv('API_KEY_HMAC_SECRET', 'test-hmac-secret');

    const digest = hashPasswordResetToken('reset-token');

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).toBe(hashPasswordResetToken('reset-token'));
    expect(digest).not.toContain('reset-token');
  });

  it('fails closed in production when no hashing secret is configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('API_KEY_HMAC_SECRET', '');
    vi.stubEnv('AUTH_SESSION_SECRET', '');

    expect(() => hashPasswordResetToken('reset-token')).toThrow(
      'Password reset token hashing secret is not configured.',
    );
  });
});

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('exposes the reset link in non-production environments without sending email', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    await sendPasswordResetEmail('alice@example.com', 'http://localhost/reset-password?token=abc');

    expect(fetch).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      {
        email: 'alice@example.com',
        resetUrl: 'http://localhost/reset-password?token=%5Bredacted%5D',
      },
      'Password reset link generated',
    );
  });

  it('logs a configuration warning in production when Resend is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await sendPasswordResetEmail('alice@example.com', 'https://pop-choice.test/reset-password');

    expect(fetch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      { email: 'alice@example.com', missingApiKey: true, missingFrom: true },
      'Password reset requested, but Resend email delivery is not configured.',
    );
  });

  it('sends password reset email through Resend in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
    vi.stubEnv('EMAIL_FROM', 'PopChoice <noreply@mail.pop-choice.test>');
    vi.stubEnv('EMAIL_REPLY_TO', 'support@pop-choice.test');

    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await sendPasswordResetEmail(
      'alice@example.com',
      'https://pop-choice.test/reset-password?token=abc',
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({
      Authorization: 'Bearer test-resend-key',
      'Content-Type': 'application/json',
    });

    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({
      from: 'PopChoice <noreply@mail.pop-choice.test>',
      to: 'alice@example.com',
      subject: 'Reset your PopChoice password',
      reply_to: 'support@pop-choice.test',
    });
    expect(body.text).toContain('https://pop-choice.test/reset-password?token=abc');
    expect(body.html).toContain('https://pop-choice.test/reset-password?token=abc');
    expect(logger.info).toHaveBeenCalledWith(
      { email: 'alice@example.com' },
      'Password reset email sent.',
    );
  });

  it('logs Resend failures without throwing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
    vi.stubEnv('EMAIL_FROM', 'PopChoice <noreply@mail.pop-choice.test>');

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'invalid sender' }), { status: 422 }),
    );

    await expect(
      sendPasswordResetEmail('alice@example.com', 'https://pop-choice.test/reset-password'),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      {
        email: 'alice@example.com',
        status: 422,
        response: '{"message":"invalid sender"}',
      },
      'Failed to send password reset email through Resend.',
    );
  });
});
