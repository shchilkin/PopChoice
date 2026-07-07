import type { HTMLAttributes } from 'react';

import { cn, type ClassValue } from './utils';

export type BadgeVariant =
  | 'default'
  | 'muted'
  | 'accent'
  | 'warning'
  | 'success'
  | 'danger'
  | 'neutral';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)]',
  muted: 'border-[var(--border)] bg-[#111419] text-[var(--muted)]',
  accent:
    'border-[color-mix(in_srgb,var(--accent),var(--border)_45%)] bg-[var(--accent-soft)] text-[var(--accent)]',
  warning:
    'border-[color-mix(in_srgb,var(--warn),var(--border)_45%)] bg-[var(--warn-soft)] text-[var(--warn)]',
  success:
    'border-[color-mix(in_srgb,var(--good),var(--border)_55%)] bg-[var(--good-soft)] text-[var(--good)]',
  danger:
    'border-[color-mix(in_srgb,var(--bad),var(--border)_45%)] bg-[var(--bad-soft)] text-[var(--bad)]',
  neutral: 'border-transparent bg-[var(--surface-3)] text-[var(--muted)]',
};

export function badgeVariantsFor({
  className,
  variant = 'default',
}: {
  className?: ClassValue;
  variant?: BadgeVariant;
} = {}) {
  return cn(
    'inline-flex min-h-6 items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-black leading-none tracking-normal',
    badgeVariants[variant],
    className,
  );
}

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
}) {
  return <span className={badgeVariantsFor({ className, variant })} {...props} />;
}
