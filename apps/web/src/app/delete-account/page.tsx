'use client';

import { Trash2 } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';

import { submitDeleteAccountForm } from '../authFormLogic';
import { AuthEmailPasswordForm, AuthHeader, AuthPanel, AuthSuccessPanel } from '../authFormUi';
import { useEmailPasswordAuthPage } from '../useAuthPageForms';

export default function DeleteAccountPage() {
  const { refreshSession } = useAuth();
  const { t } = useLanguage();
  const copy = t.deleteAccount;
  const page = useEmailPasswordAuthPage({
    errors: copy.errors,
    submit: (form) => submitDeleteAccountForm(form, copy.errors, refreshSession),
  });

  if (page.success) {
    return <DeleteAccountSuccess copy={copy} />;
  }

  return (
    <AuthPanel>
      <AuthEmailPasswordForm
        copy={copy}
        danger
        errors={page.errors}
        form={page.form}
        header={
          <AuthHeader
            icon={<Trash2 size={22} />}
            subtitle={copy.subtitle}
            title={copy.title}
            tone="red"
          />
        }
        onSubmit={page.handleSubmit}
        setForm={page.setForm}
        submitting={page.submitting}
      />
    </AuthPanel>
  );
}

function DeleteAccountSuccess({
  copy,
}: {
  copy: ReturnType<typeof useLanguage>['t']['deleteAccount'];
}) {
  return (
    <AuthSuccessPanel
      body={copy.successMessage}
      ctaHref="/"
      ctaLabel={copy.backToHome}
      title={copy.successTitle}
    />
  );
}
