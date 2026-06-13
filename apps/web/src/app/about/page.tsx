'use client';

import { Play } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { Breadcrumbs, TMDBAttribution } from '@/components';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';
import { palette } from '@/styles/designTokens';

import { FAQSection } from './components/FAQSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { TechStackSection } from './components/TechStackSection';

export default function AboutPage() {
  const { isDark } = usePCTheme();
  const { t } = useLanguage();

  return (
    <div className="px-5 py-12 max-w-3xl mx-auto w-full">
      {/* Why: product promise */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-14"
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
          className="mb-6 max-w-2xl"
          style={{ color: 'var(--pc-t2)', lineHeight: 1.75, fontSize: '0.95rem' }}
        >
          {t.about.introDescription}
        </p>
        <Link
          href="/quiz"
          onClick={(event) => {
            event.preventDefault();
            navigateToFreshQuiz();
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: 'var(--pc-cta-text)',
            fontWeight: 700,
            fontSize: '0.92rem',
          }}
        >
          <Play size={15} className="fill-current" />
          {t.about.primaryCta}
        </Link>
      </motion.div>

      {/* What — product explanation */}
      <motion.section
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="mb-16"
      >
        <h2
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
        </h2>
        <div
          style={{
            borderTop: '1px solid var(--pc-bd1)',
            paddingTop: '1.25rem',
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {t.about.whatItDoesItems.map((item) => (
              <div key={item.title}>
                <h3
                  className="mb-2"
                  style={{ color: 'var(--pc-t1)', fontWeight: 700, fontSize: '0.94rem' }}
                >
                  {item.title}
                </h3>
                <p style={{ color: 'var(--pc-t3)', lineHeight: 1.7, fontSize: '0.84rem' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How: technical pipeline */}
      <HowItWorksSection />

      {/* Why: origin story */}
      <motion.section
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="mb-16"
      >
        <h2
          className="mb-4"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '1.45rem',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.about.builderNoteTitle}
        </h2>
        <p
          className="mb-5 max-w-2xl"
          style={{ color: 'var(--pc-t2)', lineHeight: 1.75, fontSize: '0.92rem' }}
        >
          {t.about.builderNoteDescription}
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
      </motion.section>

      {/* Stack: tools and rationale */}
      <TechStackSection />

      {/* FAQ */}
      <FAQSection />

      <motion.p
        initial={false}
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
        initial={false}
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
            navigateToFreshQuiz();
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
