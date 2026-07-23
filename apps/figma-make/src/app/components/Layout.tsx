import { Moon, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { usePCTheme } from '../contexts/ThemeContext';

import { PopcornMascot } from './PopcornMascot';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { isDark, toggle } = usePCTheme();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--pc-bg)',
        color: 'var(--pc-t1)',
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-8 py-3"
        style={{
          background: 'var(--pc-header-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--pc-bd1)',
          transition: 'background 0.3s, border-color 0.3s',
        }}
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8">
            <PopcornMascot size={32} />
          </div>
          <span
            className="tracking-widest uppercase group-hover:opacity-80 transition-opacity"
            style={{
              display: 'inline-block',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.4rem',
              letterSpacing: '0.12em',
              background: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            PopChoice
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/about"
            className="px-3 py-2 rounded-xl text-sm transition-all duration-200"
            style={{
              color: location.pathname === '/about' ? 'var(--pc-gold)' : 'var(--pc-t3)',
              background:
                location.pathname === '/about'
                  ? isDark
                    ? 'rgba(245,197,24,0.1)'
                    : 'rgba(196,149,10,0.1)'
                  : 'transparent',
            }}
          >
            How it works
          </Link>
          <Link
            to="/style-guide"
            className="hidden sm:block px-3 py-2 rounded-xl text-sm transition-all duration-200"
            style={{
              color: location.pathname === '/style-guide' ? 'var(--pc-gold)' : 'var(--pc-t3)',
              background:
                location.pathname === '/style-guide'
                  ? isDark
                    ? 'rgba(245,197,24,0.1)'
                    : 'rgba(196,149,10,0.1)'
                  : 'transparent',
            }}
          >
            Style Guide
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="ml-1 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              border: '1px solid var(--pc-bd2)',
              color: 'var(--pc-t2)',
            }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {!isLanding && (
            <Link
              to="/quiz"
              className="ml-1 px-3 py-2 rounded-xl text-sm transition-all duration-200"
              style={{
                background: 'var(--pc-cta)',
                color: '#09090F',
                fontWeight: 600,
              }}
            >
              Find a movie
            </Link>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer
        className="text-center py-5 text-xs"
        style={{
          color: 'var(--pc-footer)',
          borderTop: '1px solid var(--pc-footer-bd)',
          transition: 'color 0.3s, border-color 0.3s',
        }}
      >
        <span>Made with </span>
        <span style={{ color: 'var(--pc-gold)' }}>🍿</span>
        <span> by PopChoice — AI Movie Recommendations</span>
      </footer>
    </div>
  );
}
