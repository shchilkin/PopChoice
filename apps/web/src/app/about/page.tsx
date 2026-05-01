'use client';

import { Brain, Play } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { TMDBAttribution } from '@/components';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { FAQSection } from './components/FAQSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { TechStackSection } from './components/TechStackSection';

export default function AboutPage() {
  const { isDark } = usePCTheme();
  const { t } = useLanguage();

  return (
    <div className="px-5 py-12 max-w-3xl mx-auto w-full">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-5 uppercase tracking-widest"
          style={{
            background: `${palette.purple}1f`,
            border: `1px solid ${palette.purple}40`,
            color: palette.purpleLight,
          }}
        >
          <Brain size={11} />
          {t.about.badge}
        </div>
        <h1
          className="mb-4"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          {t.about.title}
        </h1>
        <p
          className="max-w-lg mx-auto"
          style={{ color: 'var(--pc-t2)', lineHeight: 1.75, fontSize: '0.95rem' }}
        >
          {t.about.descriptionPre} <span style={{ color: 'var(--pc-t1)' }}>{t.about.you}</span>{' '}
          {t.about.descriptionPost}
        </p>
      </motion.div>

      <HowItWorksSection />
      <TechStackSection />
      <FAQSection />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center p-8 rounded-3xl mb-8"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${palette.gold}14 0%, ${palette.purple}14 100%)`
            : `linear-gradient(135deg, rgba(196,149,10,0.07) 0%, ${palette.purple}12 100%)`,
          border: '1px solid',
          borderColor: 'var(--pc-ai-bd)',
        }}
      >
        <div className="text-4xl mb-4">🍿</div>
        <h3
          className="mb-2"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '1.8rem',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.about.ctaTitle}
        </h3>
        <p className="mb-6" style={{ color: 'var(--pc-t3)', fontSize: '0.88rem' }}>
          {t.about.ctaSubtitle}
        </p>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: 'var(--pc-cta-text)',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          <Play size={16} className="fill-current" />
          {t.about.ctaButton}
        </Link>
      </motion.div>

      {/* TMDB Attribution */}
      <TMDBAttribution />
    </div>
  );
}
