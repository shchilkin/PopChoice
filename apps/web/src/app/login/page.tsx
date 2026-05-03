'use client';

import { CheckCircle, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

interface FormState {
  email: string;
  password: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const { isAuthenticated, refreshSession } = useAuth();
  const { t } = useLanguage();
  const l = t.login;

  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.email.trim()) {
      errs.email = l.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = l.errors.emailInvalid;
    }
    if (!form.password) {
      errs.password = l.errors.passwordRequired;
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      if (res.status === 200) {
        await refreshSession();
        setSuccess(true);
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (res.status === 401 || data.error === 'invalid_credentials') {
        setErrors({ general: l.errors.invalidCredentials });
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

  if (success || isAuthenticated) {
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
            href="/"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-colors duration-200"
            style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
          >
            {l.backToHome}
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
            <LogIn size={22} />
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
              {l.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={l.emailPlaceholder}
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
              {l.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
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
            {submitting ? l.submitting : l.submitButton}
          </button>
        </form>

        {/* Link to register */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--pc-t3)' }}>
          {l.noAccount}{' '}
          <Link
            href="/register"
            className="font-medium transition-colors duration-200"
            style={{ color: 'var(--pc-gold-text)' }}
          >
            {l.signUp}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
