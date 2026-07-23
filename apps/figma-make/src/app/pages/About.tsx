import { Sparkles, Search, Brain, ListChecks, Play, Database, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';

import { usePCTheme } from '../contexts/ThemeContext';

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: ListChecks,
    title: 'You answer 4 quick questions',
    desc: "Tell us your favorite film, whether you prefer classics or new releases, your current mood (pick multiple genres!), and the tone you're after. It takes about 60 seconds.",
    color: '#F5C518',
  },
  {
    step: '02',
    icon: Brain,
    title: 'We build your taste profile',
    desc: 'Your answers are transformed into a high-dimensional vector that captures the nuances of your preferences — not just genres, but cinematographic style, narrative complexity, and emotional tone.',
    color: '#8B5CF6',
  },
  {
    step: '03',
    icon: Database,
    title: 'AI searches 10,000+ films',
    desc: 'Using vector similarity search, we find the films in our database that are closest to your taste profile. Every film has been pre-analyzed for tone, pacing, themes, and emotional resonance.',
    color: '#14B8A6',
  },
  {
    step: '04',
    icon: Sparkles,
    title: 'You get curated results',
    desc: 'We surface your top match plus 5 additional great options, each with a personalized AI-written explanation of exactly why it fits your taste tonight.',
    color: '#FF9F1C',
  },
];

const TECH_STACK = [
  {
    name: 'Vector Search',
    desc: 'Semantic similarity matching across 10k+ films',
    icon: Search,
    color: '#14B8A6',
  },
  {
    name: 'AI Language Model',
    desc: 'Generates personalized recommendations for each user',
    icon: Brain,
    color: '#8B5CF6',
  },
  {
    name: 'Film Database',
    desc: 'Curated metadata including tone, themes & cinematography',
    icon: Database,
    color: '#F5C518',
  },
  {
    name: 'Real-time Processing',
    desc: 'Results in under 4 seconds from submission to screen',
    icon: Zap,
    color: '#FF9F1C',
  },
];

const FAQ = [
  {
    q: 'Does PopChoice require an account?',
    a: 'Nope! PopChoice is completely anonymous and requires no sign-up. Just answer the quiz and get your picks.',
  },
  {
    q: 'How does group mode work?',
    a: "Each person in the group fills out the 4-question quiz on the same device. PopChoice then finds films that score highly across everyone's taste profiles — a true compromise, but a good one.",
  },
  {
    q: 'How accurate are the recommendations?',
    a: "The AI uses vector similarity across multiple film attributes (not just genre), which leads to surprisingly accurate taste matching. Of course, movie taste is subjective — that's why we give you 6 options!",
  },
  {
    q: 'Where does the film data come from?',
    a: 'Our film database is curated from public film metadata, including ratings, runtime, director, genre tags, and thematic analysis performed by our AI pipeline.',
  },
];

export function About() {
  const navigate = useNavigate();
  const { isDark } = usePCTheme();

  return (
    <div className="px-5 py-12 max-w-3xl mx-auto w-full">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-5 uppercase tracking-widest"
          style={{
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            color: '#A78BFA',
          }}
        >
          <Brain size={11} />
          How PopChoice works
        </div>
        <h1
          className="mb-4"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          AI that gets your taste
        </h1>
        <p
          className="max-w-lg mx-auto"
          style={{ color: 'var(--pc-t2)', lineHeight: 1.75, fontSize: '0.95rem' }}
        >
          PopChoice isn't just a genre filter. It uses vector embeddings and AI to understand what
          makes a film feel right to <span style={{ color: 'var(--pc-t1)' }}>you</span> — then finds
          movies that genuinely match that feeling.
        </p>
      </motion.div>

      {/* How it works steps */}
      <section className="mb-16">
        <h2
          className="mb-8"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.6rem',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          The process
        </h2>
        <div className="relative">
          <div
            className="absolute left-7 top-10 bottom-10 w-0.5 hidden sm:block"
            style={{
              background:
                'linear-gradient(180deg, rgba(245,197,24,0.3) 0%, rgba(255,159,28,0.1) 50%, transparent 100%)',
            }}
          />
          <div className="flex flex-col gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-5 items-start"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10"
                  style={{
                    background: `${step.color}18`,
                    border: `1px solid ${step.color}30`,
                    color: step.color,
                  }}
                >
                  <step.icon size={22} />
                </div>
                <div
                  className="flex-1 p-5 rounded-2xl"
                  style={{
                    background: 'var(--pc-surface)',
                    border: '1px solid var(--pc-bd1)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      style={{
                        color: step.color,
                        fontFamily: "'Bebas Neue', sans-serif",
                        letterSpacing: '0.1em',
                        fontSize: '0.9rem',
                      }}
                    >
                      {step.step}
                    </span>
                    <h3 style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.95rem' }}>
                      {step.title}
                    </h3>
                  </div>
                  <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="mb-16">
        <h2
          className="mb-6"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.6rem',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          Under the hood
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TECH_STACK.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-4 p-4 rounded-2xl"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd1)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${tech.color}18`, color: tech.color }}
              >
                <tech.icon size={17} />
              </div>
              <div>
                <div style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.88rem' }}>
                  {tech.name}
                </div>
                <div style={{ color: 'var(--pc-t3)', fontSize: '0.78rem', lineHeight: 1.6 }}>
                  {tech.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-14">
        <h2
          className="mb-6"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.6rem',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          FAQ
        </h2>
        <div className="flex flex-col gap-4">
          {FAQ.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd1)',
              }}
            >
              <h4
                className="mb-2"
                style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
              >
                {item.q}
              </h4>
              <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                {item.a}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center p-8 rounded-3xl"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(245,197,24,0.08) 0%, rgba(139,92,246,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(196,149,10,0.07) 0%, rgba(139,92,246,0.07) 100%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(245,197,24,0.12)' : 'rgba(196,149,10,0.18)',
        }}
      >
        <div className="text-4xl mb-4">🍿</div>
        <h3
          className="mb-2"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.8rem',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          Ready to find tonight's film?
        </h3>
        <p className="mb-6" style={{ color: 'var(--pc-t3)', fontSize: '0.88rem' }}>
          60 seconds. 4 questions. The perfect movie.
        </p>
        <button
          onClick={() => navigate('/quiz')}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: '#09090F',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          <Play size={16} className="fill-current" />
          Start the Quiz
        </button>
      </motion.div>
    </div>
  );
}
