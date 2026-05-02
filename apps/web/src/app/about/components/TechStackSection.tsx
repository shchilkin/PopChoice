'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

import { useLanguage } from '@/i18n';

export function TechStackSection() {
  const { t } = useLanguage();
  const { title, linkText, groups } = t.about.techStack;

  return (
    <section className="mb-16">
      <h2
        className="mb-8"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: '1.6rem',
          letterSpacing: '0.05em',
          color: 'var(--pc-t1)',
        }}
      >
        {title}
      </h2>

      <div className="flex flex-col gap-10">
        {groups.map((group, gi) => (
          <div key={gi}>
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
              {group.label}
            </p>
            <div style={{ borderTop: '1px solid var(--pc-bd1)' }}>
              {group.items.map((item, ii) => (
                <motion.div
                  key={ii}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: gi * 0.05 + ii * 0.06 }}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-3.5"
                  style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                >
                  <span
                    className="shrink-0"
                    style={{
                      color: 'var(--pc-t1)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      minWidth: '14rem',
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {item.why}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/about/tech-stack"
          className="inline-flex items-center gap-1.5 transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--pc-t3)', fontSize: '0.835rem' }}
        >
          {linkText}
        </Link>
      </div>
    </section>
  );
}
