'use client';

import { Menu, Moon, Sun, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Suspense,
  startTransition,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { useAuth } from '@/components/AuthProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Mascot } from '@/components/Mascot';
import { usePCTheme } from '@/hooks/usePCTheme';
import { useLanguage } from '@/i18n';
import { type Translations } from '@/i18n/locales/en';
import { createFreshQuizHref } from '@/lib/quizNavigation';

type NavLink = {
  href: string;
  label: string;
};

type LayoutNavigationProps = {
  isAuthenticated: boolean;
  isDark: boolean;
  logout: () => Promise<void>;
  mobileMenuOpen: boolean;
  navLinks: NavLink[];
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  t: Translations;
  toggle: () => void;
};

type FreshQuizLinkProps = {
  label: string;
  onStart: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  show: boolean;
  variant: 'desktop' | 'mobile';
};

function ThemeToggleButton({
  isDark,
  toggle,
  label,
  className,
}: {
  isDark: boolean;
  toggle: () => void;
  label: string;
  className: string;
}) {
  return (
    <button
      onClick={toggle}
      className={className}
      style={{
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        border: '1px solid var(--pc-bd2)',
      }}
      aria-label={label}
    >
      {isDark ? (
        <Sun size={15} style={{ color: 'var(--pc-t2)' }} />
      ) : (
        <Moon size={15} style={{ color: 'var(--pc-t2)' }} />
      )}
    </button>
  );
}

function DesktopNavigationBar({
  currentPath,
  isAuthenticated,
  isDark,
  logout,
  navLinks,
  showFreshQuizLink,
  startFreshQuiz,
  t,
  toggle,
}: LayoutNavigationProps & {
  currentPath: string;
  showFreshQuizLink: boolean;
  startFreshQuiz?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      <DesktopNavLinks currentPath={currentPath} navLinks={navLinks} />
      <DesktopLogoutButton isAuthenticated={isAuthenticated} label={t.nav.logOut} logout={logout} />
      <LanguageSwitcher />
      <ThemeToggleButton
        isDark={isDark}
        toggle={toggle}
        label={t.nav.toggleTheme}
        className="ml-1 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
      />
      <FreshQuizLink
        label={t.nav.findAMovie}
        onStart={startFreshQuiz ?? preventFreshQuizFallback}
        show={showFreshQuizLink}
        variant="desktop"
      />
    </nav>
  );
}

function DesktopNavLinks({ currentPath, navLinks }: { currentPath: string; navLinks: NavLink[] }) {
  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
          style={desktopNavLinkStyle(currentPath.startsWith(link.href))}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

function DesktopLogoutButton({
  isAuthenticated,
  label,
  logout,
}: {
  isAuthenticated: boolean;
  label: string;
  logout: () => Promise<void>;
}) {
  if (!isAuthenticated) return null;

  return (
    <button
      onClick={() => {
        void logout();
      }}
      className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
      style={{ color: 'var(--pc-t3)', background: 'transparent' }}
    >
      {label}
    </button>
  );
}

function MobileNavigationControls({
  isDark,
  mobileMenuOpen,
  setMobileMenuOpen,
  t,
  toggle,
}: Pick<
  LayoutNavigationProps,
  'isDark' | 'mobileMenuOpen' | 'setMobileMenuOpen' | 't' | 'toggle'
>) {
  return (
    <div className="flex md:hidden items-center gap-1">
      <ThemeToggleButton
        isDark={isDark}
        toggle={toggle}
        label={t.nav.toggleTheme}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
      />

      <button
        onClick={() => setMobileMenuOpen((prev) => !prev)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
        style={mobileMenuButtonStyle(mobileMenuOpen)}
        aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-nav-drawer"
      >
        <MobileMenuIcon open={mobileMenuOpen} />
      </button>
    </div>
  );
}

function MobileMenuIcon({ open }: { open: boolean }) {
  return open ? (
    <X size={16} style={{ color: 'var(--pc-t2)' }} />
  ) : (
    <Menu size={16} style={{ color: 'var(--pc-t2)' }} />
  );
}

function MobileNavigationDrawer({
  currentPath,
  isAuthenticated,
  isOpen,
  logout,
  navLinks,
  setMobileMenuOpen,
  showFreshQuizLink,
  startFreshQuiz,
  t,
}: Pick<
  LayoutNavigationProps,
  'isAuthenticated' | 'logout' | 'navLinks' | 'setMobileMenuOpen' | 't'
> & {
  currentPath: string;
  isOpen: boolean;
  showFreshQuizLink: boolean;
  startFreshQuiz: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  if (!isOpen) return null;

  return (
    <nav
      id="mobile-nav-drawer"
      className="md:hidden z-40 flex flex-col gap-1 px-4 py-3"
      style={{
        background: 'var(--pc-header-bg)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--pc-bd1)',
      }}
    >
      <MobileNavLinks
        currentPath={currentPath}
        navLinks={navLinks}
        onNavigate={() => setMobileMenuOpen(false)}
      />
      <MobileLogoutButton
        isAuthenticated={isAuthenticated}
        label={t.nav.logOut}
        logout={logout}
        onNavigate={() => setMobileMenuOpen(false)}
      />
      <div className="flex items-center gap-2 pt-1">
        <LanguageSwitcher />
        <FreshQuizLink
          label={t.nav.findAMovie}
          onStart={startFreshQuiz}
          show={showFreshQuizLink}
          variant="mobile"
        />
      </div>
    </nav>
  );
}

function MobileNavLinks({
  currentPath,
  navLinks,
  onNavigate,
}: {
  currentPath: string;
  navLinks: NavLink[];
  onNavigate: () => void;
}) {
  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="px-3 py-2.5 rounded-xl text-sm transition-colors duration-200"
          style={mobileNavLinkStyle(currentPath.startsWith(link.href))}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

function MobileLogoutButton({
  isAuthenticated,
  label,
  logout,
  onNavigate,
}: {
  isAuthenticated: boolean;
  label: string;
  logout: () => Promise<void>;
  onNavigate: () => void;
}) {
  if (!isAuthenticated) return null;

  return (
    <button
      onClick={() => {
        onNavigate();
        void logout();
      }}
      className="px-3 py-2.5 rounded-xl text-sm text-left transition-colors duration-200"
      style={{ color: 'var(--pc-t2)', background: 'transparent' }}
    >
      {label}
    </button>
  );
}

function FreshQuizLink({ label, onStart, show, variant }: FreshQuizLinkProps) {
  if (!show) return null;

  return (
    <Link
      href="/quiz"
      onClick={onStart}
      className={freshQuizLinkClassName(variant)}
      style={{
        background: 'var(--pc-cta)',
        color: 'var(--pc-cta-text)',
        fontWeight: 600,
      }}
    >
      {label}
    </Link>
  );
}

function preventFreshQuizFallback(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

function desktopNavLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    color: isActive ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
    background: isActive ? 'var(--pc-gold-subtle)' : 'transparent',
  };
}

function mobileNavLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    color: isActive ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
    background: isActive ? 'var(--pc-gold-subtle)' : 'transparent',
    fontWeight: isActive ? 600 : 400,
  };
}

function mobileMenuButtonStyle(isOpen: boolean): React.CSSProperties {
  return {
    background: isOpen ? 'var(--pc-gold-subtle)' : 'var(--pc-ghost)',
    border: '1px solid var(--pc-bd2)',
  };
}

function freshQuizLinkClassName(variant: FreshQuizLinkProps['variant']): string {
  return variant === 'desktop'
    ? 'ml-1 px-3 py-2 rounded-xl text-sm'
    : 'flex-1 text-center px-3 py-2.5 rounded-xl text-sm';
}

function LayoutNavigationFallback({
  isAuthenticated,
  isDark,
  logout,
  mobileMenuOpen,
  navLinks,
  setMobileMenuOpen,
  t,
  toggle,
}: LayoutNavigationProps) {
  return (
    <>
      <DesktopNavigationBar
        currentPath=""
        isAuthenticated={isAuthenticated}
        isDark={isDark}
        logout={logout}
        mobileMenuOpen={mobileMenuOpen}
        navLinks={navLinks}
        setMobileMenuOpen={setMobileMenuOpen}
        showFreshQuizLink={false}
        t={t}
        toggle={toggle}
      />
      <MobileNavigationControls
        isDark={isDark}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        t={t}
        toggle={toggle}
      />
    </>
  );
}

function LayoutNavigation({
  isAuthenticated,
  isDark,
  logout,
  mobileMenuOpen,
  navLinks,
  setMobileMenuOpen,
  t,
  toggle,
}: LayoutNavigationProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? '';
  const isLanding = currentPath === '/';

  function startFreshQuiz() {
    setMobileMenuOpen(false);
    window.location.assign(createFreshQuizHref());
  }

  useEffect(() => {
    startTransition(() => {
      setMobileMenuOpen(false);
    });
  }, [pathname, setMobileMenuOpen]);

  return (
    <>
      <DesktopNavigationBar
        currentPath={currentPath}
        isAuthenticated={isAuthenticated}
        isDark={isDark}
        logout={logout}
        mobileMenuOpen={mobileMenuOpen}
        navLinks={navLinks}
        setMobileMenuOpen={setMobileMenuOpen}
        showFreshQuizLink={!isLanding}
        startFreshQuiz={(event) => {
          event.preventDefault();
          startFreshQuiz();
        }}
        t={t}
        toggle={toggle}
      />
      <MobileNavigationControls
        isDark={isDark}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        t={t}
        toggle={toggle}
      />
      <MobileNavigationDrawer
        currentPath={currentPath}
        isAuthenticated={isAuthenticated}
        isOpen={mobileMenuOpen}
        logout={logout}
        navLinks={navLinks}
        setMobileMenuOpen={setMobileMenuOpen}
        showFreshQuizLink={!isLanding}
        startFreshQuiz={(event) => {
          event.preventDefault();
          startFreshQuiz();
        }}
        t={t}
      />
    </>
  );
}

export function PCLayout({ children }: { children: ReactNode }) {
  const { isDark, toggle } = usePCTheme();
  const { isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/about', label: t.nav.howItWorks },
    { href: '/available-movies', label: t.nav.availableMovies },
    ...(isAuthenticated
      ? [{ href: '/account', label: t.nav.account }]
      : [
          { href: '/login', label: t.nav.logIn },
          { href: '/register', label: t.nav.signUp },
        ]),
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
              color: 'var(--pc-gold-text)',
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '1.4rem',
              letterSpacing: '0.12em',
            }}
          >
            PopChoice
          </span>
        </Link>

        <Suspense
          fallback={
            <LayoutNavigationFallback
              isAuthenticated={isAuthenticated}
              isDark={isDark}
              logout={logout}
              mobileMenuOpen={mobileMenuOpen}
              navLinks={navLinks}
              setMobileMenuOpen={setMobileMenuOpen}
              t={t}
              toggle={toggle}
            />
          }
        >
          <LayoutNavigation
            isAuthenticated={isAuthenticated}
            isDark={isDark}
            logout={logout}
            mobileMenuOpen={mobileMenuOpen}
            navLinks={navLinks}
            setMobileMenuOpen={setMobileMenuOpen}
            t={t}
            toggle={toggle}
          />
        </Suspense>
      </header>

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
          style={{
            color: 'var(--pc-gold-text)',
            textDecorationColor: 'color-mix(in srgb, var(--pc-gold-text) 65%, transparent)',
            textDecorationLine: 'underline',
            textUnderlineOffset: '0.18em',
          }}
        >
          {t.footer.authorName}
        </a>{' '}
        {' · '}
        {t.footer.tagline}
      </footer>
    </div>
  );
}
