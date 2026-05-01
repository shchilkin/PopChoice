'use client';

import { Play, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

export function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Sparkles,
      title: t.features.aiPowered.title,
      desc: t.features.aiPowered.desc,
      color: palette.gold,
    },
    {
      icon: Play,
      title: t.features.fiveQuestions.title,
      desc: t.features.fiveQuestions.desc,
      color: palette.amber,
    },
    {
      icon: Users,
      title: t.features.groupMode.title,
      desc: t.features.groupMode.desc,
      color: palette.purple,
    },
    {
      icon: Zap,
      title: t.features.instantResults.title,
      desc: t.features.instantResults.desc,
      color: palette.teal,
    },
  ];
  return (
    <section className="px-5 py-20 max-w-5xl mx-auto w-full">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="p-6 rounded-2xl flex flex-col gap-4"
            style={{
              background: 'var(--pc-surface)',
              border: '1px solid var(--pc-bd1)',
              transition: 'background 0.3s, border-color 0.3s',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${f.color}18`, color: f.color }}
            >
              <f.icon size={20} />
            </div>
            <div>
              <h3
                className="mb-1"
                style={{ color: 'var(--pc-t1)', fontSize: '0.95rem', fontWeight: 600 }}
              >
                {f.title}
              </h3>
              <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
