// Shared layout helpers for style-guide pages.
// Keep these server-compatible (no client hooks).

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2
        className="mb-6 text-xs font-bold uppercase tracking-[0.2em]"
        style={{ color: 'var(--pc-gold)', fontFamily: "var(--font-oswald), 'Oswald', sans-serif" }}
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
