'use client';

import { CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { palette } from '@/styles/designTokens';

import type {
  AuthFieldErrors,
  EmailPasswordFormState,
  ResetPasswordFormState,
} from './authFormLogic';
import type { FormEvent, ReactNode } from 'react';

type AuthTone = 'gold' | 'red';

type AuthPanelProps = {
  children: ReactNode;
  mode?: 'center' | 'form';
};

type AuthHeaderProps = {
  icon: ReactNode;
  subtitle: string;
  title: string;
  tone?: AuthTone;
};

type AuthSuccessPanelProps = {
  body: string;
  ctaHref: string;
  ctaLabel: string;
  title: string;
};

type AuthTextFieldProps = {
  autoComplete: string;
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailingLabel?: ReactNode;
  type: 'email' | 'password';
  value: string;
};

type AuthSubmitButtonProps = {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  submitting: boolean;
  submittingLabel: string;
};

type PasswordConfirmationCopy = {
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
};

type AuthPasswordConfirmationFieldsProps<TForm extends ResetPasswordFormState> = {
  copy: PasswordConfirmationCopy;
  errors: AuthFieldErrors;
  form: TForm;
  setForm: (next: TForm) => void;
};

type AuthSubmitButtonPresentation = {
  background: string;
  color: string;
  cursor: 'not-allowed' | 'pointer';
  disabled: boolean;
  text: string;
};

type AuthLoginLinkProps = {
  href: string;
  label: string;
  linkLabel: string;
};

type EmailPasswordCopy = {
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
};

type AuthEmailPasswordFieldsProps<TForm extends EmailPasswordFormState> = {
  copy: EmailPasswordCopy;
  errors: AuthFieldErrors;
  form: TForm;
  passwordTrailingLabel?: ReactNode;
  setForm: (next: TForm) => void;
};

type AuthEmailPasswordFormProps<TForm extends EmailPasswordFormState> = {
  copy: EmailPasswordCopy & { submitButton: string; submitting: string };
  danger?: boolean;
  errors: AuthFieldErrors;
  footer?: ReactNode;
  form: TForm;
  header: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  passwordTrailingLabel?: ReactNode;
  setForm: (next: TForm) => void;
  submitting: boolean;
};

const titleStyle = {
  color: 'var(--pc-t1)',
  fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
  fontSize: '2rem',
  fontWeight: '600',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
} as const;

const authToneColor: Record<AuthTone, string> = {
  gold: 'var(--pc-gold-text)',
  red: palette.red,
};

export function AuthPanel({ children, mode = 'form' }: AuthPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-16">
      <motion.div
        initial={{
          opacity: 0,
          scale: mode === 'center' ? 0.9 : undefined,
          y: mode === 'form' ? 20 : undefined,
        }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={mode === 'center' ? 'w-full max-w-sm text-center' : 'w-full max-w-sm'}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function AuthHeader({ icon, subtitle, title, tone = 'gold' }: AuthHeaderProps) {
  const color = authToneColor[tone];

  return (
    <div className="text-center mb-8">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      <h1 className="mb-2" style={titleStyle}>
        {title}
      </h1>
      <p style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>{subtitle}</p>
    </div>
  );
}

export function AuthSuccessPanel({ body, ctaHref, ctaLabel, title }: AuthSuccessPanelProps) {
  return (
    <AuthPanel mode="center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: `${palette.green}20`, color: palette.green }}
      >
        <CheckCircle size={32} />
      </div>
      <h1 className="mb-3" style={titleStyle}>
        {title}
      </h1>
      <p style={{ color: 'var(--pc-t2)', marginBottom: '2rem' }}>{body}</p>
      <Link
        href={ctaHref}
        className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-colors duration-200"
        style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
      >
        {ctaLabel}
      </Link>
    </AuthPanel>
  );
}

export function AuthGeneralError({ errors }: { errors: AuthFieldErrors }) {
  if (!errors.general) {
    return null;
  }

  return (
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
  );
}

export function AuthTextField({
  autoComplete,
  error,
  id,
  label,
  onChange,
  placeholder,
  trailingLabel,
  type,
  value,
}: AuthTextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium" style={{ color: 'var(--pc-t2)' }}>
          {label}
        </label>
        {trailingLabel}
      </div>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm transition-colors duration-200 outline-none"
        style={{
          background: 'var(--pc-input-bg, rgba(255,255,255,0.05))',
          border: `1px solid ${error ? palette.red : 'var(--pc-bd2)'}`,
          color: 'var(--pc-t1)',
        }}
      />
      {error && (
        <p className="text-xs" style={{ color: palette.red }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AuthEmailPasswordFields<TForm extends EmailPasswordFormState>({
  copy,
  errors,
  form,
  passwordTrailingLabel,
  setForm,
}: AuthEmailPasswordFieldsProps<TForm>) {
  return (
    <>
      <AuthTextField
        autoComplete="email"
        error={errors.email}
        id="email"
        label={copy.emailLabel}
        onChange={(email) => setForm({ ...form, email })}
        placeholder={copy.emailPlaceholder}
        type="email"
        value={form.email}
      />
      <AuthTextField
        autoComplete="current-password"
        error={errors.password}
        id="password"
        label={copy.passwordLabel}
        onChange={(password) => setForm({ ...form, password })}
        placeholder={copy.passwordPlaceholder}
        trailingLabel={passwordTrailingLabel}
        type="password"
        value={form.password}
      />
    </>
  );
}

export function AuthEmailPasswordForm<TForm extends EmailPasswordFormState>({
  copy,
  danger,
  errors,
  footer,
  form,
  header,
  onSubmit,
  passwordTrailingLabel,
  setForm,
  submitting,
}: AuthEmailPasswordFormProps<TForm>) {
  return (
    <>
      {header}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <AuthGeneralError errors={errors} />
        <AuthEmailPasswordFields
          copy={copy}
          errors={errors}
          form={form}
          passwordTrailingLabel={passwordTrailingLabel}
          setForm={setForm}
        />
        <AuthSubmitButton
          danger={danger}
          label={copy.submitButton}
          submitting={submitting}
          submittingLabel={copy.submitting}
        />
      </form>
      {footer}
    </>
  );
}

export function AuthPasswordConfirmationFields<TForm extends ResetPasswordFormState>({
  copy,
  errors,
  form,
  setForm,
}: AuthPasswordConfirmationFieldsProps<TForm>) {
  return (
    <>
      <AuthTextField
        autoComplete="new-password"
        error={errors.password}
        id="password"
        label={copy.passwordLabel}
        onChange={(password) => setForm({ ...form, password })}
        placeholder={copy.passwordPlaceholder}
        type="password"
        value={form.password}
      />
      <AuthTextField
        autoComplete="new-password"
        error={errors.confirmPassword}
        id="confirmPassword"
        label={copy.confirmPasswordLabel}
        onChange={(confirmPassword) => setForm({ ...form, confirmPassword })}
        placeholder={copy.confirmPasswordPlaceholder}
        type="password"
        value={form.confirmPassword}
      />
    </>
  );
}

export function getAuthSubmitButtonPresentation({
  danger,
  disabled,
  label,
  submitting,
  submittingLabel,
}: AuthSubmitButtonProps): AuthSubmitButtonPresentation {
  if (submitting) {
    return {
      background: 'var(--pc-ghost)',
      color: 'var(--pc-t3)',
      cursor: 'not-allowed',
      disabled: true,
      text: submittingLabel,
    };
  }

  if (disabled) {
    return {
      background: 'var(--pc-ghost)',
      color: 'var(--pc-t3)',
      cursor: 'not-allowed',
      disabled: true,
      text: label,
    };
  }

  if (danger) {
    return {
      background: palette.red,
      color: '#F8F8FF',
      cursor: 'pointer',
      disabled: false,
      text: label,
    };
  }

  return {
    background: 'var(--pc-cta)',
    color: 'var(--pc-cta-text)',
    cursor: 'pointer',
    disabled: false,
    text: label,
  };
}

export function AuthSubmitButton({
  danger,
  disabled,
  label,
  submitting,
  submittingLabel,
}: AuthSubmitButtonProps) {
  const presentation = getAuthSubmitButtonPresentation({
    danger,
    disabled,
    label,
    submitting,
    submittingLabel,
  });

  return (
    <button
      type="submit"
      disabled={presentation.disabled}
      className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 mt-1"
      style={{
        background: presentation.background,
        color: presentation.color,
        cursor: presentation.cursor,
      }}
    >
      {presentation.text}
    </button>
  );
}

export function AuthPrimaryLink({
  fullWidth,
  href,
  label,
}: {
  fullWidth?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`${fullWidth ? 'block w-full text-center' : 'inline-block'} px-6 py-3 rounded-xl text-sm font-semibold transition-colors duration-200`}
      style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
    >
      {label}
    </Link>
  );
}

export function AuthInlineLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="font-medium transition-colors duration-200"
      style={{ color: 'var(--pc-gold-text)' }}
    >
      {label}
    </Link>
  );
}

export function AuthStandaloneTextLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-center text-sm font-semibold transition-colors duration-200"
      style={{ color: 'var(--pc-gold-text)' }}
    >
      {label}
    </Link>
  );
}

export function AuthTrailingLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs font-medium transition-colors duration-200"
      style={{ color: 'var(--pc-gold-text)' }}
    >
      {label}
    </Link>
  );
}

export function AuthTextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center text-sm font-semibold transition-colors duration-200"
      style={{ color: 'var(--pc-gold-text)' }}
    >
      {label}
    </button>
  );
}

export function AuthLoginLink({ href, label, linkLabel }: AuthLoginLinkProps) {
  return (
    <p className="text-center text-sm mt-6" style={{ color: 'var(--pc-t3)' }}>
      {label}{' '}
      <Link
        href={href}
        className="font-medium transition-colors duration-200"
        style={{ color: 'var(--pc-gold-text)' }}
      >
        {linkLabel}
      </Link>
    </p>
  );
}
