'use client';

import { Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { Mascot } from '@/components/Mascot';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { createFreshQuizHref } from '@/lib/quizNavigation';

// Loaded client-side only so Math.random() does not cause hydration mismatches
const FilmParticles = dynamic(() => import('./FilmParticles'), { ssr: false });

// Poster grid is client-only: localStorage cache + TMDB fetch happen post-hydration
const PosterBackground = dynamic(
  () => import('./PosterBackground').then((m) => m.PosterBackground),
  { ssr: false },
);

export function HeroSection() {
  const router = useRouter();
  const { isDark } = usePCTheme();
  const { t } = useLanguage();

  const heroOverlay = isDark
    ? 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,197,24,0.06) 0%, transparent 70%), linear-gradient(180deg, #09090F 0%, rgba(9,9,15,0.58) 30%, rgba(9,9,15,0.78) 70%, #09090F 100%)'
    : 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,149,10,0.06) 0%, transparent 70%), linear-gradient(180deg, #F7F5EE 0%, rgba(247,245,238,0.72) 30%, rgba(247,245,238,0.86) 70%, #F7F5EE 100%)';

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-5 overflow-hidden">
      {/* Poster background grid + overlay */}
      <PosterBackground />

      {/* Theme-aware gradient: gold tint at center, page colour fade at top/bottom */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: heroOverlay }} />

      <FilmParticles />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs uppercase tracking-widest"
          style={{
            background: 'var(--pc-gold-subtle)',
            border: '1px solid',
            borderColor: 'var(--pc-gold-bd-subtle)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <Sparkles size={11} />
          {t.hero.badge}
        </motion.div>

        {/* Mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <Mascot width={130} height={130} />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-3 tracking-tight"
        >
          <span
            className="pc-gradient-text"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: 'clamp(3.5rem, 10vw, 6rem)',
              lineHeight: 1,
              letterSpacing: '0.04em',
            }}
          >
            PopChoice
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-10 max-w-lg"
          style={{
            color: isDark ? 'var(--pc-t2)' : 'var(--pc-t1)',
            fontSize: '1.1rem',
            lineHeight: 1.7,
          }}
        >
          {t.hero.descriptionPre}{' '}
          <span style={{ color: 'var(--pc-gold-text)' }}>{t.hero.perfectMovie}</span>{' '}
          {t.hero.descriptionPost}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={() => router.push(createFreshQuizHref())}
            className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 active:scale-95"
            style={{
              background: 'var(--pc-cta)',
              color: 'var(--pc-cta-text)',
              fontSize: '1.05rem',
              boxShadow: 'var(--pc-cta-shadow)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--pc-cta-shadow-hover)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--pc-cta-shadow)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <Play size={18} className="fill-current" />
            <span style={{ fontWeight: 700 }}>{t.hero.findMyMovie}</span>
          </button>

          <button
            onClick={() => {
              const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              document
                .getElementById('how-it-works')
                ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
            }}
            className="px-6 py-4 rounded-2xl text-sm transition-all duration-200"
            style={{
              color: 'var(--pc-t2)',
              border: '1px solid var(--pc-bd2)',
              background: 'var(--pc-ghost)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--pc-t1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--pc-bd4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--pc-t2)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--pc-bd2)';
            }}
          >
            {t.hero.howItWorks}
          </button>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-6 text-xs"
          style={{ color: isDark ? 'var(--pc-t4)' : 'var(--pc-t2)' }}
        >
          {t.hero.noSignup}
        </motion.p>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ delay: 1.2, duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{ color: 'var(--pc-t4)' }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 14l-5-5h10l-5 5z" />
        </svg>
      </motion.div>
    </section>
  );
}
