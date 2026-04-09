'use client';

import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Mascot } from '@/components/Mascot';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

export function PCLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const { isDark, toggle } = usePCTheme();
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
      {/* Sticky header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-8 py-3"
        style={{
          background: 'var(--pc-header-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--pc-bd1)',
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8">
            <Mascot width={32} height={32} />
          </div>
          <span
            className="tracking-widest uppercase"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '1.4rem',
              letterSpacing: '0.12em',
              background: `linear-gradient(90deg, ${palette.gold}, ${palette.amber})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            PopChoice
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/about"
            className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
            style={{
              color: pathname === '/about' ? 'var(--pc-gold)' : 'var(--pc-t3)',
              background: pathname === '/about' ? 'var(--pc-gold-subtle)' : 'transparent',
            }}
          >
            {t.nav.howItWorks}
          </Link>

          <LanguageSwitcher />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="ml-1 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              border: '1px solid var(--pc-bd2)',
            }}
            aria-label={t.nav.toggleTheme}
          >
            {isDark ? (
              <Sun size={15} style={{ color: 'var(--pc-t2)' }} />
            ) : (
              <Moon size={15} style={{ color: 'var(--pc-t2)' }} />
            )}
          </button>

          {/* CTA button (not on landing) */}
          {!isLanding && (
            <Link
              href="/quiz"
              className="ml-1 px-3 py-2 rounded-xl text-sm"
              style={{
                background: 'var(--pc-cta)',
                color: 'var(--pc-cta-text)',
                fontWeight: 600,
              }}
            >
              {t.nav.findAMovie}
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer
        className="text-center py-5 text-xs"
        style={{
          color: 'var(--pc-footer)',
          borderTop: '1px solid var(--pc-footer-bd)',
        }}
      >
        <span style={{ color: 'var(--pc-gold)' }}>🍿</span> {t.footer.builtBy}{' '}
        <a
          href="https://github.com/shchilkin"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--pc-gold)' }}
        >
          {t.footer.authorName}
        </a>{' '}
        — {t.footer.tagline}
      </footer>
    </div>
  );
}
