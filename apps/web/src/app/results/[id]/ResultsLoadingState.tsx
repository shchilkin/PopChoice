'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { FilmReel } from '@/app/loading/components/FilmReel';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

export function ResultsLoadingState({ status }: { status?: string }) {
  const { t } = useLanguage();
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((index) => (index + 1) % t.loading.tips.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [t.loading.tips.length]);

  useEffect(() => {
    const target = status === 'processing' ? 85 : 20;
    const interval = setInterval(() => {
      setProgress((value) => (value >= target ? target : value + 1));
    }, 80);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center max-w-sm w-full"
      >
        <div className="mb-10">
          <FilmReel />
        </div>

        <h2
          className="mb-2"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '2rem',
            letterSpacing: '0.06em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.loading.title}
        </h2>

        <div className="h-12 mb-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              style={{ color: 'var(--pc-t2)', fontSize: '0.88rem', lineHeight: 1.6 }}
            >
              {t.loading.tips[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="w-full max-w-xs">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--pc-bd2)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${palette.gold}, ${palette.amber})`,
                width: `${progress}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-2 text-right" style={{ color: 'var(--pc-t4)', fontSize: '0.72rem' }}>
            {status === 'processing' ? t.loading.title : ''}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
