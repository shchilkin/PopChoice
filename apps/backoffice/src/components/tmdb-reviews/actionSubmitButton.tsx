'use client';

import { useFormStatus } from 'react-dom';

export function ReviewActionSubmitButton({
  buttonClass,
  disabled = false,
  label,
  name,
  pendingLabel,
  value,
}: {
  buttonClass: string;
  disabled?: boolean;
  label: string;
  name?: string;
  pendingLabel: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      className={`button ${buttonClass}`}
      disabled={isDisabled}
      name={name}
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
