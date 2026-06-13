'use client';

import { Clock3, SlidersHorizontal, UsersRound } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import type { ElementType } from 'react';

const MODE_COLORS = [palette.gold, palette.teal, palette.purple] as const;
const MODE_ICONS = [Clock3, SlidersHorizontal, UsersRound] as const;

export function ModesSection() {
  const { t } = useLanguage();
  const modes = [t.landingModes.fastPick, t.landingModes.normalMatch, t.landingModes.duoGroup];

  return (
    <section className="px-5 py-14 sm:py-16 max-w-5xl mx-auto w-full">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:items-end">
        <div>
          <h2
            className="mb-3"
            style={{
              color: 'var(--pc-t1)',
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 600,
              letterSpacing: '0.04em',
              lineHeight: 1.05,
              textTransform: 'uppercase',
              textWrap: 'balance',
            }}
          >
            {t.landingModes.headline}
          </h2>
          <p style={{ color: 'var(--pc-t2)', lineHeight: 1.7, textWrap: 'pretty' }}>
            {t.landingModes.subheadline}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {modes.map((mode, index) => (
            <ModePanel
              key={mode.title}
              color={MODE_COLORS[index]}
              copy={mode}
              icon={MODE_ICONS[index]}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ModePanel({
  color,
  copy,
  icon,
  index,
}: {
  color: string;
  copy: { desc: string; title: string };
  icon: ElementType;
  index: number;
}) {
  const Icon = icon;
  const isFeatured = index === 1;

  return (
    <motion.article
      initial={false}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-xl p-5"
      style={{
        background: isFeatured ? `${color}12` : 'var(--pc-surface)',
        border: `1px solid ${isFeatured ? `${color}35` : 'var(--pc-bd1)'}`,
        minHeight: isFeatured ? '13rem' : '11rem',
      }}
    >
      <div
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={20} />
      </div>
      <h3 className="mb-2 text-base font-semibold" style={{ color: 'var(--pc-t1)' }}>
        {copy.title}
      </h3>
      <p style={{ color: 'var(--pc-t3)', fontSize: '0.86rem', lineHeight: 1.65 }}>{copy.desc}</p>
    </motion.article>
  );
}
