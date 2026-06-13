type TechStackGroupLabelProps = {
  children: string;
  className?: string;
};

export function TechStackGroupLabel({ children, className = 'mb-3' }: TechStackGroupLabelProps) {
  return (
    <p
      className={className}
      style={{
        fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
        fontWeight: '600',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.12em',
        color: 'var(--pc-t3)',
      }}
    >
      {children}
    </p>
  );
}
