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
        {items.map((item, index) => (
          <BreadcrumbListItem
            key={index}
            item={item}
            isCurrent={index === items.length - 1}
            showSeparator={index > 0}
          />
        ))}
      </ol>
    </nav>
  );
}

function BreadcrumbListItem({
  item,
  isCurrent,
  showSeparator,
}: {
  item: BreadcrumbItem;
  isCurrent: boolean;
  showSeparator: boolean;
}) {
  return (
    <li className="flex items-center">
      {showSeparator && (
        <span aria-hidden="true" className="mx-1">
          {'/'}
        </span>
      )}
      <BreadcrumbLabel item={item} isCurrent={isCurrent} />
    </li>
  );
}

function BreadcrumbLabel({ item, isCurrent }: { item: BreadcrumbItem; isCurrent: boolean }) {
  if (item.href && !isCurrent) {
    return (
      <Link
        href={item.href}
        className="hover:opacity-70 transition-opacity duration-150"
        style={{ color: 'inherit' }}
      >
        {item.label}
      </Link>
    );
  }

  return <span aria-current={isCurrent ? 'page' : undefined}>{item.label}</span>;
}
