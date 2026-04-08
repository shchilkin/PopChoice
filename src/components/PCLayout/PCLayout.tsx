'use client';

import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Mascot } from '@/components/Mascot';
import { usePCTheme } from '@/hooks/usePCTheme';

export function PCLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const { isDark, toggle } = usePCTheme();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--pc-bg)',
        color: 'var(--pc-t1)',
        fontFamily: "var(--font-dm-sans), 'DM Sans', 'Inter', sans-serif",
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
              fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
              fontSize: '1.4rem',
              letterSpacing: '0.12em',
              background: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
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
              background:
                pathname === '/about'
                  ? isDark
                    ? 'rgba(245,197,24,0.1)'
                    : 'rgba(196,149,10,0.1)'
                  : 'transparent',
            }}
          >
            How it works
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="ml-1 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              border: '1px solid var(--pc-bd2)',
            }}
            aria-label="Toggle theme"
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
              Find a movie
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
        Made with <span style={{ color: 'var(--pc-gold)' }}>🍿</span> by PopChoice — AI Movie
        Recommendations
      </footer>
    </div>
  );
}
