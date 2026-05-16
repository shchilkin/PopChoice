'use client';

import { Play } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Breadcrumbs, TMDBAttribution } from '@/components';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { createFreshQuizHref } from '@/lib/quizNavigation';
import { palette } from '@/styles/designTokens';

import { FAQSection } from './components/FAQSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { TechStackSection } from './components/TechStackSection';

export default function AboutPage() {
  const router = useRouter();
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
        <Breadcrumbs className="mb-3" items={[{ label: t.techStackPage.breadcrumbAbout }]} />
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
          {t.about.originDescription}
        </p>
        <p style={{ color: 'var(--pc-t3)', fontSize: '0.875rem' }}>
          {t.about.sourceCode}{' '}
          <a
            href="https://github.com/shchilkin/PopChoice"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity duration-150"
            style={{ color: 'var(--pc-gold-text)', textDecoration: 'underline' }}
          >
            {t.about.sourceCodeLink}
          </a>
          .
        </p>
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
          {t.about.whatItDoesLabel}
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
            {t.about.whatItDoesDescription}
          </p>
        </div>
      </motion.section>

      {/* How — technical pipeline */}
      <HowItWorksSection />

      {/* Stack — tools and rationale */}
      <TechStackSection />

      {/* FAQ */}
      <FAQSection />

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
        style={{ color: 'var(--pc-t3)', fontSize: '0.875rem', letterSpacing: '0.01em' }}
      >
        {t.about.backgroundNote}
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
          onClick={(event) => {
            event.preventDefault();
            router.push(createFreshQuizHref());
          }}
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
