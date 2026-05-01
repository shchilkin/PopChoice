export function GenreChip({
  icon: Icon,
  label,
  color,
  selected,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200"
      style={{
        background: selected ? `${color}18` : 'var(--pc-surface)',
        border: selected ? `1.5px solid ${color}50` : '1px solid var(--pc-bd1)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: selected ? `${color}25` : 'var(--pc-ghost)',
          color: selected ? color : 'var(--pc-t3)',
        }}
      >
        <Icon size={16} />
      </div>
      <span className="text-sm font-semibold" style={{ color: selected ? color : 'var(--pc-t1)' }}>
        {label}
      </span>
    </button>
  );
}

export function ToneCard({
  icon: Icon,
  label,
  desc,
  color,
  grad,
  selected,
  onSelect,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  grad: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200"
      style={{
        background: selected ? grad : 'var(--pc-surface)',
        border: selected ? `1.5px solid ${color}50` : '1px solid var(--pc-bd1)',
        boxShadow: selected ? `0 0 20px ${color}14` : 'none',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{
          background: selected ? `${color}20` : 'var(--pc-ghost)',
          color: selected ? color : 'var(--pc-t3)',
        }}
      >
        <Icon size={16} />
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: selected ? color : 'var(--pc-t1)' }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--pc-t3)' }}>
          {desc}
        </div>
      </div>
    </button>
  );
}

export function EraOption({
  emoji,
  title,
  desc,
  color,
  selected,
  onSelect,
}: {
  emoji: string;
  title: string;
  desc: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 w-full"
      style={{
        background: selected ? `${color}18` : 'var(--pc-surface)',
        border: selected ? `1.5px solid ${color}60` : '1px solid var(--pc-bd2)',
        boxShadow: selected ? `0 0 20px ${color}18` : 'none',
      }}
    >
      <div className="text-2xl">{emoji}</div>
      <div>
        <div className="font-semibold text-sm" style={{ color: selected ? color : 'var(--pc-t1)' }}>
          {title}
        </div>
        <div className="text-xs" style={{ color: 'var(--pc-t3)' }}>
          {desc}
        </div>
      </div>
    </button>
  );
}
