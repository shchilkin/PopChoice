'use client';

import { KeyRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

import { useLanguage } from '@/i18n';

import {
  type AuthFieldErrors,
  type ResetPasswordFormState,
  applyAuthSubmitResult,
  hasAuthFieldErrors,
  submitResetPasswordForm,
  validateResetPasswordForm,
} from '../authFormLogic';
import {
  AuthGeneralError,
  AuthHeader,
  AuthPanel,
  AuthPasswordConfirmationFields,
  AuthSubmitButton,
  AuthSuccessPanel,
} from '../authFormUi';

const INITIAL_FORM: ResetPasswordFormState = {
  confirmPassword: '',
  password: '',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const { t } = useLanguage();
  const copy = t.resetPassword;
  const token = useSearchParams().get('token') ?? '';

  const [form, setForm] = useState<ResetPasswordFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<AuthFieldErrors>(
    token ? {} : { general: copy.errors.invalidToken },
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateResetPasswordForm(form, token, copy.errors);
    if (hasAuthFieldErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await submitResetPasswordForm(form, token, copy.errors);
    setSubmitting(false);
    applyAuthSubmitResult(result, copy.errors.generic, () => setSuccess(true), setErrors);
  }

  if (success) {
    return (
      <AuthSuccessPanel
        body={copy.successMessage}
        ctaHref="/login"
        ctaLabel={copy.backToLogin}
        title={copy.successTitle}
      />
    );
  }

  return (
    <AuthPanel>
      <AuthHeader icon={<KeyRound size={22} />} subtitle={copy.subtitle} title={copy.title} />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AuthGeneralError errors={errors} />
        <ResetPasswordFields copy={copy} errors={errors} form={form} setForm={setForm} />
        <AuthSubmitButton
          disabled={!token}
          label={copy.submitButton}
          submitting={submitting}
          submittingLabel={copy.submitting}
        />
      </form>
    </AuthPanel>
  );
}

type ResetPasswordFieldsProps = {
  copy: ReturnType<typeof useLanguage>['t']['resetPassword'];
  errors: AuthFieldErrors;
  form: ResetPasswordFormState;
  setForm: (next: ResetPasswordFormState) => void;
};

function ResetPasswordFields({ copy, errors, form, setForm }: ResetPasswordFieldsProps) {
  return (
    <AuthPasswordConfirmationFields copy={copy} errors={errors} form={form} setForm={setForm} />
  );
}
