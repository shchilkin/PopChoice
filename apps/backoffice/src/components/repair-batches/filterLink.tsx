export function FilterLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <a className={`filter-chip ${active ? 'active' : ''}`} href={href}>
      {label}
    </a>
  );
}
