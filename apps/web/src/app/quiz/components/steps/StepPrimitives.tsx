'use client';

import { Check } from 'lucide-react';

import type { ReactNode } from 'react';

type StepHeaderProps = {
  accentBackground: string;
  accentColor: string;
  icon: ReactNode;
  subtitle?: string;
  title: string;
};

type SelectableOptionButtonProps = {
  children: ReactNode;
  color: string;
  disabled?: boolean;
  layout?: 'row' | 'stack' | 'large-row';
  onClick: () => void;
  selected: boolean;
  selectedBackground?: string;
  selectedBorderAlpha?: '50' | '60';
  selectedShadow?: string;
};

type SelectionMarkProps = {
  color: string;
};

type SelectableLayout = 'row' | 'stack' | 'large-row';
type SelectableStyleOptions = {
  color: string;
  disabled: boolean;
  layout: SelectableLayout;
  selected: boolean;
  selectedBackground?: string;
  selectedBorderAlpha: '50' | '60';
  selectedShadow?: string;
};

const SELECTABLE_CLASS_BY_LAYOUT: Record<SelectableLayout, string> = {
  'large-row':
    'flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98]',
  row: 'flex items-center gap-3 rounded-xl p-3.5 text-left transition-all duration-200 active:scale-[0.97]',
  stack:
    'flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.97]',
};

const INACTIVE_BORDER_BY_LAYOUT: Record<SelectableLayout, string> = {
  'large-row': '1px solid var(--pc-bd2)',
  row: '1px solid var(--pc-bd1)',
  stack: '1px solid var(--pc-bd1)',
};

export function StepHeader({
  accentBackground,
  accentColor,
  icon,
  subtitle,
  title,
}: StepHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: accentBackground, color: accentColor }}
      >
        {icon}
      </div>
      <div>
        <h2
          style={{
            color: 'var(--pc-t1)',
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontSize: '1.8rem',
            fontWeight: '600',
            letterSpacing: '0.04em',
            lineHeight: 1.1,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.82rem', marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function SelectableOptionButton({
  children,
  color,
  disabled = false,
  layout = 'row',
  onClick,
  selected,
  selectedBackground,
  selectedBorderAlpha = '50',
  selectedShadow,
}: SelectableOptionButtonProps) {
  const presentation = getSelectableOptionPresentation({
    color,
    disabled,
    layout,
    selected,
    selectedBackground,
    selectedBorderAlpha,
    selectedShadow,
  });

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={presentation.className}
      style={presentation.style}
    >
      {children}
    </button>
  );
}

export function OptionIcon({
  children,
  color,
  selected,
  size = 'md',
}: {
  children: ReactNode;
  color: string;
  selected: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const className = {
    sm: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
    md: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
    lg: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
  }[size];

  return (
    <span
      className={className}
      style={{
        background: selected ? `${color}25` : 'var(--pc-ghost)',
        color: selected ? color : 'var(--pc-t3)',
      }}
    >
      {children}
    </span>
  );
}

export function SelectionMark({ color }: SelectionMarkProps) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ background: color }}
    >
      <Check size={12} style={{ color: 'var(--pc-cta-text)' }} />
    </span>
  );
}

function getSelectableOptionPresentation({
  color,
  disabled,
  layout,
  selected,
  selectedBackground,
  selectedBorderAlpha,
  selectedShadow,
}: SelectableStyleOptions) {
  return {
    className: SELECTABLE_CLASS_BY_LAYOUT[layout],
    style: getSelectableOptionStyle({
      color,
      disabled,
      layout,
      selected,
      selectedBackground,
      selectedBorderAlpha,
      selectedShadow,
    }),
  };
}

function getSelectableOptionStyle(options: SelectableStyleOptions) {
  return {
    background: getSelectableBackground(options),
    border: getSelectableBorder(options),
    boxShadow: getSelectableShadow(options),
    cursor: getSelectableCursor(options.disabled),
    opacity: getSelectableOpacity(options.disabled),
  };
}

function getSelectableBackground({ color, selected, selectedBackground }: SelectableStyleOptions) {
  if (!selected) {
    return 'var(--pc-surface)';
  }

  return selectedBackground ?? `${color}18`;
}

function getSelectableBorder({
  color,
  layout,
  selected,
  selectedBorderAlpha,
}: SelectableStyleOptions) {
  if (!selected) {
    return INACTIVE_BORDER_BY_LAYOUT[layout];
  }

  return `1.5px solid ${color}${selectedBorderAlpha}`;
}

function getSelectableShadow({ selected, selectedShadow }: SelectableStyleOptions) {
  if (!selected) {
    return 'none';
  }

  return selectedShadow ?? 'none';
}

function getSelectableCursor(disabled: boolean) {
  return disabled ? 'not-allowed' : 'pointer';
}

function getSelectableOpacity(disabled: boolean) {
  return disabled ? 0.45 : 1;
}
