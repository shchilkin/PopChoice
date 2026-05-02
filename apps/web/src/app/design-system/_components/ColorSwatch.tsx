export function ColorSwatch({
  color,
  name,
  token,
  isVar = false,
}: {
  color: string;
  name: string;
  token: string;
  isVar?: boolean;
}) {
  const bg = isVar ? undefined : color;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-lg border"
        style={{
          background: isVar ? `var(${color})` : bg,
          borderColor: 'var(--pc-bd2)',
        }}
      />
      <p className="text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
        {name}
      </p>
      <p className="text-xs font-mono" style={{ color: 'var(--pc-t3)' }}>
        {token}
      </p>
    </div>
  );
}
