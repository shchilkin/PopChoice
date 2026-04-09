'use client';

import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';

export function FAQSection() {
  const { t } = useLanguage();

  return (
    <section className="mb-14">
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
        {t.about.faq.title}
      </h2>
      <div className="flex flex-col gap-4">
        {t.about.faq.items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="p-5 rounded-2xl"
            style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
          >
            <h4
              className="mb-2"
              style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
            >
              {item.q}
            </h4>
            <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.7 }}>{item.a}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
