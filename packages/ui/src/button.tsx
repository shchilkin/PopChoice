import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

import { cn, type ClassValue } from './utils';

export type ButtonVariant =
  'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'quiet' | 'ghost';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const baseButtonClasses =
  'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[7px] border text-sm font-extrabold tracking-normal no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  primary:
    'border-[color-mix(in_srgb,var(--accent),var(--border)_35%)] bg-[linear-gradient(180deg,rgba(124,199,255,0.18),var(--surface-2))] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  secondary:
    'border-[color-mix(in_srgb,var(--warn),var(--border)_45%)] bg-[linear-gradient(180deg,rgba(245,197,66,0.16),var(--surface-2))] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  success:
    'border-[color-mix(in_srgb,var(--good),#ffffff_18%)] bg-[linear-gradient(180deg,#63df80,#40c463)] text-[#07130b] hover:brightness-105',
  danger:
    'border-[color-mix(in_srgb,var(--bad),var(--border)_35%)] bg-[linear-gradient(180deg,rgba(255,95,86,0.16),var(--surface-2))] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  quiet:
    'border-[var(--border)] bg-[#111419] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
  ghost:
    'border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'px-2.5 py-1.5',
  sm: 'min-h-8 px-2 py-1 text-xs',
  lg: 'min-h-11 px-3.5 py-2 text-base',
  icon: 'h-9 w-9 p-0',
};

export function buttonVariants({
  className,
  size = 'default',
  variant = 'default',
}: {
  className?: ClassValue;
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}) {
  return cn(baseButtonClasses, variantClasses[variant], sizeClasses[size], className);
}

export function Button({
  className,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return <button className={buttonVariants({ className, size, variant })} {...props} />;
}

export function ButtonLink({
  className,
  size,
  variant,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return <a className={buttonVariants({ className, size, variant })} {...props} />;
}
