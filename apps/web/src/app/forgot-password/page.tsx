'use client';

import { CheckCircle, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { palette } from '@/styles/designTokens';

interface FieldErrors {
  email?: string;
  general?: string;
}

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const l = t.forgotPassword;
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  function resetRequestForm() {
    setEmail('');
    setErrors({});
    setSubmitting(false);
    setSubmitted(false);
    setDevResetUrl(null);
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!email.trim()) {
      errs.email = l.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = l.errors.emailInvalid;
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
    setDevResetUrl(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.status === 202) {
        const data = (await res.json()) as { resetUrl?: string };
        setDevResetUrl(data.resetUrl ?? null);
        setSubmitted(true);
        return;
      }

      if (res.status === 422) {
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
            {submitted ? <CheckCircle size={22} /> : <Mail size={22} />}
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
            {submitted ? l.sentTitle : l.title}
          </h1>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>
            {submitted ? l.sentBody : l.subtitle}
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col gap-4">
            {devResetUrl && (
              <Link
                href={devResetUrl}
                className="text-center text-sm font-semibold transition-colors duration-200"
                style={{ color: 'var(--pc-gold-text)' }}
              >
                {l.devResetLink}
              </Link>
            )}
            <Link
              href="/login"
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
            >
              {l.backToLogin}
            </Link>
            <button
              type="button"
              onClick={resetRequestForm}
              className="text-center text-sm font-semibold transition-colors duration-200"
              style={{ color: 'var(--pc-gold-text)' }}
            >
              {l.requestAnother}
            </button>
          </div>
        ) : (
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
        )}

        {!submitted && (
          <p className="text-center text-sm mt-6" style={{ color: 'var(--pc-t3)' }}>
            <Link
              href="/login"
              className="font-medium transition-colors duration-200"
              style={{ color: 'var(--pc-gold-text)' }}
            >
              {l.backToLogin}
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
