'use client';

import { Play, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

// Asymmetric 12-column grid: breaks identical card geometry while keeping group mode prominent
const COL_SPANS = [
  'md:col-span-7', // AI-Powered: wider — the "why"
  'md:col-span-5', // 5 Questions: narrower — the "how"
  'md:col-span-5', // Group Mode: narrower but featured — the "who"
  'md:col-span-7', // Instant Results: wider — the "outcome"
] as const;

export function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Sparkles,
      title: t.features.aiPowered.title,
      desc: t.features.aiPowered.desc,
      color: palette.gold,
      featured: false,
    },
    {
      icon: Play,
      title: t.features.fiveQuestions.title,
      desc: t.features.fiveQuestions.desc,
      color: palette.amber,
      featured: false,
    },
    {
      icon: Users,
      title: t.features.groupMode.title,
      desc: t.features.groupMode.desc,
      color: palette.purple,
      featured: true,
    },
    {
      icon: Zap,
      title: t.features.instantResults.title,
      desc: t.features.instantResults.desc,
      color: palette.teal,
      featured: false,
    },
  ];

  return (
    <section id="features" className="px-5 py-20 max-w-5xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14"
      >
        <h2
          className="mb-3"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.features.headline}
        </h2>
        <p style={{ color: 'var(--pc-t2)', fontSize: '1rem' }}>{t.features.subheadline}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`col-span-1 ${COL_SPANS[i]} rounded-2xl flex flex-col gap-4`}
            style={{
              padding: f.featured ? '2rem' : '1.5rem',
              background: f.featured ? `${f.color}0d` : 'var(--pc-surface)',
              border: `1px solid ${f.featured ? `${f.color}30` : 'var(--pc-bd1)'}`,
              transition: 'background 0.3s, border-color 0.3s',
            }}
          >
            <div
              className="rounded-xl flex items-center justify-center"
              style={{
                width: f.featured ? '3rem' : '2.5rem',
                height: f.featured ? '3rem' : '2.5rem',
                background: `${f.color}18`,
                color: f.color,
              }}
            >
              <f.icon size={f.featured ? 24 : 20} />
            </div>
            <div>
              <h3
                className="mb-1"
                style={{
                  color: 'var(--pc-t1)',
                  fontSize: f.featured ? '1.05rem' : '0.95rem',
                  fontWeight: 600,
                }}
              >
                {f.title}
              </h3>
              <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
            {f.featured && (
              <p className="mt-auto text-xs font-semibold" style={{ color: f.color }}>
                {t.features.groupMode.worksFor}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
