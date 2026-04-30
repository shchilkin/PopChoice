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
        name: 'Next.js 16',
        role: 'Full-stack framework',
        rationale:
          'Next.js 16 and the App Router provide the backbone of the application. Server components allow for streaming renders and layout-level data fetching, while full-stack TypeScript eliminates API contract drift.',
        detail:
          'The results page uses server components to fetch and stream movie data without client-side waterfalls — the UI renders progressively as recommendations arrive.',
      },
      {
        name: 'React 19',
        role: 'UI Library',
        rationale:
          'React 19 concurrent features keep the quiz UI responsive during heavy async operations. The use of Actions simplifies form handling and state transitions throughout the application.',
        detail: null,
      },
      {
        name: 'XState',
        role: 'State Management',
        rationale:
          'The 5-question quiz is modeled as a formal state machine. This prevents illegal state transitions and provides a clear, predictable flow for the complex branching logic.',
        detail:
          'Using @xstate/react allows the UI to react to machine state changes, handling loading states and transitions with zero "if (loading)" spaghetti code.',
      },
      {
        name: 'Tailwind CSS 4',
        role: 'Styling layer',
        rationale:
          'Utility-first styling with CSS custom property design tokens as the source of truth. Tailwind 4 generates classes dynamically, while tokens carry the semantic meaning for themes.',
        detail:
          'All theme-adaptive colors (light/dark mode) live in CSS custom properties. This means a single className can respond to the theme without JavaScript.',
      },
      {
        name: 'Motion',
        role: 'Animations',
        rationale:
          'Formerly Framer Motion, this library handles all spring-based transitions and entrance animations, ensuring the UI feels "alive" and responsive to user input.',
        detail: null,
      },
      {
        name: 'Lucide React',
        role: 'Icon Set',
        rationale:
          'A clean, consistent icon library that is fully tree-shakeable and optimized for modern React environments.',
        detail: null,
      },
    ],
  },
  {
    group: 'AI + Data',
    color: palette.purple,
    items: [
      {
        name: 'OpenAI text-embedding-3-large',
        role: 'Taste encoding',
        rationale:
          'Quiz answers are assembled into structured prompts and encoded into 3072-dimension vectors. This captures deep semantic meaning: "family dynamics" and "moral complexity" land near each other in embedding space.',
        detail:
          'The embedding request is the only AI call that blocks the user. Everything else runs asynchronously in background workers.',
      },
      {
        name: 'gpt-5.4-mini',
        role: 'Explanation generation',
        rationale:
          'Generates personalized explanations for each recommendation. gpt-5.4-mini provides an exceptional balance of speed and reasoning quality for real-time applications.',
        detail:
          'At 6 explanations per quiz submission, using the full gpt-5.4 model would increase latency. The "mini" variant provides near-instant results.',
      },
      {
        name: 'PostgreSQL',
        role: 'Primary Movie Database',
        rationale:
          'Serves as the central repository for 400+ curated films, metadata, and vectors. Storing everything in a single relational database simplifies data integrity and cross-referencing.',
        detail: null,
      },
      {
        name: 'pgvector',
        role: 'Vector Search',
        rationale:
          'A PostgreSQL extension that enables vector similarity search directly in our database. This avoids the overhead of managing a separate vector database like Pinecone or Weaviate.',
        detail:
          "Cosine similarity search finds the nearest neighbors to the user's taste vector with sub-100ms performance at scale.",
      },
    ],
  },
  {
    group: 'Infrastructure',
    color: palette.teal,
    items: [
      {
        name: 'Redis',
        role: 'Data Store',
        rationale:
          'Acts as the job store for our background tasks and the coordination layer for global rate limiting across our AI pipeline.',
        detail:
          'Redis ensures that even with multiple worker instances, we never exceed our OpenAI API token-per-minute or request-per-minute quotas.',
      },
      {
        name: 'BullMQ',
        role: 'Job Queue',
        rationale:
          'Handles the heavy lifting of background job scheduling, retries, and failure recovery for the movie data backfill and discovery pipeline.',
        detail: null,
      },
      {
        name: 'Railway',
        role: 'Deployment Platform',
        rationale:
          'The production environment for our multi-service architecture. Railway orchestrates the Next.js app, worker services, PostgreSQL, and Redis in a unified pipeline.',
        detail:
          'The repository is connected via Railway’s GitHub integration, which automatically deploys the monorepo whenever changes are pushed to main.',
      },
      {
        name: 'Turborepo',
        role: 'Build System',
        rationale:
          'Manages monorepo builds with high-performance caching. It ensures that shared packages are built correctly before the apps that consume them.',
        detail: null,
      },
      {
        name: 'Docker',
        role: 'Containerization',
        rationale:
          'Ensures consistent environments from local development to production. Multi-stage Dockerfiles keep the final production images lean and secure.',
        detail: null,
      },
    ],
  },
  {
    group: 'Quality',
    color: palette.amber,
    items: [
      {
        name: 'Vitest',
        role: 'Testing Framework',
        rationale:
          'A Vite-native testing framework that provides near-instant feedback during development. It handles unit and integration tests across the entire monorepo.',
        detail: null,
      },
      {
        name: 'Playwright',
        role: 'E2E Testing',
        rationale:
          'Ensures the critical path from quiz submission to movie recommendations works flawlessly across all modern browser engines.',
        detail: null,
      },
      {
        name: 'Storybook',
        role: 'Component Lab',
        rationale:
          'Allows for isolated development and testing of UI components, ensuring visual consistency and accessibility before they are integrated into the app.',
        detail: null,
      },
      {
        name: 'MSW',
        role: 'API Mocking',
        rationale:
          'Mock Service Worker intercepts network requests at the browser level, allowing the UI to be developed against realistic API responses without a live backend.',
        detail: null,
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
