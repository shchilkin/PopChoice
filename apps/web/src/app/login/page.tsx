'use client';

import { LogIn } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';

import { submitLoginForm } from '../authFormLogic';
import {
  AuthEmailPasswordForm,
  AuthHeader,
  AuthInlineLink,
  AuthPanel,
  AuthSuccessPanel,
  AuthTrailingLink,
} from '../authFormUi';
import { useEmailPasswordAuthPage } from '../useAuthPageForms';

export default function LoginPage() {
  const { isAuthenticated, refreshSession } = useAuth();
  const { t } = useLanguage();
  const copy = t.login;
  const page = useEmailPasswordAuthPage({
    errors: copy.errors,
    submit: (form) => submitLoginForm(form, copy.errors, refreshSession),
  });

  if (page.success || isAuthenticated) {
    return <LoginSuccess copy={copy} />;
  }

  return (
    <AuthPanel>
      <AuthEmailPasswordForm
        copy={copy}
        errors={page.errors}
        form={page.form}
        header={
          <AuthHeader icon={<LogIn size={22} />} subtitle={copy.subtitle} title={copy.title} />
        }
        onSubmit={page.handleSubmit}
        passwordTrailingLabel={
          <AuthTrailingLink href="/forgot-password" label={copy.forgotPassword} />
        }
        setForm={page.setForm}
        submitting={page.submitting}
        footer={
          <p className="text-center text-sm mt-6" style={{ color: 'var(--pc-t3)' }}>
            {copy.noAccount} <AuthInlineLink href="/register" label={copy.signUp} />
          </p>
        }
      />
    </AuthPanel>
  );
}

function LoginSuccess({ copy }: { copy: ReturnType<typeof useLanguage>['t']['login'] }) {
  return (
    <AuthSuccessPanel
      body={copy.successMessage}
      ctaHref="/"
      ctaLabel={copy.backToHome}
      title={copy.successTitle}
    />
  );
}
