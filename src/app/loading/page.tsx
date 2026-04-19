'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { palette } from '@/styles/designTokens';

import { FilmReel } from './components/FilmReel';

const MAX_RETRIES = 3;

export default function LoadingPage() {
  const router = useRouter();
  const { isDark } = usePCTheme();
  const { t, locale } = useLanguage();
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorState, setErrorState] = useState<'retryable' | 'fatal' | 'moderated' | null>(null);
  const retryCount = useRef(0);
  const intervalsRef = useRef<{
    tip?: ReturnType<typeof setInterval>;
    prog?: ReturnType<typeof setInterval>;
  }>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const callApi = useCallback(() => {
    const quizDataStr = localStorage.getItem('popchoice_quiz_data');
    if (!quizDataStr) {
      router.replace('/quiz');
      return;
    }

    // Abort any in-flight request before starting a new one.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Clear previous intervals before creating new ones.
    clearInterval(intervalsRef.current.tip);
    clearInterval(intervalsRef.current.prog);

    setErrorState(null);
    setProgress(0);

    // Capture interval IDs locally so each invocation only clears its own timers.
    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % t.loading.tips.length);
    }, 1400);
    const progInterval = setInterval(() => {
      setProgress((p) => (p >= 85 ? 85 : p + 1));
    }, 60);
    intervalsRef.current.tip = tipInterval;
    intervalsRef.current.prog = progInterval;

    fetch('/api/movie-recommendation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        'X-CSRF-Token': getCsrfToken(),
      },
      body: quizDataStr,
      signal: controller.signal,
    })
      .then(async (response) => {
        clearInterval(tipInterval);
        clearInterval(progInterval);
        if (response.status === 422) {
          setErrorState('moderated');
          return;
        }
        if (!response.ok) {
          retryCount.current += 1;
          setErrorState(retryCount.current >= MAX_RETRIES ? 'fatal' : 'retryable');
          return;
        }
        const data = await response.json();
        localStorage.setItem('popchoice_recommendation', JSON.stringify(data));
        // Keep popchoice_quiz_data alive — the results page needs it for 'Get more picks from TMDB'.
        // It is cleaned up when the user clicks 'Try Again'.
        setProgress(100);
        setTimeout(() => router.push('/results'), 400);
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        clearInterval(tipInterval);
        clearInterval(progInterval);
        // eslint-disable-next-line no-console
        console.error('API error:', err);
        retryCount.current += 1;
        setErrorState(retryCount.current >= MAX_RETRIES ? 'fatal' : 'retryable');
      });
  }, [router, t.loading.tips.length, locale]);

  useEffect(() => {
    callApi();
    const intervals = intervalsRef.current;
    return () => {
      clearInterval(intervals.tip);
      clearInterval(intervals.prog);
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-[80vh]">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(245,197,24,0.05) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(196,149,10,0.06) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center max-w-sm w-full"
      >
        <div
          className="mb-10"
          style={{ opacity: errorState ? 0.35 : 1, transition: 'opacity 0.4s' }}
        >
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
          {errorState ? t.loading.errorTitle : t.loading.title}
        </h2>

        <div className="h-12 mb-8 flex items-center justify-center">
          {!errorState && (
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
          )}
        </div>

        {/* Progress bar */}
        {!errorState && (
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
              {progress}%
            </p>
          </div>
        )}

        {/* Retryable error */}
        {errorState === 'retryable' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <p style={{ color: palette.red, fontSize: '0.88rem', lineHeight: 1.6 }}>
              {t.loading.retryableError}
            </p>
            <button
              onClick={callApi}
              className="w-full py-3 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)', fontWeight: 700 }}
            >
              {t.loading.tryAgain}
            </button>
            <button
              onClick={() => router.push('/quiz')}
              className="text-sm"
              style={{ color: 'var(--pc-t3)' }}
            >
              {t.loading.backToQuiz}
            </button>
          </motion.div>
        )}

        {/* Moderated error */}
        {errorState === 'moderated' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <p
              style={{
                color: palette.red,
                fontSize: '0.88rem',
                lineHeight: 1.6,
                textAlign: 'center',
              }}
            >
              {t.loading.moderatedError}
            </p>
            <button
              onClick={() => router.push('/quiz')}
              className="w-full py-3 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)', fontWeight: 700 }}
            >
              {t.loading.backToQuiz}
            </button>
          </motion.div>
        )}

        {/* Fatal error */}
        {errorState === 'fatal' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <p style={{ color: palette.red, fontSize: '0.88rem', lineHeight: 1.6 }}>
              {t.loading.fatalError}
            </p>
            <p style={{ color: 'var(--pc-t3)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              {t.loading.savedAnswers}
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)', fontWeight: 700 }}
            >
              {t.loading.goHome}
            </button>
          </motion.div>
        )}

        {/* Fun fact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="mt-10 p-4 rounded-xl max-w-xs"
          style={{
            background: 'var(--pc-ai-bg)',
            border: '1px solid',
            borderColor: 'var(--pc-ai-bd)',
          }}
        >
          <p
            style={{
              color: 'var(--pc-t2)',
              fontSize: '0.78rem',
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: 'var(--pc-gold-text)' }}>{t.loading.funFact}</span>{' '}
            {t.loading.funFactText.split('{time}').map((part, i, arr) =>
              i < arr.length - 1 ? (
                <span key={i}>
                  {part}
                  <span style={{ color: 'var(--pc-t1)' }}>{t.loading.funFactTime}</span>
                </span>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
