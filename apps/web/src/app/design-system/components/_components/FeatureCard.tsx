export function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div
      className="p-6 rounded-2xl flex flex-col gap-4"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={20} />
      </div>
      <div>
        <div className="font-bold text-sm mb-1" style={{ color: 'var(--pc-t1)' }}>
          {title}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--pc-t3)' }}>
          {desc}
        </div>
      </div>
    </div>
  );
}
