import { Sparkles } from 'lucide-react';

import { palette } from '@/styles/designTokens';

export function StyledInput({ placeholder, label }: { placeholder: string; label?: string }) {
  const inputId = label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--pc-t3)' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        placeholder={placeholder}
        className="w-full rounded-xl border border-(--pc-bd2) bg-(--pc-bg) px-4 py-3 text-sm text-(--pc-t1) outline-none transition-all duration-200 focus-visible:border-(--pc-gold-bd) focus-visible:shadow-(--pc-gold-ring)"
      />
    </div>
  );
}

export function NumberBadge({ n }: { n: number }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: `${palette.purple}33`, color: palette.purpleLight }}
    >
      {n}
    </div>
  );
}

export function AlertBanner({
  type,
  children,
}: {
  type: 'info' | 'warning' | 'error';
  children: React.ReactNode;
}) {
  const styles = {
    info: { bg: `${palette.blue}15`, bd: `${palette.blue}35`, color: palette.blue },
    warning: {
      bg: `${palette.gold}12`,
      bd: 'var(--pc-gold-bd-subtle)',
      color: 'var(--pc-gold-text)',
    },
    error: { bg: `${palette.red}12`, bd: `${palette.red}35`, color: palette.red },
  }[type];

  return (
    <div
      className="px-4 py-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: `1px solid ${styles.bd}`, color: styles.color }}
    >
      {children}
    </div>
  );
}

export function AIBlock({
  children,
  label = 'AI Pick',
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      className="px-5 py-4 rounded-xl text-sm leading-relaxed"
      style={{
        background: 'var(--pc-ai-bg)',
        border: '1px solid var(--pc-ai-bd)',
        color: 'var(--pc-t2)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} style={{ color: 'var(--pc-gold)' }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--pc-gold-text)' }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
