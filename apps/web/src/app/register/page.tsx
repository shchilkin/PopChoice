'use client';

import { CheckCircle, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const r = t.register;

  const [form, setForm] = useState<FormState>({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.email.trim()) {
      errs.email = r.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = r.errors.emailInvalid;
    }
    if (!form.password) {
      errs.password = r.errors.passwordRequired;
    } else if (form.password.length < 8) {
      errs.password = r.errors.passwordTooShort;
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = r.errors.confirmPasswordRequired;
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = r.errors.passwordMismatch;
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      if (res.status === 201) {
        setSuccess(true);
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (res.status === 409 || data.error === 'email_taken') {
        setErrors({ email: r.errors.emailTaken });
      } else if (res.status === 422) {
        setErrors({ general: r.errors.generic });
      } else {
        setErrors({ general: r.errors.generic });
      }
    } catch {
      setErrors({ general: r.errors.generic });
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
            {r.successTitle}
          </h1>
          <p style={{ color: 'var(--pc-t2)', marginBottom: '2rem' }}>{r.successMessage}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-colors duration-200"
            style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
          >
            {r.backToHome}
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
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${palette.gold}20`, color: 'var(--pc-gold-text)' }}
          >
            <UserPlus size={22} />
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
            {r.title}
          </h1>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>{r.subtitle}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* General error */}
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

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium"
              style={{ color: 'var(--pc-t2)' }}
            >
              {r.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={r.emailPlaceholder}
              className="w-full px-4 py-3 rounded-xl text-sm transition-colors duration-200 outline-none"
              style={{
                background: 'var(--pc-input-bg, rgba(255,255,255,0.05))',
                border: `1px solid ${errors.email ? palette.red : 'var(--pc-bd2)'}`,
                color: 'var(--pc-t1)',
              }}
            />
            {errors.email && (
              <p className="text-xs" style={{ color: palette.red }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: 'var(--pc-t2)' }}
            >
              {r.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={r.passwordPlaceholder}
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

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium"
              style={{ color: 'var(--pc-t2)' }}
            >
              {r.confirmPasswordLabel}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder={r.confirmPasswordPlaceholder}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 mt-1"
            style={{
              background: submitting ? 'var(--pc-ghost)' : 'var(--pc-cta)',
              color: submitting ? 'var(--pc-t3)' : 'var(--pc-cta-text)',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? r.submitting : r.submitButton}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
