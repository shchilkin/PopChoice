'use client';

import { useState, type FormEvent } from 'react';

import {
  type AuthFieldErrors,
  type EmailErrorCopy,
  type EmailPasswordErrorCopy,
  type EmailPasswordFormState,
  type SubmitResult,
  applyAuthSubmitResult,
  hasAuthFieldErrors,
  submitForgotPasswordForm,
  validateEmailForm,
  validateEmailPasswordForm,
} from './authFormLogic';

const EMPTY_EMAIL_PASSWORD_FORM: EmailPasswordFormState = {
  email: '',
  password: '',
};

type EmailPasswordAuthPageOptions = {
  errors: EmailPasswordErrorCopy;
  onSuccess?: () => void;
  submit: (form: EmailPasswordFormState) => Promise<SubmitResult>;
};

export function useEmailPasswordAuthPage({
  errors: errorCopy,
  onSuccess,
  submit,
}: EmailPasswordAuthPageOptions) {
  const state = useEmailPasswordAuthState();
  const { form, setErrors, setSubmitting, setSuccess } = state;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateEmailPasswordForm(form, errorCopy);
    if (rejectInvalidSubmit(validationErrors, setErrors)) return;

    setErrors({});
    setSubmitting(true);
    const result = await submit(form);
    setSubmitting(false);
    applyAuthSubmitResult(
      result,
      errorCopy.generic,
      () => {
        setSuccess(true);
        onSuccess?.();
      },
      setErrors,
    );
  }

  return { ...state, handleSubmit };
}

export function useForgotPasswordRequest(errorCopy: EmailErrorCopy) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<AuthFieldErrors>({});
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateEmailForm(email, errorCopy);
    if (rejectInvalidSubmit(validationErrors, setErrors)) return;

    setErrors({});
    setSubmitting(true);
    setDevResetUrl(null);
    const result = await submitForgotPasswordForm(email, errorCopy.generic);
    setSubmitting(false);
    applyAuthSubmitResult(
      result,
      errorCopy.generic,
      () => {
        setDevResetUrl(result.resetUrl ?? null);
        setSubmitted(true);
      },
      setErrors,
    );
  }

  return {
    devResetUrl,
    email,
    errors,
    handleSubmit,
    resetRequestForm,
    setEmail,
    submitted,
    submitting,
  };
}

function rejectInvalidSubmit(
  validationErrors: AuthFieldErrors,
  setErrors: (errors: AuthFieldErrors) => void,
): boolean {
  if (!hasAuthFieldErrors(validationErrors)) return false;
  setErrors(validationErrors);
  return true;
}

function useEmailPasswordAuthState() {
  const formState = useState<EmailPasswordFormState>(EMPTY_EMAIL_PASSWORD_FORM);
  const errorState = useState<AuthFieldErrors>({});
  const submittingState = useState(false);
  const successState = useState(false);

  return {
    errors: errorState[0],
    form: formState[0],
    setErrors: errorState[1],
    setForm: formState[1],
    setSubmitting: submittingState[1],
    setSuccess: successState[1],
    submitting: submittingState[0],
    success: successState[0],
  };
}
