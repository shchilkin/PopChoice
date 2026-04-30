'use client';

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
      <div
        style={{
          borderTop: '1px solid var(--pc-bd1)',
        }}
      >
        {t.about.faq.items.map((item, i) => (
          <details key={i} style={{ borderBottom: '1px solid var(--pc-bd1)' }} className="group">
            <summary
              className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none select-none"
              style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
            >
              <span>{item.q}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  color: 'var(--pc-t4)',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease-out',
                }}
                className="group-open:rotate-180"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <p
              className="pb-4"
              style={{
                color: 'var(--pc-t3)',
                fontSize: '0.85rem',
                lineHeight: 1.7,
                paddingRight: '2rem',
              }}
            >
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
