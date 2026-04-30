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
    <p className={className} style={labelStyle}>
      {items.map((item, index) => (
        <span key={index}>
          {index > 0 && <span>{' / '}</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:opacity-70 transition-opacity duration-150"
              style={{ color: 'inherit' }}
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </p>
  );
}
