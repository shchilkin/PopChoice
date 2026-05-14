'use client';

import { motion } from 'motion/react';

import { FilmReel } from '@/app/loading/components/FilmReel';
import { useLanguage } from '@/i18n';

interface QuizSubmittingStateProps {
  mode?: 'solo' | 'group';
  peopleCount?: number;
}

export function QuizSubmittingState({ mode = 'solo', peopleCount = 1 }: QuizSubmittingStateProps) {
  const { t } = useLanguage();
  const isGroup = mode === 'group' && peopleCount > 1;
  const copy = isGroup
    ? {
        eyebrow: t.loading.groupSubmitBridgeEyebrow.replace('{count}', String(peopleCount)),
        title: t.loading.groupSubmitBridgeTitle,
        body: t.loading.groupSubmitBridgeBody,
      }
    : {
        eyebrow: t.loading.submitBridgeEyebrow,
        title: t.loading.submitBridgeTitle,
        body: t.loading.submitBridgeBody,
      };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center text-center max-w-sm w-full"
      >
        <div className="mb-8">
          <FilmReel />
        </div>

        <p
          className="mb-3"
          style={{
            color: 'var(--pc-gold-text)',
            fontSize: '0.72rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {copy.eyebrow}
        </p>

        <h2
          className="mb-3"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '2rem',
            letterSpacing: '0.06em',
            color: 'var(--pc-t1)',
          }}
        >
          {copy.title}
        </h2>

        <p style={{ color: 'var(--pc-t2)', fontSize: '0.92rem', lineHeight: 1.6 }}>{copy.body}</p>
      </motion.div>
    </div>
  );
}
