'use client';

import { ChevronRight } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

interface AudienceChoiceButtonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconBackground: string;
  iconColor: string;
  hoverBorderColor: string;
  onClick: () => void;
}

export function AudienceChoiceButton({
  title,
  description,
  icon: Icon,
  iconBackground,
  iconColor,
  hoverBorderColor,
  onClick,
}: AudienceChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-5 rounded-2xl p-5 text-left transition-all duration-200 active:scale-[0.98]"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = hoverBorderColor;
        event.currentTarget.style.background = 'var(--pc-surface-hover)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'var(--pc-bd2)';
        event.currentTarget.style.background = 'var(--pc-surface)';
      }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: iconBackground, color: iconColor }}
      >
        <Icon size={22} />
      </span>
      <span className="flex-1">
        <span className="block" style={{ color: 'var(--pc-t1)', fontWeight: 600 }}>
          {title}
        </span>
        <span className="block" style={{ color: 'var(--pc-t4)', fontSize: '0.85rem' }}>
          {description}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0" style={{ color: 'var(--pc-t4)' }} />
    </button>
  );
}
