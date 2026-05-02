import Link from 'next/link';

interface BreadcrumbItem {
  href?: string;
  label: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const labelStyle = {
  fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  fontSize: '0.75rem',
  letterSpacing: '0.12em',
  color: 'var(--pc-t3)',
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center" style={labelStyle}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span aria-hidden="true" className="mx-1">
                  {'/'}
                </span>
              )}
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="hover:opacity-70 transition-opacity duration-150"
                  style={{ color: 'inherit' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
