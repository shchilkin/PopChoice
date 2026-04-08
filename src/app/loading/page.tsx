'use client';

import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_RETRIES = 3;

import { usePCTheme } from '@/hooks/usePCTheme';

const TIPS = [
  'Analyzing your taste profile with vector embeddings… 🧠',
  'Cross-referencing 10,000+ films in our database… 🎬',
  'Matching vibes, not just genres… ✨',
  'Filtering out movies your friends already spoiled… 🤫',
  'Calculating the perfect runtime for your evening… ⏱️',
  'Consulting the AI film sommelier… 🍷',
  'Almost there — your perfect pick is loading… 🍿',
];

const KERNEL_COUNT = 8;

function PopcornKernel({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * 360;
  const radius = 52;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  const delay = (index / total) * 1.2;

  return (
    <motion.div
      className="absolute"
      style={{
        left: '50%',
        top: '50%',
        marginLeft: x - 10,
        marginTop: y - 10,
        width: 20,
        height: 20,
      }}
      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.2, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="10" cy="10" rx="9" ry="7" fill="#F5C518" opacity="0.9" />
        <ellipse cx="7" cy="7" rx="5" ry="4" fill="#FFF0A0" opacity="0.8" />
        <ellipse cx="13" cy="12" rx="4" ry="3" fill="#FFD700" opacity="0.6" />
      </svg>
    </motion.div>
  );
}

function FilmReel() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: '3px solid rgba(245,197,24,0.15)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{ border: '2px solid rgba(245,197,24,0.1)' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      {Array.from({ length: KERNEL_COUNT }).map((_, i) => (
        <PopcornKernel key={i} index={i} total={KERNEL_COUNT} />
      ))}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: '2.2rem' }}
      >
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          🎬
        </motion.span>
      </div>
    </div>
  );
}

export default function LoadingPage() {
  const router = useRouter();
  const { isDark } = usePCTheme();
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorState, setErrorState] = useState<'retryable' | 'fatal' | null>(null);
  const retryCount = useRef(0);
  const intervalsRef = useRef<{
    tip?: ReturnType<typeof setInterval>;
    prog?: ReturnType<typeof setInterval>;
  }>({});

  const callApi = useCallback(() => {
    const quizDataStr = localStorage.getItem('popchoice_quiz_data');
    if (!quizDataStr) {
      router.replace('/quiz');
      return;
    }

    setErrorState(null);
    setProgress(0);

    intervalsRef.current.tip = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 1400);

    intervalsRef.current.prog = setInterval(() => {
      setProgress((p) => (p >= 85 ? 85 : p + 1));
    }, 60);

    axios
      .post('/api/movie-recommendation', JSON.parse(quizDataStr))
      .then((response) => {
        clearInterval(intervalsRef.current.tip);
        clearInterval(intervalsRef.current.prog);
        localStorage.setItem('popchoice_recommendation', JSON.stringify(response.data));
        localStorage.removeItem('popchoice_quiz_data');
        setProgress(100);
        setTimeout(() => router.push('/results'), 400);
      })
      .catch((err) => {
        clearInterval(intervalsRef.current.tip);
        clearInterval(intervalsRef.current.prog);
        // eslint-disable-next-line no-console
        console.error('API error:', err);
        retryCount.current += 1;
        setErrorState(retryCount.current >= MAX_RETRIES ? 'fatal' : 'retryable');
      });
  }, [router]);

  useEffect(() => {
    callApi();
    const intervals = intervalsRef.current;
    return () => {
      clearInterval(intervals.tip);
      clearInterval(intervals.prog);
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
            fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.06em',
            color: 'var(--pc-t1)',
          }}
        >
          {errorState ? 'Oops…' : 'Finding your perfect pick'}
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
                {TIPS[tipIndex]}
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
                  background: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
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
            <p style={{ color: '#EF4444', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Something went wrong. Attempt {retryCount.current} of {MAX_RETRIES}.
            </p>
            <button
              onClick={callApi}
              className="w-full py-3 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--pc-cta)', color: '#09090F', fontWeight: 700 }}
            >
              Try again
            </button>
            <button
              onClick={() => router.push('/quiz')}
              className="text-sm"
              style={{ color: 'var(--pc-t3)' }}
            >
              Back to quiz
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
            <p style={{ color: '#EF4444', fontSize: '0.88rem', lineHeight: 1.6 }}>
              The service is not available right now. Please try again later.
            </p>
            <p style={{ color: 'var(--pc-t3)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              Your answers are saved in your browser — come back and we&apos;ll pick up where you
              left off.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
              style={{ background: 'var(--pc-cta)', color: '#09090F', fontWeight: 700 }}
            >
              Go to home
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
            background: isDark ? 'rgba(245,197,24,0.06)' : 'rgba(196,149,10,0.06)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(245,197,24,0.12)' : 'rgba(196,149,10,0.18)',
          }}
        >
          <p
            style={{
              color: 'var(--pc-t2)',
              fontSize: '0.78rem',
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: 'var(--pc-gold)' }}>🍿 Did you know?</span> The average person
            spends <span style={{ color: 'var(--pc-t1)' }}>18 minutes</span> deciding what to watch
            — PopChoice does it in seconds.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
