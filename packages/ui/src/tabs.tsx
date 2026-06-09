import type { AnchorHTMLAttributes, HTMLAttributes } from 'react';

import { cn, type ClassValue } from './utils';

export function TabsNav({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn('flex flex-wrap items-center gap-2', className)}
      aria-label={props['aria-label']}
      {...props}
    />
  );
}

export function tabsLinkVariants({
  active = false,
  className,
}: {
  active?: boolean;
  className?: ClassValue;
} = {}) {
  return cn(
    'inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-[7px] border px-2.5 py-1.5 text-sm font-extrabold no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
    active
      ? 'border-[color-mix(in_srgb,var(--brand),var(--border)_35%)] bg-[var(--brand-soft)] text-[var(--text)]'
      : 'border-[var(--border)] bg-[#12151a] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
    className,
  );
}

export function TabsLink({
  active = false,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  active?: boolean;
}) {
  return (
    <a
      className={tabsLinkVariants({ active, className })}
      aria-current={active ? 'page' : undefined}
      {...props}
    />
  );
}
