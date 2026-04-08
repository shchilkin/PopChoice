export function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-300 rounded-full"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background:
              i < current
                ? 'rgba(245,197,24,0.5)'
                : i === current
                  ? 'linear-gradient(90deg, #F5C518, #FF9F1C)'
                  : 'var(--pc-bd2)',
          }}
        />
      ))}
    </div>
  );
}
