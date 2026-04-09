'use client';

import { Brain, Database, Search, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

const TECH_ICONS = [Search, Brain, Database, Zap];
const TECH_COLORS = [palette.teal, palette.purple, palette.gold, palette.amber];

export function TechStackSection() {
  const { t } = useLanguage();

  return (
    <section className="mb-16">
      <h2
        className="mb-6"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: '1.6rem',
          letterSpacing: '0.05em',
          color: 'var(--pc-t1)',
        }}
      >
        {t.about.techStack.title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {t.about.techStack.items.map((tech, i) => {
          const Icon = TECH_ICONS[i];
          const color = TECH_COLORS[i];
          if (!Icon || !color) return null;
          return (
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
                style={{ background: `${color}18`, color }}
              >
                <Icon size={17} />
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
          );
        })}
      </div>
    </section>
  );
}
