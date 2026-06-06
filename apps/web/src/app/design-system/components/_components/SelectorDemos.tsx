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
  const styles = getGenreChipStyles({ color, selected });

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200"
      style={styles.button}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={styles.icon}
      >
        <Icon size={16} />
      </div>
      <span className="text-sm font-semibold" style={styles.label}>
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
  const styles = getToneCardStyles({ color, grad, selected });

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200"
      style={styles.button}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={styles.icon}>
        <Icon size={16} />
      </div>
      <div>
        <div className="text-sm font-semibold" style={styles.label}>
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
  const styles = getEraOptionStyles({ color, selected });

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 w-full"
      style={styles.button}
    >
      <div className="text-2xl">{emoji}</div>
      <div>
        <div className="font-semibold text-sm" style={styles.label}>
          {title}
        </div>
        <div className="text-xs" style={{ color: 'var(--pc-t3)' }}>
          {desc}
        </div>
      </div>
    </button>
  );
}

function getGenreChipStyles({ color, selected }: { color: string; selected: boolean }) {
  return {
    button: getSelectableButtonStyle({ borderAlpha: '50', color, selected }),
    icon: getSelectableIconStyle({ backgroundAlpha: '25', color, selected }),
    label: getSelectableLabelStyle({ color, selected }),
  };
}

function getToneCardStyles({
  color,
  grad,
  selected,
}: {
  color: string;
  grad: string;
  selected: boolean;
}) {
  return {
    button: {
      ...getSelectableButtonStyle({ borderAlpha: '50', color, selected, selectedBackground: grad }),
      boxShadow: selected ? `0 0 20px ${color}14` : 'none',
    },
    icon: getSelectableIconStyle({ backgroundAlpha: '20', color, selected }),
    label: getSelectableLabelStyle({ color, selected }),
  };
}

function getEraOptionStyles({ color, selected }: { color: string; selected: boolean }) {
  return {
    button: {
      ...getSelectableButtonStyle({ borderAlpha: '60', color, selected }),
      boxShadow: selected ? `0 0 20px ${color}18` : 'none',
    },
    label: getSelectableLabelStyle({ color, selected }),
  };
}

function getSelectableButtonStyle({
  borderAlpha,
  color,
  selected,
  selectedBackground,
}: {
  borderAlpha: '50' | '60';
  color: string;
  selected: boolean;
  selectedBackground?: string;
}) {
  return {
    background: selected ? (selectedBackground ?? `${color}18`) : 'var(--pc-surface)',
    border: selected ? `1.5px solid ${color}${borderAlpha}` : getInactiveBorder(borderAlpha),
  };
}

function getSelectableIconStyle({
  backgroundAlpha,
  color,
  selected,
}: {
  backgroundAlpha: '20' | '25';
  color: string;
  selected: boolean;
}) {
  return {
    background: selected ? `${color}${backgroundAlpha}` : 'var(--pc-ghost)',
    color: selected ? color : 'var(--pc-t3)',
  };
}

function getSelectableLabelStyle({ color, selected }: { color: string; selected: boolean }) {
  return { color: selected ? color : 'var(--pc-t1)' };
}

function getInactiveBorder(borderAlpha: '50' | '60') {
  return borderAlpha === '60' ? '1px solid var(--pc-bd2)' : '1px solid var(--pc-bd1)';
}
