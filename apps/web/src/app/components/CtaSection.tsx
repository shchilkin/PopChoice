'use client';

import { Play } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

import { Mascot } from '@/components/Mascot';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';

const POPCORN_IMG =
  'https://images.unsplash.com/photo-1770597105062-648a2fbfa052?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3Bjb3JuJTIwYnVja2V0JTIwbW92aWUlMjBuaWdodHxlbnwxfHx8fDE3NzQ4OTQzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080';

export function CtaSection() {
  const { isDark } = usePCTheme();
  const { t } = useLanguage();

  const sectionFadeGrad =
    'linear-gradient(180deg, var(--pc-bg) 0%, transparent 30%, transparent 70%, var(--pc-bg) 100%)';

  return (
    <section className="relative overflow-hidden py-20 px-5">
      <div className="absolute inset-0">
        <Image
          src={POPCORN_IMG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          style={{ opacity: isDark ? 0.12 : 0.07 }}
        />
        <div className="absolute inset-0" style={{ background: sectionFadeGrad }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative z-10 text-center max-w-xl mx-auto"
      >
        <div className="mb-6 flex justify-center">
          <Mascot width={80} height={80} />
        </div>
        <h2
          className="mb-4"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            letterSpacing: '0.04em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.cta.headline}
        </h2>
        <p className="mb-8" style={{ color: 'var(--pc-t2)', lineHeight: 1.7 }}>
          {t.cta.description}
        </p>
        <button
          onClick={navigateToFreshQuiz}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: 'var(--pc-cta-text)',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          <Play size={16} className="fill-current" />
          {t.cta.button}
        </button>
      </motion.div>
    </section>
  );
}
