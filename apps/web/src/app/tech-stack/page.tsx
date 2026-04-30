'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

import { palette } from '@/styles/designTokens';

const STACK = [
  {
    group: 'Frontend',
    color: palette.gold,
    items: [
      {
        name: 'Next.js 15 + React 19',
        role: 'Full-stack framework',
        rationale:
          'App Router with server components for streaming renders and layout-level data fetching. React 19 concurrent features keep the quiz UI responsive during async operations. Full-stack TypeScript in a single repo eliminates the API contract drift that plagues separate frontend/backend setups.',
        detail:
          'The results page uses server components to fetch and stream movie data without client-side waterfalls — the UI renders progressively as recommendations arrive.',
      },
      {
        name: 'Tailwind CSS 4',
        role: 'Styling layer',
        rationale:
          'Utility-first styling with CSS custom property design tokens as the source of truth. Tailwind generates classes; tokens carry semantic meaning (--pc-gold, --pc-surface, --pc-t1). The two systems compose cleanly: tokens handle theme switching, Tailwind handles layout and spacing.',
        detail:
          'All theme-adaptive colors (light/dark mode) live in CSS custom properties, not Tailwind config. This means a single className can respond to the theme without JS.',
      },
      {
        name: 'TypeScript',
        role: 'Type system',
        rationale:
          'End-to-end types from database schema to UI props. The translation i18n system, quiz state machine, and API response shapes are all typed — catching shape mismatches at compile time rather than runtime.',
        detail: null,
      },
    ],
  },
  {
    group: 'AI + Data',
    color: palette.purple,
    items: [
      {
        name: 'OpenAI Embeddings API',
        role: 'Taste profile encoding',
        rationale:
          'Quiz answers (favorite film, mood, tone, era, actor) are assembled into a structured prompt and encoded into a 1536-dimension vector via text-embedding-3-small. This captures semantic meaning rather than keyword matching — "I love The Godfather because of the family dynamics" and "Crime dramas with moral complexity" land near each other in embedding space.',
        detail:
          'The embedding request is the only AI call that blocks the user. Everything else (movie pre-analysis, explanation generation) runs asynchronously in background workers.',
      },
      {
        name: 'GPT-4o-mini',
        role: 'Recommendation explanations',
        rationale:
          "After vector search surfaces candidate films, GPT-4o-mini generates a personalized explanation for each result: why this specific film matches this specific taste profile. The prompt includes the user's quiz answers and the film's pre-analyzed metadata.",
        detail:
          'Model choice was deliberate: GPT-4o for quality, mini for latency and cost. At 6 explanations per quiz submission, full GPT-4o would make the results page noticeably slow.',
      },
      {
        name: 'pgvector (PostgreSQL)',
        role: 'Vector similarity search',
        rationale:
          "Self-hosted vector search via the pgvector PostgreSQL extension — no external vector database (no Pinecone, Weaviate, or Qdrant). 10,000+ films are stored with their embedding vectors in the same Postgres instance as the rest of the application data. Cosine similarity search finds the nearest neighbors to the user's taste vector.",
        detail:
          "The decision to avoid a dedicated vector DB reduced operational complexity significantly. pgvector's performance at this scale (10k vectors, sub-100ms queries) made an external service unnecessary.",
      },
    ],
  },
  {
    group: 'Infrastructure',
    color: palette.teal,
    items: [
      {
        name: 'Redis + BullMQ',
        role: 'Background job queue',
        rationale:
          'The movie data backfill pipeline (fetching metadata, generating embeddings, storing vectors) runs as background jobs rather than blocking web requests. BullMQ handles job scheduling, retries, concurrency limits, and failure recovery. Redis is the queue backend.',
        detail:
          "Rate limiting the OpenAI embedding API calls required a concurrency-aware queue. BullMQ's rate limiter feature handles this cleanly — jobs self-throttle without manual sleep loops.",
      },
      {
        name: 'Turborepo',
        role: 'Monorepo build system',
        rationale:
          'The project spans three packages: the Next.js web app, a shared TypeScript package (types, utilities), and the BullMQ worker service. Turborepo caches build artifacts and runs tasks in dependency order — building shared packages before the apps that consume them.',
        detail:
          "Moving from a single-package repo to a monorepo was the most significant architectural lift in the project. Turborepo's remote caching meant CI times stayed manageable despite the added complexity.",
      },
      {
        name: 'Docker + Docker Compose',
        role: 'Containerized deployment',
        rationale:
          'All services (web app, worker, PostgreSQL, Redis) run in containers. Docker Compose defines the full stack for local development and production deployment. Multi-stage Dockerfiles keep production images lean.',
        detail:
          'Containerizing the worker service separately from the web app allows independent scaling — the embedding pipeline can run at full concurrency without competing with web request handling.',
      },
    ],
  },
] as const;

export default function TechStackPage() {
  return (
    <div className="px-5 py-12 max-w-3xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-16"
      >
        <p
          className="mb-3"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            color: 'var(--pc-t3)',
          }}
        >
          <Link
            href="/about"
            className="hover:opacity-70 transition-opacity duration-150"
            style={{ color: 'inherit' }}
          >
            About
          </Link>
          {' / Stack'}
        </p>
        <h1
          className="mb-5"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(2rem, 6vw, 3.2rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          Under the Hood
        </h1>
        <p
          className="max-w-xl"
          style={{ color: 'var(--pc-t2)', lineHeight: 1.75, fontSize: '0.95rem' }}
        >
          Every choice here was made to learn the parts that course projects skip: self-hosted
          vector search, background job pipelines, monorepo tooling, and containerized multi-service
          deployments. The decisions below explain the reasoning, not just the result.
        </p>
      </motion.div>

      <div className="flex flex-col gap-20">
        {STACK.map((group, gi) => (
          <motion.section
            key={group.group}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: gi * 0.05 }}
          >
            <p
              className="mb-4"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                fontWeight: '600',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                color: 'var(--pc-t3)',
              }}
            >
              {group.group}
            </p>
            <div style={{ borderTop: '1px solid var(--pc-bd1)' }}>
              {group.items.map((item, ii) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: gi * 0.05 + ii * 0.08 }}
                  className="py-7"
                  style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                    <h2
                      style={{
                        color: 'var(--pc-t1)',
                        fontWeight: 700,
                        fontSize: '1rem',
                      }}
                    >
                      {item.name}
                    </h2>
                    <span
                      style={{
                        color: group.color,
                        fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {item.role}
                    </span>
                  </div>
                  <p
                    className="mb-4 max-w-2xl"
                    style={{ color: 'var(--pc-t2)', fontSize: '0.9rem', lineHeight: 1.75 }}
                  >
                    {item.rationale}
                  </p>
                  {item.detail && (
                    <p
                      className="max-w-2xl px-4 py-3 rounded-lg"
                      style={{
                        color: 'var(--pc-t3)',
                        fontSize: '0.835rem',
                        lineHeight: 1.7,
                        background: 'var(--pc-surface-hover)',
                      }}
                    >
                      {item.detail}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mt-16 pt-8 flex flex-wrap items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--pc-bd1)' }}
      >
        <Link
          href="/about"
          className="inline-flex items-center gap-2 transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--pc-t3)', fontSize: '0.875rem' }}
        >
          ← Back to About
        </Link>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: 'var(--pc-cta-text)',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          Try the quiz →
        </Link>
      </motion.div>
    </div>
  );
}
