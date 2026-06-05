import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/locales/en';

import {
  hasAuthFieldErrors,
  registerErrorsForResponse,
  resetPasswordErrorsForResponse,
  submitRegisterForm,
  submitResetPasswordForm,
  validateRegisterForm,
  validateResetPasswordForm,
} from './authFormLogic';
import { getAuthSubmitButtonPresentation } from './authFormUi';

const registerErrors = en.register.errors;
const resetPasswordErrors = en.resetPassword.errors;

describe('auth form validation', () => {
  it('validates registration fields in display order', () => {
    expect(
      validateRegisterForm({ confirmPassword: '', email: '', password: '' }, registerErrors),
    ).toEqual({
      confirmPassword: registerErrors.confirmPasswordRequired,
      email: registerErrors.emailRequired,
      password: registerErrors.passwordRequired,
    });

    expect(
      validateRegisterForm(
        { confirmPassword: 'password123', email: 'bad-email', password: 'short' },
        registerErrors,
      ),
    ).toEqual({
      confirmPassword: registerErrors.passwordMismatch,
      email: registerErrors.emailInvalid,
      password: registerErrors.passwordTooShort,
    });

    expect(
      hasAuthFieldErrors(
        validateRegisterForm(
          { confirmPassword: 'password123', email: 'ada@example.com', password: 'password123' },
          registerErrors,
        ),
      ),
    ).toBe(false);
  });

  it('validates reset password token and password confirmation', () => {
    expect(
      validateResetPasswordForm(
        { confirmPassword: 'password124', password: 'password123' },
        '',
        resetPasswordErrors,
      ),
    ).toEqual({
      confirmPassword: resetPasswordErrors.passwordMismatch,
      general: resetPasswordErrors.invalidToken,
    });

    expect(
      validateResetPasswordForm(
        { confirmPassword: 'password123', password: 'password123' },
        'reset-token',
        resetPasswordErrors,
      ),
    ).toEqual({});
  });
});

describe('auth form response mapping', () => {
  it('maps register API responses to field errors', () => {
    expect(registerErrorsForResponse(409, {}, registerErrors)).toEqual({
      email: registerErrors.emailTaken,
    });
    expect(registerErrorsForResponse(500, {}, registerErrors)).toEqual({
      general: registerErrors.generic,
    });
  });

  it('maps reset password API responses to form errors', () => {
    expect(resetPasswordErrorsForResponse(400, {}, resetPasswordErrors)).toEqual({
      general: resetPasswordErrors.invalidToken,
    });
    expect(resetPasswordErrorsForResponse(500, {}, resetPasswordErrors)).toEqual({
      general: resetPasswordErrors.generic,
    });
  });
});

describe('auth form submissions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes the session after successful registration', async () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })));

    await expect(
      submitRegisterForm(
        { confirmPassword: 'password123', email: ' ada@example.com ', password: 'password123' },
        registerErrors,
        refreshSession,
      ),
    ).resolves.toEqual({ success: true });
    expect(refreshSession).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        body: JSON.stringify({ email: 'ada@example.com', password: 'password123' }),
      }),
    );
  });

  it('sends CSRF-protected reset password requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));

    await expect(
      submitResetPasswordForm(
        { confirmPassword: 'password123', password: 'password123' },
        'reset-token',
        resetPasswordErrors,
      ),
    ).resolves.toEqual({ success: true });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-CSRF-Token': '' }),
      }),
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      password: 'password123',
      token: 'reset-token',
    });
  });
});

describe('auth form presentation helpers', () => {
  it('keeps submit button states deterministic', () => {
    expect(
      getAuthSubmitButtonPresentation({
        label: 'Create account',
        submitting: false,
        submittingLabel: 'Creating account...',
      }),
    ).toMatchObject({
      disabled: false,
      text: 'Create account',
    });
    expect(
      getAuthSubmitButtonPresentation({
        label: 'Create account',
        submitting: true,
        submittingLabel: 'Creating account...',
      }),
    ).toMatchObject({
      disabled: true,
      text: 'Creating account...',
    });
    expect(
      getAuthSubmitButtonPresentation({
        disabled: true,
        label: 'Update password',
        submitting: false,
        submittingLabel: 'Updating...',
      }),
    ).toMatchObject({
      disabled: true,
      text: 'Update password',
    });
  });
});
