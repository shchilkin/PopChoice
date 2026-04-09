'use client';

import { Brain, Database, ListChecks, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { palette } from '@/styles/designTokens';

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: ListChecks,
    title: 'You answer 5 quick questions',
    desc: "Tell us your favorite film (and why!), whether you prefer classics or new releases, your current mood (pick multiple genres!), the tone you're after, and your favorite actor. It takes about 60 seconds.",
    color: palette.gold,
  },
  {
    step: '02',
    icon: Brain,
    title: 'We build your taste profile',
    desc: 'Your answers are transformed into a high-dimensional vector that captures the nuances of your preferences — not just genres, but cinematographic style, narrative complexity, and emotional tone.',
    color: palette.purple,
  },
  {
    step: '03',
    icon: Database,
    // TODO: replace hardcoded film count with live value fetched from the DB
    title: 'AI searches our film database',
    desc: 'Using vector similarity search, we find the films in our database that are closest to your taste profile. Every film has been pre-analyzed for tone, pacing, themes, and emotional resonance.',
    color: palette.teal,
  },
  {
    step: '04',
    icon: Sparkles,
    title: 'You get curated results',
    desc: 'We surface your top match plus 5 additional great options, each with a personalized AI-written explanation of exactly why it fits your taste tonight.',
    color: palette.amber,
  },
];

export function HowItWorksSection() {
  return (
    <section className="mb-16">
      <h2
        className="mb-8"
        style={{
          fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
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
                style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    style={{
                      color: step.color,
                      fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
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
  );
}
