export function TokenRow({ token, description }: { token: string; description: string }) {
  return (
    <div
      className="flex items-center gap-4 py-3"
      style={{ borderBottom: '1px solid var(--pc-bd1)' }}
    >
      <div
        className="h-8 w-8 shrink-0 rounded-md border"
        style={{ background: `var(${token})`, borderColor: 'var(--pc-bd2)' }}
      />
      <code className="min-w-56 text-xs" style={{ color: 'var(--pc-gold)' }}>
        {token}
      </code>
      <span className="text-sm" style={{ color: 'var(--pc-t2)' }}>
        {description}
      </span>
    </div>
  );
}
