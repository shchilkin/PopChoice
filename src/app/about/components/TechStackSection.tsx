'use client';

import { Brain, Database, Search, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { palette } from '@/styles/designTokens';

const TECH_STACK = [
  {
    name: 'Vector Search',
    desc: 'Semantic similarity matching across 10k+ films',
    icon: Search,
    color: palette.teal,
  },
  {
    name: 'AI Language Model',
    desc: 'Generates personalized recommendations for each user',
    icon: Brain,
    color: palette.purple,
  },
  {
    name: 'Film Database',
    desc: 'Curated metadata including tone, themes & cinematography',
    icon: Database,
    color: palette.gold,
  },
  {
    name: 'Real-time Processing',
    desc: 'Fast results — from submission to recommendations in seconds',
    icon: Zap,
    color: palette.amber,
  },
];

export function TechStackSection() {
  return (
    <section className="mb-16">
      <h2
        className="mb-6"
        style={{
          fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
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
            style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
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
  );
}
