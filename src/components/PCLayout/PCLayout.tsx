'use client';

import { Menu, Moon, Sun, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the drawer whenever the route changes (logo tap, browser back/forward, etc.)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/about', label: t.nav.howItWorks },
    { href: '/available-movies', label: t.nav.availableMovies },
  ];

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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
              style={{
                color: pathname === link.href ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
                background: pathname === link.href ? 'var(--pc-gold-subtle)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}

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

        {/* Mobile: right-side controls */}
        <div className="flex md:hidden items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
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

          {/* Hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
            style={{
              background: mobileMenuOpen ? 'var(--pc-gold-subtle)' : 'var(--pc-ghost)',
              border: '1px solid var(--pc-bd2)',
            }}
            aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? (
              <X size={16} style={{ color: 'var(--pc-t2)' }} />
            ) : (
              <Menu size={16} style={{ color: 'var(--pc-t2)' }} />
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          className="md:hidden z-40 flex flex-col gap-1 px-4 py-3"
          style={{
            background: 'var(--pc-header-bg)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--pc-bd1)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm transition-colors duration-200"
              style={{
                color: pathname === link.href ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
                background: pathname === link.href ? 'var(--pc-gold-subtle)' : 'transparent',
                fontWeight: pathname === link.href ? 600 : 400,
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <LanguageSwitcher />
            {!isLanding && (
              <Link
                href="/quiz"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'var(--pc-cta)',
                  color: 'var(--pc-cta-text)',
                  fontWeight: 600,
                }}
              >
                {t.nav.findAMovie}
              </Link>
            )}
          </div>
        </nav>
      )}

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
