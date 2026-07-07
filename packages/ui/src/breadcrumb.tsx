import { cn } from './utils';

import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export type BreadcrumbItem = {
  href?: string;
  label: ReactNode;
};

export type BreadcrumbsProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  itemClassName?: string;
  items: BreadcrumbItem[];
  linkClassName?: string;
  listClassName?: string;
  separator?: ReactNode;
};

type BreadcrumbLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
};

function BreadcrumbLink({ children, className, ...props }: BreadcrumbLinkProps) {
  return (
    <a
      className={cn(
        'rounded-sm text-[var(--muted)] no-underline transition-colors hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function Breadcrumbs({
  className,
  itemClassName,
  items,
  linkClassName,
  listClassName,
  separator = '/',
  ...props
}: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('text-xs font-extrabold leading-none', className)}
      {...props}
    >
      <ol className={cn('flex flex-wrap items-center gap-1.5 p-0 m-0', listClassName)}>
        {items.map((item, index) => {
          const isCurrent = index === lastIndex;
          const key = `${index}-${typeof item.label === 'string' ? item.label : item.href}`;

          return (
            <li className={cn('flex items-center gap-1.5', itemClassName)} key={key}>
              {index > 0 ? (
                <span aria-hidden="true" className="text-[var(--subtle)]">
                  {separator}
                </span>
              ) : null}
              {item.href && !isCurrent ? (
                <BreadcrumbLink className={linkClassName} href={item.href}>
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <span
                  aria-current={isCurrent ? 'page' : undefined}
                  className="text-[var(--subtle)]"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
