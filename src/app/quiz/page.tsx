'use client';

import axios from 'axios';
import {
    ChevronLeft,
    ChevronRight,
    Clapperboard,
    Clock,
    CloudSun,
    Film,
    FlaskConical,
    Ghost,
    Globe,
    Heart,
    Moon,
    Plus,
    Skull,
    Smile,
    Star,
    Sun,
    Trash2,
    User,
    Users,
    Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { usePCTheme } from '@/hooks/usePCTheme';

type Era = 'new' | 'classic' | 'both';
type Tone = 'light' | 'balanced' | 'serious' | 'dark';

interface PersonAnswers {
  name: string;
  favoriteMovie: string;
  favoriteMovieWhy: string;
  era: Era | '';
  moods: string[];
  tone: Tone | '';
  favoriteActor: string;
}

type Phase = 'intro' | 'group-setup' | 'questions' | 'between-persons';

const GENRES = [
  { id: 'action', label: 'Action', icon: Zap, color: '#FF9F1C' },
  { id: 'comedy', label: 'Comedy', icon: Smile, color: '#F5C518' },
  { id: 'drama', label: 'Drama', icon: Film, color: '#8B5CF6' },
  { id: 'scifi', label: 'Sci-Fi', icon: FlaskConical, color: '#14B8A6' },
  { id: 'thriller', label: 'Thriller', icon: Ghost, color: '#EF4444' },
  { id: 'romance', label: 'Romance', icon: Heart, color: '#EC4899' },
  { id: 'horror', label: 'Horror', icon: Skull, color: '#6B7280' },
  { id: 'adventure', label: 'Adventure', icon: Globe, color: '#10B981' },
  { id: 'animation', label: 'Animation', icon: Star, color: '#A78BFA' },
  { id: 'documentary', label: 'Documentary', icon: Clock, color: '#60A5FA' },
];

const TONES: {
  id: Tone;
  label: string;
  desc: string;
  icon: typeof Sun;
  color: string;
  grad: string;
}[] = [
  {
    id: 'light',
    label: 'Light & Fun',
    desc: 'Easy going, uplifting',
    icon: Sun,
    color: '#F5C518',
    grad: 'linear-gradient(135deg, #F5C51818, #FF9F1C18)',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Mix of everything',
    icon: CloudSun,
    color: '#14B8A6',
    grad: 'linear-gradient(135deg, #14B8A618, #60A5FA18)',
  },
  {
    id: 'serious',
    label: 'Serious',
    desc: 'Thought-provoking',
    icon: Star,
    color: '#8B5CF6',
    grad: 'linear-gradient(135deg, #8B5CF618, #A78BFA18)',
  },
  {
    id: 'dark',
    label: 'Dark & Intense',
    desc: 'Gripping, complex',
    icon: Moon,
    color: '#EF4444',
    grad: 'linear-gradient(135deg, #EF444418, #6B728018)',
  },
];

const QUESTION_LABELS = ['Favorite film', 'Old or new?', 'Your mood', 'Pick a tone', 'Favorite actor'];

function emptyPerson(name = ''): PersonAnswers {
  return { name, favoriteMovie: '', favoriteMovieWhy: '', era: '', moods: [], tone: '', favoriteActor: '' };
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-300 rounded-full"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background:
              i < current
                ? 'rgba(245,197,24,0.5)'
                : i === current
                  ? 'linear-gradient(90deg, #F5C518, #FF9F1C)'
                  : 'var(--pc-bd2)',
          }}
        />
      ))}
    </div>
  );
}

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// Map quiz answers to API format
function toApiFormat(person: PersonAnswers) {
  const eraMap: Record<string, string> = {
    new: 'New',
    classic: 'Classic',
    both: 'Both new and classic',
  };
  const toneMap: Record<string, string> = {
    light: 'Light and fun',
    balanced: 'Balanced',
    serious: 'Serious and thought-provoking',
    dark: 'Dark and intense',
  };
  return {
    favoriteMovie: person.favoriteMovie,
    ...(person.favoriteMovieWhy.trim() && { favoriteMovieWhy: person.favoriteMovieWhy.trim() }),
    newVsClassic: eraMap[person.era] || person.era,
    moodPreference: person.moods.map((m) => GENRES.find((g) => g.id === m)?.label || m),
    tonePreference: toneMap[person.tone] || person.tone,
    ...(person.favoriteActor.trim() && { favoriteActor: person.favoriteActor.trim() }),
  };
}

export default function QuizPage() {
  const router = useRouter();
  const { isDark } = usePCTheme();

  const [phase, setPhase] = useState<Phase>('intro');
  const [mode, setMode] = useState<'solo' | 'group'>('solo');
  const [people, setPeople] = useState<PersonAnswers[]>([emptyPerson('You')]);
  const [currentPersonIdx, setCurrentPersonIdx] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [groupNames, setGroupNames] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPerson = people[currentPersonIdx];

  const ghostBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const iconUnselectedBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const chipUnselectedBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  function updateCurrentPerson(updates: Partial<PersonAnswers>) {
    setPeople((prev) => prev.map((p, i) => (i === currentPersonIdx ? { ...p, ...updates } : p)));
  }

  async function submitToApi() {
    setIsSubmitting(true);
    setError(null);
    try {
      const apiData = people.map(toApiFormat);
      const dataToSend = apiData.length === 1 ? apiData[0] : apiData;

      const response = await axios.post('/api/movie-recommendation', dataToSend);
      localStorage.setItem('popchoice_recommendation', JSON.stringify(response.data));
      router.push('/loading');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('API error:', err);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  function goNext() {
    setDir(1);
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    } else {
      if (currentPersonIdx < people.length - 1) {
        setPhase('between-persons');
      } else {
        submitToApi();
      }
    }
  }

  function goBack() {
    setDir(-1);
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    } else {
      if (mode === 'group' && currentPersonIdx > 0) {
        setCurrentPersonIdx((i) => i - 1);
        setCurrentStep(4);
      } else if (mode === 'group') {
        setPhase('group-setup');
      } else {
        setPhase('intro');
      }
    }
  }

  function canProceed(): boolean {
    if (!currentPerson) return false;
    if (currentStep === 0) return currentPerson.favoriteMovie.trim().length >= 1;
    if (currentStep === 1) return currentPerson.era !== '';
    if (currentStep === 2) return currentPerson.moods.length >= 1;
    if (currentStep === 3) return currentPerson.tone !== '';
    if (currentStep === 4) return true; // actor is optional
    return false;
  }

  function startSolo() {
    setMode('solo');
    setPeople([emptyPerson('You')]);
    setCurrentPersonIdx(0);
    setCurrentStep(0);
    setPhase('questions');
  }

  function startGroupSetup() {
    setMode('group');
    setPhase('group-setup');
  }

  function startGroupQuestions() {
    const valid = groupNames.filter((n) => n.trim().length > 0);
    const names = valid.length >= 2 ? valid : ['Person 1', 'Person 2'];
    setPeople(names.map((n) => emptyPerson(n)));
    setCurrentPersonIdx(0);
    setCurrentStep(0);
    setPhase('questions');
  }

  function nextPerson() {
    setCurrentPersonIdx((i) => i + 1);
    setCurrentStep(0);
    setDir(1);
    setPhase('questions');
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="text-4xl mb-4">🍿</div>
            <h1
              className="mb-2"
              style={{
                fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                fontSize: '2.2rem',
                letterSpacing: '0.05em',
                color: 'var(--pc-t1)',
              }}
            >
              Let&apos;s find your movie
            </h1>
            <p style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>
              Are you watching solo or with others?
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Solo */}
            <button
              onClick={startSolo}
              className="group flex items-center gap-5 p-5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = isDark
                  ? 'rgba(245,197,24,0.4)'
                  : 'rgba(196,149,10,0.4)';
                (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd2)';
                (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface)';
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(245,197,24,0.15)',
                  color: 'var(--pc-gold)',
                }}
              >
                <User size={22} />
              </div>
              <div>
                <div
                  style={{
                    color: 'var(--pc-t1)',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  Just me
                </div>
                <div style={{ color: 'var(--pc-t4)', fontSize: '0.85rem' }}>
                  Solo movie night — personalized just for you
                </div>
              </div>
              <ChevronRight
                size={18}
                className="ml-auto shrink-0"
                style={{ color: 'var(--pc-t4)' }}
              />
            </button>

            {/* Group */}
            <button
              onClick={startGroupSetup}
              className="group flex items-center gap-5 p-5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
                (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd2)';
                (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface)';
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}
              >
                <Users size={22} />
              </div>
              <div>
                <div
                  style={{
                    color: 'var(--pc-t1)',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  Group mode 🎉
                </div>
                <div style={{ color: 'var(--pc-t4)', fontSize: '0.85rem' }}>
                  Find a film everyone will enjoy
                </div>
              </div>
              <div
                className="ml-auto shrink-0 text-xs px-2 py-1 rounded-full"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}
              >
                NEW
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── GROUP SETUP ────────────────────────────────────────────────────────────

  if (phase === 'group-setup') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">👥</div>
            <h2
              style={{
                fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                fontSize: '2rem',
                letterSpacing: '0.05em',
                color: 'var(--pc-t1)',
              }}
            >
              Who&apos;s watching?
            </h2>
            <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', marginTop: 6 }}>
              Add everyone&apos;s name so we can tailor the quiz
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {groupNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs"
                  style={{
                    background: 'rgba(139,92,246,0.2)',
                    color: '#A78BFA',
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <input
                  value={name}
                  onChange={(e) =>
                    setGroupNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))
                  }
                  placeholder={`Person ${i + 1}'s name`}
                  className="flex-1 px-4 py-3 rounded-xl outline-none transition-all duration-200"
                  style={{
                    background: 'var(--pc-surface)',
                    border: '1px solid var(--pc-bd2)',
                    color: 'var(--pc-t1)',
                    fontSize: '0.95rem',
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor =
                      'rgba(139,92,246,0.5)';
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--pc-bd2)';
                  }}
                />
                {groupNames.length > 2 && (
                  <button
                    onClick={() => setGroupNames((prev) => prev.filter((_, j) => j !== i))}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{ color: 'var(--pc-t3)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = '#EF4444';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--pc-t3)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {groupNames.length < 6 && (
            <button
              onClick={() => setGroupNames((prev) => [...prev, ''])}
              className="w-full flex items-center gap-2 justify-center py-3 rounded-xl mb-6 text-sm transition-all duration-200"
              style={{
                border: '1px dashed var(--pc-bd4)',
                color: 'var(--pc-t3)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#A78BFA';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--pc-t3)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd4)';
              }}
            >
              <Plus size={15} /> Add another person
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('intro')}
              className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
              style={{
                background: ghostBg,
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              Back
            </button>
            <button
              onClick={startGroupQuestions}
              className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
              style={{
                background: 'var(--pc-cta)',
                color: '#09090F',
                fontWeight: 700,
              }}
            >
              Let&apos;s go!
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── BETWEEN PERSONS ────────────────────────────────────────────────────────

  if (phase === 'between-persons') {
    const nextName = people[currentPersonIdx + 1]?.name || 'Next person';
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
            {currentPerson.name}&apos;s turn is done!
          </h2>
          <p className="mb-8" style={{ color: 'var(--pc-t2)' }}>
            Now it&apos;s{' '}
            <span style={{ color: 'var(--pc-gold)', fontWeight: 600 }}>{nextName}</span>
            &apos;s turn. Hand over the phone!
          </p>
          <button
            onClick={nextPerson}
            className="px-8 py-3.5 rounded-2xl transition-all duration-200 active:scale-95"
            style={{
              background: 'var(--pc-cta)',
              color: '#09090F',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            I&apos;m ready, {nextName}! →
          </button>
        </motion.div>
      </div>
    );
  }

  // ── QUESTIONS ──────────────────────────────────────────────────────────────

  const totalPeople = people.length;
  const personLabel = totalPeople > 1 ? `${currentPerson.name}'s turn` : null;

  return (
    <div className="flex-1 flex flex-col min-h-[80vh]">
      {/* Top bar */}
      <div className="px-5 pt-6 pb-4 flex flex-col gap-3 max-w-xl mx-auto w-full">
        {totalPeople > 1 && (
          <div className="flex items-center gap-2 mb-1">
            {people.map((p, i) => (
              <div
                key={i}
                className="text-xs px-3 py-1 rounded-full transition-all duration-200"
                style={{
                  background:
                    i === currentPersonIdx
                      ? isDark
                        ? 'rgba(245,197,24,0.15)'
                        : 'rgba(196,149,10,0.12)'
                      : ghostBg,
                  color:
                    i === currentPersonIdx
                      ? 'var(--pc-gold)'
                      : i < currentPersonIdx
                        ? isDark
                          ? 'rgba(245,197,24,0.4)'
                          : 'rgba(196,149,10,0.5)'
                        : 'var(--pc-t4)',
                  border:
                    i === currentPersonIdx
                      ? '1px solid rgba(245,197,24,0.3)'
                      : '1px solid transparent',
                }}
              >
                {p.name}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProgressDots current={currentStep} total={5} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
              {currentStep + 1} of 5
            </span>
          </div>
          {personLabel && (
            <span style={{ color: 'var(--pc-t2)', fontSize: '0.8rem' }}>👤 {personLabel}</span>
          )}
        </div>

        <div
          style={{
            color: 'var(--pc-t3)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {QUESTION_LABELS[currentStep]}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col px-5 max-w-xl mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${currentPersonIdx}-${currentStep}`}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1"
          >
            {/* Q1: Favorite Movie */}
            {currentStep === 0 && (
              <div className="flex flex-col gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(245,197,24,0.15)',
                      color: 'var(--pc-gold)',
                    }}
                  >
                    <Clapperboard size={20} />
                  </div>
                  <h2
                    style={{
                      fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                      fontSize: '1.8rem',
                      letterSpacing: '0.04em',
                      color: 'var(--pc-t1)',
                      lineHeight: 1.1,
                    }}
                  >
                    What&apos;s your favorite movie?
                  </h2>
                </div>
                <p
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.88rem',
                    marginTop: -8,
                  }}
                >
                  This helps us understand your taste. Any film that made an impression on you.
                </p>

                <div className="relative">
                  <input
                    autoFocus
                    value={currentPerson.favoriteMovie}
                    onChange={(e) => updateCurrentPerson({ favoriteMovie: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && canProceed() && goNext()}
                    placeholder="e.g. The Dark Knight, Parasite, Coco…"
                    className="w-full px-5 py-4 rounded-2xl outline-none transition-all duration-200"
                    style={{
                      background: 'var(--pc-surface)',
                      border: '1px solid var(--pc-bd2)',
                      color: 'var(--pc-t1)',
                      fontSize: '1rem',
                    }}
                    onFocus={(e) => {
                      (e.currentTarget as HTMLInputElement).style.borderColor = isDark
                        ? 'rgba(245,197,24,0.4)'
                        : 'rgba(196,149,10,0.5)';
                      (e.currentTarget as HTMLInputElement).style.boxShadow =
                        '0 0 0 3px rgba(245,197,24,0.06)';
                    }}
                    onBlur={(e) => {
                      (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--pc-bd2)';
                      (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Quick suggestions */}
                <div>
                  <p
                    style={{
                      color: 'var(--pc-t4)',
                      fontSize: '0.78rem',
                      marginBottom: 10,
                    }}
                  >
                    POPULAR PICKS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'The Dark Knight',
                      'Inception',
                      'Parasite',
                      'Pulp Fiction',
                      'The Matrix',
                      'Coco',
                    ].map((film) => (
                      <button
                        key={film}
                        onClick={() => updateCurrentPerson({ favoriteMovie: film })}
                        className="px-3 py-1.5 rounded-xl text-sm transition-all duration-150"
                        style={{
                          background:
                            currentPerson.favoriteMovie === film
                              ? isDark
                                ? 'rgba(245,197,24,0.2)'
                                : 'rgba(196,149,10,0.12)'
                              : chipUnselectedBg,
                          border:
                            currentPerson.favoriteMovie === film
                              ? '1px solid rgba(245,197,24,0.4)'
                              : '1px solid var(--pc-bd1)',
                          color:
                            currentPerson.favoriteMovie === film
                              ? 'var(--pc-gold)'
                              : 'var(--pc-t2)',
                        }}
                      >
                        {film}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Why? */}
                <div>
                  <p
                    style={{
                      color: 'var(--pc-t4)',
                      fontSize: '0.78rem',
                      marginBottom: 8,
                    }}
                  >
                    WHY?{' '}
                    <span style={{ color: 'var(--pc-t4)', fontWeight: 400 }}>(optional)</span>
                  </p>
                  <textarea
                    value={currentPerson.favoriteMovieWhy}
                    onChange={(e) =>
                      updateCurrentPerson({ favoriteMovieWhy: e.target.value.slice(0, 300) })
                    }
                    placeholder="Share your thoughts — plot, characters, what made it special…"
                    rows={3}
                    className="w-full px-5 py-4 rounded-2xl outline-none transition-all duration-200 resize-none"
                    style={{
                      background: 'var(--pc-surface)',
                      border: '1px solid var(--pc-bd2)',
                      color: 'var(--pc-t1)',
                      fontSize: '0.9rem',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = isDark
                        ? 'rgba(245,197,24,0.4)'
                        : 'rgba(196,149,10,0.5)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.06)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--pc-bd2)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <p
                    style={{
                      color: 'var(--pc-t4)',
                      fontSize: '0.75rem',
                      textAlign: 'right',
                      marginTop: 4,
                    }}
                  >
                    {currentPerson.favoriteMovieWhy.length}/300
                  </p>
                </div>
              </div>
            )}

            {/* Q2: Era */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(255,159,28,0.15)',
                      color: 'var(--pc-amber)',
                    }}
                  >
                    <Clock size={20} />
                  </div>
                  <h2
                    style={{
                      fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                      fontSize: '1.8rem',
                      letterSpacing: '0.04em',
                      color: 'var(--pc-t1)',
                      lineHeight: 1.1,
                    }}
                  >
                    New releases or timeless classics?
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(
                    [
                      {
                        id: 'new',
                        emoji: '✨',
                        title: 'New Releases',
                        desc: 'Recent films from the last 5 years',
                        color: '#14B8A6',
                      },
                      {
                        id: 'classic',
                        emoji: '🎞️',
                        title: 'Timeless Classics',
                        desc: 'Golden films that stood the test of time',
                        color: '#F5C518',
                      },
                      {
                        id: 'both',
                        emoji: '🎬',
                        title: "I'm open to both",
                        desc: "Surprise me — old or new, as long as it's great",
                        color: '#8B5CF6',
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = currentPerson.era === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => updateCurrentPerson({ era: opt.id })}
                        className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
                        style={{
                          background: selected ? `${opt.color}18` : 'var(--pc-surface)',
                          border: selected
                            ? `1.5px solid ${opt.color}60`
                            : '1px solid var(--pc-bd2)',
                          boxShadow: selected ? `0 0 20px ${opt.color}18` : 'none',
                        }}
                      >
                        <div className="text-2xl">{opt.emoji}</div>
                        <div className="flex-1">
                          <div
                            style={{
                              color: selected ? opt.color : 'var(--pc-t1)',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                            }}
                          >
                            {opt.title}
                          </div>
                          <div
                            style={{
                              color: 'var(--pc-t3)',
                              fontSize: '0.82rem',
                            }}
                          >
                            {opt.desc}
                          </div>
                        </div>
                        {selected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: opt.color }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path
                                d="M2 5l2.5 2.5L8 3"
                                stroke="#09090F"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Q3: Moods */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-5 pt-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(139,92,246,0.15)',
                      color: '#8B5CF6',
                    }}
                  >
                    <Smile size={20} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                        fontSize: '1.8rem',
                        letterSpacing: '0.04em',
                        color: 'var(--pc-t1)',
                        lineHeight: 1.1,
                      }}
                    >
                      What&apos;s your mood tonight?
                    </h2>
                    <p
                      style={{
                        color: 'var(--pc-t3)',
                        fontSize: '0.82rem',
                        marginTop: 2,
                      }}
                    >
                      Pick one or more
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {GENRES.map((g) => {
                    const selected = currentPerson.moods.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => {
                          const newMoods = selected
                            ? currentPerson.moods.filter((m) => m !== g.id)
                            : [...currentPerson.moods, g.id];
                          updateCurrentPerson({ moods: newMoods });
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 active:scale-[0.97]"
                        style={{
                          background: selected ? `${g.color}18` : 'var(--pc-surface)',
                          border: selected ? `1.5px solid ${g.color}50` : '1px solid var(--pc-bd1)',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: selected ? `${g.color}25` : iconUnselectedBg,
                            color: selected ? g.color : 'var(--pc-t3)',
                          }}
                        >
                          <g.icon size={15} />
                        </div>
                        <span
                          style={{
                            color: selected ? g.color : 'var(--pc-t2)',
                            fontWeight: selected ? 600 : 400,
                            fontSize: '0.88rem',
                          }}
                        >
                          {g.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {currentPerson.moods.length > 0 && (
                  <p
                    style={{
                      color: 'var(--pc-t3)',
                      fontSize: '0.78rem',
                      textAlign: 'center',
                    }}
                  >
                    ✓ {currentPerson.moods.length} genre
                    {currentPerson.moods.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Q4: Tone */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-5 pt-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(245,197,24,0.15)',
                      color: 'var(--pc-gold)',
                    }}
                  >
                    <Moon size={20} />
                  </div>
                  <h2
                    style={{
                      fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                      fontSize: '1.8rem',
                      letterSpacing: '0.04em',
                      color: 'var(--pc-t1)',
                      lineHeight: 1.1,
                    }}
                  >
                    What tone are you after?
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {TONES.map((t) => {
                    const selected = currentPerson.tone === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => updateCurrentPerson({ tone: t.id as Tone })}
                        className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97]"
                        style={{
                          background: selected ? t.grad : 'var(--pc-surface)',
                          border: selected ? `1.5px solid ${t.color}50` : '1px solid var(--pc-bd1)',
                          boxShadow: selected ? `0 0 20px ${t.color}14` : 'none',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{
                            background: selected ? `${t.color}20` : iconUnselectedBg,
                            color: selected ? t.color : 'var(--pc-t3)',
                          }}
                        >
                          <t.icon size={16} />
                        </div>
                        <div>
                          <div
                            style={{
                              color: selected ? t.color : 'var(--pc-t1)',
                              fontWeight: 600,
                              fontSize: '0.88rem',
                            }}
                          >
                            {t.label}
                          </div>
                          <div
                            style={{
                              color: 'var(--pc-t3)',
                              fontSize: '0.78rem',
                            }}
                          >
                            {t.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Q5: Favorite Actor */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(245,197,24,0.15)',
                      color: 'var(--pc-gold)',
                    }}
                  >
                    <User size={20} />
                  </div>
                  <h2
                    style={{
                      fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                      fontSize: '1.8rem',
                      letterSpacing: '0.04em',
                      color: 'var(--pc-t1)',
                      lineHeight: 1.1,
                    }}
                  >
                    Who&apos;s your favorite actor?
                  </h2>
                </div>
                <p
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.88rem',
                    marginTop: -8,
                  }}
                >
                  Optional — helps us find films featuring people you already love.
                </p>

                <div className="relative">
                  <input
                    autoFocus
                    value={currentPerson.favoriteActor}
                    onChange={(e) => updateCurrentPerson({ favoriteActor: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && goNext()}
                    placeholder="e.g. Tom Hanks, Meryl Streep, Cillian Murphy…"
                    className="w-full px-5 py-4 rounded-2xl outline-none transition-all duration-200"
                    style={{
                      background: 'var(--pc-surface)',
                      border: '1px solid var(--pc-bd2)',
                      color: 'var(--pc-t1)',
                      fontSize: '1rem',
                    }}
                    onFocus={(e) => {
                      (e.currentTarget as HTMLInputElement).style.borderColor = isDark
                        ? 'rgba(245,197,24,0.4)'
                        : 'rgba(196,149,10,0.5)';
                      (e.currentTarget as HTMLInputElement).style.boxShadow =
                        '0 0 0 3px rgba(245,197,24,0.06)';
                    }}
                    onBlur={(e) => {
                      (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--pc-bd2)';
                      (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Quick suggestions */}
                <div>
                  <p
                    style={{
                      color: 'var(--pc-t4)',
                      fontSize: '0.78rem',
                      marginBottom: 10,
                    }}
                  >
                    POPULAR PICKS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Tom Hanks',
                      'Meryl Streep',
                      'Leonardo DiCaprio',
                      'Cate Blanchett',
                      'Denzel Washington',
                      'Scarlett Johansson',
                    ].map((actor) => (
                      <button
                        key={actor}
                        onClick={() => updateCurrentPerson({ favoriteActor: actor })}
                        className="px-3 py-1.5 rounded-xl text-sm transition-all duration-150"
                        style={{
                          background:
                            currentPerson.favoriteActor === actor
                              ? isDark
                                ? 'rgba(245,197,24,0.2)'
                                : 'rgba(196,149,10,0.12)'
                              : chipUnselectedBg,
                          border:
                            currentPerson.favoriteActor === actor
                              ? '1px solid rgba(245,197,24,0.4)'
                              : '1px solid var(--pc-bd1)',
                          color:
                            currentPerson.favoriteActor === actor
                              ? 'var(--pc-gold)'
                              : 'var(--pc-t2)',
                        }}
                      >
                        {actor}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="px-5 max-w-xl mx-auto w-full text-center"
          style={{ color: '#EF4444', fontSize: '0.85rem' }}
        >
          {error}
        </div>
      )}

      {/* Nav buttons */}
      <div className="px-5 py-6 max-w-xl mx-auto w-full flex gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl text-sm transition-all duration-200"
          style={{
            background: ghostBg,
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t3)',
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <button
          onClick={goNext}
          disabled={!canProceed() || isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
          style={{
            background: canProceed() && !isSubmitting ? 'var(--pc-cta)' : 'var(--pc-bd2)',
            color: canProceed() && !isSubmitting ? '#09090F' : 'var(--pc-t4)',
            fontWeight: 700,
            cursor: canProceed() && !isSubmitting ? 'pointer' : 'not-allowed',
          }}
        >
          {isSubmitting ? (
            <>Submitting…</>
          ) : currentStep === 4 && currentPersonIdx === people.length - 1 ? (
            <>Find My Movie ✨</>
          ) : currentStep === 4 ? (
            <>
              Next Person <ChevronRight size={16} />
            </>
          ) : (
            <>
              Continue <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
