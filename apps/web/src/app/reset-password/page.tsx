'use client';

import { CheckCircle, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { palette } from '@/styles/designTokens';

interface FormState {
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const { t } = useLanguage();
  const l = t.resetPassword;
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState<FormState>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors>(
    token ? {} : { general: l.errors.invalidToken },
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!token) {
      errs.general = l.errors.invalidToken;
    }
    if (!form.password) {
      errs.password = l.errors.passwordRequired;
    } else if (form.password.length < 8) {
      errs.password = l.errors.passwordTooShort;
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = l.errors.confirmPasswordRequired;
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = l.errors.passwordMismatch;
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ token, password: form.password }),
      });

      if (res.status === 200) {
        setSuccess(true);
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (res.status === 400 || data.error === 'invalid_or_expired_token') {
        setErrors({ general: l.errors.invalidToken });
      } else if (res.status === 422) {
        setErrors({ general: l.errors.generic });
      } else {
        setErrors({ general: l.errors.generic });
      }
    } catch {
      setErrors({ general: l.errors.generic });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-5 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${palette.green}20`, color: palette.green }}
          >
            <CheckCircle size={32} />
          </div>
          <h1
            className="mb-3"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '2rem',
              letterSpacing: '0.05em',
              color: 'var(--pc-t1)',
            }}
          >
            {l.successTitle}
          </h1>
          <p style={{ color: 'var(--pc-t2)', marginBottom: '2rem' }}>{l.successMessage}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-colors duration-200"
            style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
          >
            {l.backToLogin}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${palette.gold}20`, color: 'var(--pc-gold-text)' }}
          >
            <KeyRound size={22} />
          </div>
          <h1
            className="mb-2"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '2rem',
              letterSpacing: '0.05em',
              color: 'var(--pc-t1)',
            }}
          >
            {l.title}
          </h1>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>{l.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {errors.general && (
            <p
              className="text-sm px-4 py-3 rounded-xl"
              style={{
                background: `${palette.red}18`,
                border: `1px solid ${palette.red}40`,
                color: palette.red,
              }}
            >
              {errors.general}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: 'var(--pc-t2)' }}
            >
              {l.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={l.passwordPlaceholder}
              className="w-full px-4 py-3 rounded-xl text-sm transition-colors duration-200 outline-none"
              style={{
                background: 'var(--pc-input-bg, rgba(255,255,255,0.05))',
                border: `1px solid ${errors.password ? palette.red : 'var(--pc-bd2)'}`,
                color: 'var(--pc-t1)',
              }}
            />
            {errors.password && (
              <p className="text-xs" style={{ color: palette.red }}>
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium"
              style={{ color: 'var(--pc-t2)' }}
            >
              {l.confirmPasswordLabel}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder={l.confirmPasswordPlaceholder}
              className="w-full px-4 py-3 rounded-xl text-sm transition-colors duration-200 outline-none"
              style={{
                background: 'var(--pc-input-bg, rgba(255,255,255,0.05))',
                border: `1px solid ${errors.confirmPassword ? palette.red : 'var(--pc-bd2)'}`,
                color: 'var(--pc-t1)',
              }}
            />
            {errors.confirmPassword && (
              <p className="text-xs" style={{ color: palette.red }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !token}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 mt-1"
            style={{
              background: submitting || !token ? 'var(--pc-ghost)' : 'var(--pc-cta)',
              color: submitting || !token ? 'var(--pc-t3)' : 'var(--pc-cta-text)',
              cursor: submitting || !token ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? l.submitting : l.submitButton}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
