'use client';

import { motion } from 'motion/react';

const FAQ = [
  {
    q: 'Does PopChoice require an account?',
    a: 'Nope! PopChoice is completely anonymous and requires no sign-up. Just answer the quiz and get your picks.',
  },
  {
    q: 'How does group mode work?',
    a: "Each person in the group fills out the 5-question quiz on the same device. PopChoice then finds films that score highly across everyone's taste profiles — a true compromise, but a good one.",
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

export function FAQSection() {
  return (
    <section className="mb-14">
      <h2
        className="mb-6"
        style={{
          fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
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
