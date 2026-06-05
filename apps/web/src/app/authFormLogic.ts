import { getCsrfToken } from '@/lib/csrfClient';

export type AuthFieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

export type RegisterFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type ResetPasswordFormState = {
  password: string;
  confirmPassword: string;
};

export type EmailPasswordFormState = {
  email: string;
  password: string;
};

export type EmailErrorCopy = {
  emailRequired: string;
  emailInvalid: string;
  generic: string;
};

export type EmailPasswordErrorCopy = EmailErrorCopy & {
  invalidCredentials: string;
  passwordRequired: string;
};

export type RegisterErrorCopy = {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordTooShort: string;
  confirmPasswordRequired: string;
  passwordMismatch: string;
  emailTaken: string;
  generic: string;
};

export type ResetPasswordErrorCopy = {
  passwordRequired: string;
  passwordTooShort: string;
  confirmPasswordRequired: string;
  passwordMismatch: string;
  invalidToken: string;
  generic: string;
};

export type SubmitResult = {
  errors?: AuthFieldErrors;
  success: boolean;
};

type ErrorResponse = {
  error?: string;
};

type ForgotPasswordResponse = {
  resetUrl?: string;
};

type AuthPostResponse<TData> = {
  data: TData;
  status: number;
};

type ErrorRule<TForm, TField extends keyof AuthFieldErrors> = {
  field: TField;
  message: string;
  when: (form: TForm) => boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasAuthFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

function collectErrors<TForm>(
  form: TForm,
  rules: Array<ErrorRule<TForm, keyof AuthFieldErrors>>,
): AuthFieldErrors {
  return rules.reduce<AuthFieldErrors>((errors, rule) => {
    if (errors[rule.field] || !rule.when(form)) {
      return errors;
    }

    return { ...errors, [rule.field]: rule.message };
  }, {});
}

export function validateRegisterForm(
  form: RegisterFormState,
  messages: RegisterErrorCopy,
): AuthFieldErrors {
  const email = form.email.trim();

  return collectErrors({ ...form, email }, [
    { field: 'email', message: messages.emailRequired, when: (value) => !value.email },
    {
      field: 'email',
      message: messages.emailInvalid,
      when: (value) => Boolean(value.email) && !EMAIL_PATTERN.test(value.email),
    },
    {
      field: 'password',
      message: messages.passwordRequired,
      when: (value) => !value.password,
    },
    {
      field: 'password',
      message: messages.passwordTooShort,
      when: (value) => Boolean(value.password) && value.password.length < 8,
    },
    {
      field: 'confirmPassword',
      message: messages.confirmPasswordRequired,
      when: (value) => !value.confirmPassword,
    },
    {
      field: 'confirmPassword',
      message: messages.passwordMismatch,
      when: (value) => Boolean(value.confirmPassword) && value.password !== value.confirmPassword,
    },
  ]);
}

export function validateResetPasswordForm(
  form: ResetPasswordFormState,
  token: string,
  messages: ResetPasswordErrorCopy,
): AuthFieldErrors {
  return collectErrors(form, [
    { field: 'general', message: messages.invalidToken, when: () => !token },
    {
      field: 'password',
      message: messages.passwordRequired,
      when: (value) => !value.password,
    },
    {
      field: 'password',
      message: messages.passwordTooShort,
      when: (value) => Boolean(value.password) && value.password.length < 8,
    },
    {
      field: 'confirmPassword',
      message: messages.confirmPasswordRequired,
      when: (value) => !value.confirmPassword,
    },
    {
      field: 'confirmPassword',
      message: messages.passwordMismatch,
      when: (value) => Boolean(value.confirmPassword) && value.password !== value.confirmPassword,
    },
  ]);
}

export function validateEmailForm(email: string, messages: EmailErrorCopy): AuthFieldErrors {
  const trimmedEmail = email.trim();

  return collectErrors({ email: trimmedEmail }, [
    { field: 'email', message: messages.emailRequired, when: (value) => !value.email },
    {
      field: 'email',
      message: messages.emailInvalid,
      when: (value) => Boolean(value.email) && !EMAIL_PATTERN.test(value.email),
    },
  ]);
}

export function validateEmailPasswordForm(
  form: EmailPasswordFormState,
  messages: EmailPasswordErrorCopy,
): AuthFieldErrors {
  return collectErrors({ ...form, email: form.email.trim() }, [
    { field: 'email', message: messages.emailRequired, when: (value) => !value.email },
    {
      field: 'email',
      message: messages.emailInvalid,
      when: (value) => Boolean(value.email) && !EMAIL_PATTERN.test(value.email),
    },
    {
      field: 'password',
      message: messages.passwordRequired,
      when: (value) => !value.password,
    },
  ]);
}

export function registerErrorsForResponse(
  status: number,
  data: ErrorResponse,
  messages: RegisterErrorCopy,
): AuthFieldErrors {
  return status === 409 || data.error === 'email_taken'
    ? { email: messages.emailTaken }
    : { general: messages.generic };
}

export function resetPasswordErrorsForResponse(
  status: number,
  data: ErrorResponse,
  messages: ResetPasswordErrorCopy,
): AuthFieldErrors {
  return status === 400 || data.error === 'invalid_or_expired_token'
    ? { general: messages.invalidToken }
    : { general: messages.generic };
}

function credentialsErrorsForResponse(
  status: number,
  data: ErrorResponse,
  messages: EmailPasswordErrorCopy,
): AuthFieldErrors {
  return status === 401 || data.error === 'invalid_credentials'
    ? { general: messages.invalidCredentials }
    : { general: messages.generic };
}

export function applyAuthSubmitResult(
  result: SubmitResult,
  fallbackMessage: string,
  onSuccess: () => void,
  onErrors: (errors: AuthFieldErrors) => void,
): void {
  if (result.success) {
    onSuccess();
    return;
  }

  onErrors(result.errors ?? { general: fallbackMessage });
}

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  return (await response.json().catch(() => ({}))) as ErrorResponse;
}

async function postAuthJson<TData>(url: string, body: unknown): Promise<AuthPostResponse<TData>> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
    },
    method: 'POST',
  });

  return { data: (await response.json().catch(() => ({}))) as TData, status: response.status };
}

async function submitEmailPasswordAuthForm({
  form,
  messages,
  onSuccess,
  url,
}: {
  form: EmailPasswordFormState;
  messages: EmailPasswordErrorCopy;
  onSuccess: () => Promise<unknown>;
  url: string;
}): Promise<SubmitResult> {
  try {
    const response = await postAuthJson<ErrorResponse>(url, {
      email: form.email.trim(),
      password: form.password,
    });

    if (response.status === 200) {
      await onSuccess();
      return { success: true };
    }

    return {
      errors: credentialsErrorsForResponse(response.status, response.data, messages),
      success: false,
    };
  } catch {
    return { errors: { general: messages.generic }, success: false };
  }
}

export async function submitRegisterForm(
  form: RegisterFormState,
  messages: RegisterErrorCopy,
  refreshSession: () => Promise<unknown>,
): Promise<SubmitResult> {
  try {
    const response = await fetch('/api/auth/register', {
      body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (response.status === 201) {
      await refreshSession();
      return { success: true };
    }

    return {
      errors: registerErrorsForResponse(
        response.status,
        await readErrorResponse(response),
        messages,
      ),
      success: false,
    };
  } catch {
    return { errors: { general: messages.generic }, success: false };
  }
}

export function submitLoginForm(
  form: EmailPasswordFormState,
  messages: EmailPasswordErrorCopy,
  refreshSession: () => Promise<unknown>,
): Promise<SubmitResult> {
  return submitEmailPasswordAuthForm({
    form,
    messages,
    onSuccess: refreshSession,
    url: '/api/auth/login',
  });
}

export function submitDeleteAccountForm(
  form: EmailPasswordFormState,
  messages: EmailPasswordErrorCopy,
  refreshSession: () => Promise<unknown>,
): Promise<SubmitResult> {
  return submitEmailPasswordAuthForm({
    form,
    messages,
    onSuccess: refreshSession,
    url: '/api/auth/delete-account',
  });
}

export async function submitForgotPasswordForm(
  email: string,
  fallbackMessage: string,
): Promise<SubmitResult & ForgotPasswordResponse> {
  try {
    const response = await postAuthJson<ForgotPasswordResponse>('/api/auth/forgot-password', {
      email: email.trim(),
    });

    return response.status === 202
      ? { resetUrl: response.data.resetUrl, success: true }
      : { errors: { general: fallbackMessage }, success: false };
  } catch {
    return { errors: { general: fallbackMessage }, success: false };
  }
}

export async function submitResetPasswordForm(
  form: ResetPasswordFormState,
  token: string,
  messages: ResetPasswordErrorCopy,
): Promise<SubmitResult> {
  try {
    const response = await fetch('/api/auth/reset-password', {
      body: JSON.stringify({ token, password: form.password }),
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      method: 'POST',
    });

    if (response.status === 200) {
      return { success: true };
    }

    return {
      errors: resetPasswordErrorsForResponse(
        response.status,
        await readErrorResponse(response),
        messages,
      ),
      success: false,
    };
  } catch {
    return { errors: { general: messages.generic }, success: false };
  }
}
