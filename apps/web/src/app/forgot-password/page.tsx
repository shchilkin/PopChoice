'use client';

import { CheckCircle, Mail } from 'lucide-react';

import { useLanguage } from '@/i18n';

import {
  AuthGeneralError,
  AuthHeader,
  AuthInlineLink,
  AuthPanel,
  AuthPrimaryLink,
  AuthStandaloneTextLink,
  AuthSubmitButton,
  AuthTextButton,
  AuthTextField,
} from '../authFormUi';
import { useForgotPasswordRequest } from '../useAuthPageForms';

import type { AuthFieldErrors } from '../authFormLogic';
import type { FormEvent } from 'react';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const copy = t.forgotPassword;
  const request = useForgotPasswordRequest(copy.errors);

  return (
    <AuthPanel>
      <ForgotPasswordHeader labels={copy} submitted={request.submitted} />
      <ForgotPasswordBody labels={copy} request={request} />
    </AuthPanel>
  );
}

function ForgotPasswordHeader({
  labels,
  submitted,
}: {
  labels: ReturnType<typeof useLanguage>['t']['forgotPassword'];
  submitted: boolean;
}) {
  if (submitted) {
    return (
      <AuthHeader
        icon={<CheckCircle size={22} />}
        title={labels.sentTitle}
        subtitle={labels.sentBody}
      />
    );
  }

  return <AuthHeader icon={<Mail size={22} />} title={labels.title} subtitle={labels.subtitle} />;
}

function ForgotPasswordBody({
  labels,
  request,
}: {
  labels: ReturnType<typeof useLanguage>['t']['forgotPassword'];
  request: ReturnType<typeof useForgotPasswordRequest>;
}) {
  if (request.submitted) {
    return (
      <ForgotPasswordSubmitted
        labels={labels}
        devResetUrl={request.devResetUrl}
        onResetRequest={request.resetRequestForm}
      />
    );
  }

  return (
    <ForgotPasswordForm
      email={request.email}
      errors={request.errors}
      labels={labels}
      onEmailChange={request.setEmail}
      onSubmit={request.handleSubmit}
      submitting={request.submitting}
    />
  );
}

function ForgotPasswordSubmitted({
  labels,
  devResetUrl,
  onResetRequest,
}: {
  labels: ReturnType<typeof useLanguage>['t']['forgotPassword'];
  devResetUrl: string | null;
  onResetRequest: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {devResetUrl && <AuthStandaloneTextLink href={devResetUrl} label={labels.devResetLink} />}
      <AuthPrimaryLink href="/login" label={labels.backToLogin} fullWidth />
      <AuthTextButton onClick={onResetRequest} label={labels.requestAnother} />
    </div>
  );
}

function ForgotPasswordForm({
  email,
  errors,
  labels,
  onEmailChange,
  onSubmit,
  submitting,
}: {
  email: string;
  errors: AuthFieldErrors;
  labels: ReturnType<typeof useLanguage>['t']['forgotPassword'];
  onEmailChange: (email: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <AuthGeneralError errors={errors} />
        <AuthTextField
          autoComplete="email"
          error={errors.email}
          id="email"
          label={labels.emailLabel}
          onChange={onEmailChange}
          placeholder={labels.emailPlaceholder}
          type="email"
          value={email}
        />
        <AuthSubmitButton
          label={labels.submitButton}
          submitting={submitting}
          submittingLabel={labels.submitting}
        />
      </form>
      <p className="text-center text-sm mt-6" style={{ color: 'var(--pc-t3)' }}>
        <AuthInlineLink href="/login" label={labels.backToLogin} />
      </p>
    </>
  );
}
