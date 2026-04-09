'use client';

import { Brain, Database, ListChecks, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

const STEP_ICONS = [ListChecks, Brain, Database, Sparkles];
const STEP_COLORS = [palette.gold, palette.purple, palette.teal, palette.amber];

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
            background:
              'linear-gradient(180deg, rgba(245,197,24,0.3) 0%, rgba(255,159,28,0.1) 50%, transparent 100%)',
          }}
        />
        <div className="flex flex-col gap-6">
          {t.about.howItWorks.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            const color = STEP_COLORS[i];
            if (!Icon || !color) {
              if (process.env.NODE_ENV === 'development')
                console.warn('Missing icon or color for step:', step.title);
              return null;
            }
            const stepNum = String(i + 1).padStart(2, '0');
            return (
              <motion.div
                key={stepNum}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-5 items-start"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10"
                  style={{
                    background: `${color}18`,
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
                        color,
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
                  <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
