'use client';

import { useLanguage } from '@/i18n';

import { Navbar } from './Navbar';

export function PCLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--pc-bg)',
        color: 'var(--pc-t1)',
        fontFamily: "var(--font-manrope), 'Manrope', 'Inter', sans-serif",
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      <Navbar />

      <main className="flex-1 flex flex-col">{children}</main>

      <footer
        className="text-center py-5 text-xs"
        style={{
          color: 'var(--pc-footer)',
          borderTop: '1px solid var(--pc-footer-bd)',
        }}
      >
        <span style={{ color: 'var(--pc-gold-text)' }}>🍿</span> {t.footer.builtBy}{' '}
        <a
          href="https://github.com/shchilkin"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--pc-gold-text)' }}
        >
          {t.footer.authorName}
        </a>{' '}
        — {t.footer.tagline}
      </footer>
    </div>
  );
}
