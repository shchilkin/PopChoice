'use client';

import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';

interface BetweenPersonsProps {
  currentPersonName: string;
  nextPersonName: string;
  onNext: () => void;
}

export function BetweenPersons({ currentPersonName, nextPersonName, onNext }: BetweenPersonsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="text-center max-w-sm"
      >
        <div className="text-5xl mb-5">🎬</div>
        <h2
          className="mb-2"
          style={{
            fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.quiz.between.turnDone.replace('{name}', currentPersonName)}
        </h2>
        <p className="mb-8" style={{ color: 'var(--pc-t2)' }}>
          {t.quiz.between.nowIts.split('{name}').map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>
                {part}
                <span style={{ color: 'var(--pc-gold)', fontWeight: 600 }}>{nextPersonName}</span>
              </span>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </p>
        <button
          onClick={onNext}
          className="px-8 py-3.5 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: 'var(--pc-cta-text)',
            fontWeight: 700,
            fontSize: '1rem',
          }}
        >
          {t.quiz.between.ready.replace('{name}', nextPersonName)}
        </button>
      </motion.div>
    </div>
  );
}
