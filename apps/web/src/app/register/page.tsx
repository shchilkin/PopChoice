'use client';

import { UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';

import {
  type AuthFieldErrors,
  type RegisterFormState,
  applyAuthSubmitResult,
  hasAuthFieldErrors,
  submitRegisterForm,
  validateRegisterForm,
} from '../authFormLogic';
import {
  AuthGeneralError,
  AuthHeader,
  AuthLoginLink,
  AuthPanel,
  AuthPasswordConfirmationFields,
  AuthSubmitButton,
  AuthSuccessPanel,
  AuthTextField,
} from '../authFormUi';

const INITIAL_FORM: RegisterFormState = {
  confirmPassword: '',
  email: '',
  password: '',
};

export default function RegisterPage() {
  const { refreshSession } = useAuth();
  const { t } = useLanguage();
  const copy = t.register;

  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateRegisterForm(form, copy.errors);
    if (hasAuthFieldErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await submitRegisterForm(form, copy.errors, refreshSession);
    setSubmitting(false);
    applyAuthSubmitResult(result, copy.errors.generic, () => setSuccess(true), setErrors);
  }

  if (success) {
    return (
      <AuthSuccessPanel
        body={copy.successMessage}
        ctaHref="/"
        ctaLabel={copy.backToHome}
        title={copy.successTitle}
      />
    );
  }

  return (
    <AuthPanel>
      <AuthHeader icon={<UserPlus size={22} />} subtitle={copy.subtitle} title={copy.title} />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AuthGeneralError errors={errors} />
        <RegisterFields copy={copy} errors={errors} form={form} setForm={setForm} />
        <AuthSubmitButton
          label={copy.submitButton}
          submitting={submitting}
          submittingLabel={copy.submitting}
        />
      </form>
      <AuthLoginLink href="/login" label={copy.alreadyHaveAccount} linkLabel={copy.logIn} />
    </AuthPanel>
  );
}

type RegisterFieldsProps = {
  copy: ReturnType<typeof useLanguage>['t']['register'];
  errors: AuthFieldErrors;
  form: RegisterFormState;
  setForm: (next: RegisterFormState) => void;
};

function RegisterFields({ copy, errors, form, setForm }: RegisterFieldsProps) {
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
      <AuthPasswordConfirmationFields copy={copy} errors={errors} form={form} setForm={setForm} />
    </>
  );
}
