'use client';

import { GitBranch, Globe, Play } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { TMDBAttribution } from '@/components';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { HowItWorksSection } from './components/HowItWorksSection';
import { TechStackSection } from './components/TechStackSection';

export default function AboutPage() {
  const { isDark } = usePCTheme();
  const { t } = useLanguage();

  return (
    <div className="px-5 py-12 max-w-3xl mx-auto w-full">
      {/* Why — origin story */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-16"
      >
        <p
          className="mb-3"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            color: 'var(--pc-t3)',
          }}
        >
          Why this exists
        </p>
        <h1
          className="mb-5"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(2rem, 6vw, 3.2rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          {t.about.title}
        </h1>
        <p
          className="mb-6 max-w-xl"
          style={{ color: 'var(--pc-t2)', lineHeight: 1.75, fontSize: '0.95rem' }}
        >
          Started as a Scrimba AI engineering course project. After finishing the course I kept
          building — turning it into a real full-stack system to learn the parts that tutorials
          skip: vector databases, background job pipelines, monorepo tooling, and containerized
          deployments. The movie recommendations are real.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://github.com/shchilkin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-opacity duration-150 hover:opacity-70"
            style={{
              background: 'var(--pc-surface)',
              border: '1px solid var(--pc-bd1)',
              color: 'var(--pc-t2)',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            <GitBranch size={15} />
            github.com/shchilkin
          </a>
          <a
            href="https://shchilkin.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-opacity duration-150 hover:opacity-70"
            style={{
              background: 'var(--pc-surface)',
              border: '1px solid var(--pc-bd1)',
              color: 'var(--pc-t2)',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            <Globe size={15} />
            shchilkin.dev
          </a>
        </div>
      </motion.div>

      {/* What — product explanation */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="mb-16"
      >
        <p
          className="mb-3"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            color: 'var(--pc-t3)',
          }}
        >
          What it does
        </p>
        <div
          style={{
            borderTop: '1px solid var(--pc-bd1)',
            paddingTop: '1.25rem',
          }}
        >
          <p
            className="max-w-2xl"
            style={{ color: 'var(--pc-t2)', lineHeight: 1.8, fontSize: '0.95rem' }}
          >
            PopChoice takes a 5-question taste quiz — favorite film, preferred era, current mood,
            tone, and a favorite actor — and transforms your answers into a vector embedding using
            the OpenAI API. That embedding is compared against a curated library of 400+
            pre-analyzed films stored in PostgreSQL with the pgvector extension. If the local
            collection doesn't yield a high-quality match, the system automatically falls back to a
            broader search across the TMDb database. The closest matches surface as recommendations,
            each with a GPT-generated explanation of why it fits your specific taste profile. Genre
            is just one dimension; the system captures cinematographic style, narrative complexity,
            and emotional tone.
          </p>
        </div>
      </motion.section>

      {/* How — technical pipeline */}
      <HowItWorksSection />

      {/* Stack — tools and rationale */}
      <TechStackSection />

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
        style={{ color: 'var(--pc-t3)', fontSize: '0.875rem', letterSpacing: '0.01em' }}
      >
        All of this runs in the background. What you see: a 60-second quiz and a film worth
        watching.
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center p-8 rounded-3xl mb-8"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${palette.gold}14 0%, ${palette.amber}08 100%)`
            : `linear-gradient(135deg, rgba(196,149,10,0.07) 0%, rgba(255,159,28,0.03) 100%)`,
          border: '1px solid',
          borderColor: 'var(--pc-ai-bd)',
        }}
      >
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
        <p className="mb-6" style={{ color: 'var(--pc-t2)', fontSize: '0.88rem' }}>
          {t.about.ctaSubtitle}
        </p>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl transition-all duration-200 hover:opacity-90 active:scale-95"
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

      <TMDBAttribution />
    </div>
  );
}
