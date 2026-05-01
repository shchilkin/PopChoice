// Shared layout helpers for style-guide pages.
// Keep these server-compatible (no client hooks).

export { ColorSwatch } from './ColorSwatch';
export { MascotSection } from './MascotSection';
export { TokenRow } from './TokenRow';

export function Section({
  title,
  children,
  id: explicitId,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  const id =
    explicitId ??
    title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  return (
    <section className="mb-16" id={id}>
      <h2
        className="mb-6 text-sm font-bold uppercase tracking-[0.2em]"
        style={{
          color: 'var(--pc-gold)',
          fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-6 ${className}`}
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs" style={{ color: 'var(--pc-t3)', fontFamily: 'monospace' }}>
      {children}
    </p>
  );
}
