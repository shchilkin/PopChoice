export function ComponentRow({
  label,
  children,
  code,
}: {
  label: string;
  children: React.ReactNode;
  code?: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-6 py-5"
      style={{ borderBottom: '1px solid var(--pc-bd1)' }}
    >
      <div className="w-36 shrink-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--pc-t3)' }}>
          {label}
        </p>
        {code && (
          <code className="text-xs" style={{ color: 'var(--pc-t4)' }}>
            {code}
          </code>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
