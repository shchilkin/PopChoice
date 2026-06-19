'use client';

import { Brain, Database, ListChecks, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

const STEP_ICONS = [ListChecks, Brain, Database, Sparkles];
const STEP_COLORS = [palette.gold, palette.purple, palette.teal, palette.amber];
type HowItWorksStep = ReturnType<typeof useLanguage>['t']['about']['howItWorks']['steps'][number];

function getStepAccentTextColor(color: string) {
  return color === palette.purple ? '#A78BFA' : color;
}

function HowItWorksStepCard({ index, step }: { index: number; step: HowItWorksStep }) {
  const Icon = STEP_ICONS[index] ?? Sparkles;
  const color = STEP_COLORS[index] ?? palette.gold;
  const textColor = getStepAccentTextColor(color);
  const stepNum = String(index + 1).padStart(2, '0');

  return (
    <motion.div
      key={stepNum}
      initial={false}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex gap-5 items-start"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10"
        style={{
          background: `color-mix(in srgb, ${color} 12%, var(--pc-bg))`,
          border: `1px solid ${color}30`,
          color,
        }}
      >
        <Icon size={22} />
      </div>
      <div
        className="flex-1 p-5 rounded-2xl"
        style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span
            style={{
              color: textColor,
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.9rem',
            }}
          >
            {stepNum}
          </span>
          <h3 style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.95rem' }}>
            {step.title}
          </h3>
        </div>
        <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.7 }}>{step.desc}</p>
      </div>
    </motion.div>
  );
}

export function HowItWorksSection() {
  const { t } = useLanguage();

  return (
    <section className="mb-16">
      <h2
        className="mb-8"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: '1.6rem',
          letterSpacing: '0.05em',
          color: 'var(--pc-t1)',
        }}
      >
        {t.about.howItWorks.title}
      </h2>
      <div className="relative">
        <div
          className="absolute left-7 top-10 bottom-10 w-0.5 hidden sm:block"
          style={{
            background: `linear-gradient(180deg,
              ${palette.gold}80 0%,
              ${palette.purple}80 33%,
              ${palette.teal}80 66%,
              ${palette.amber}80 85%,
              transparent 100%
            )`,
          }}
        />
        <div className="flex flex-col gap-6">
          {t.about.howItWorks.steps.map((step, index) => (
            <HowItWorksStepCard key={step.title} index={index} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
