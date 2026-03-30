'use client';

import { Rubik_Gemstones } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

import { Mascot } from '../Mascot/Maskot';

const rubik_Gemstones = Rubik_Gemstones({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
});

interface TopNavigationProps {
  firstStripeColor?: string;
  secondStripeColor?: string;
  logoSize?: number;
  minimizeMode?: boolean;
}

export const TopNavigation = ({
  firstStripeColor = '#f20000',
  secondStripeColor = '#fff',
  logoSize = 60,
  minimizeMode = false,
}: TopNavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const navigationLinks = [
    { href: '/about', label: 'About' },
    { href: '/available-movies', label: 'Available Movies' },
  ];

  const isActiveLink = (href: string) => pathname === href;

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Close menu when clicking outside (using mousedown to avoid race condition with toggle)
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, closeMenu]);

  // Close menu on escape key
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen, closeMenu]);

  return (
    <nav ref={navRef} className="w-full mb-8 sm:mb-12">
      <div className="flex items-center justify-between">
        {/* Logo and Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: logoSize, height: logoSize }}
          >
            <Mascot
              firstStripeColor={firstStripeColor}
              secondStripeColor={secondStripeColor}
              width={logoSize}
              height={logoSize}
            />
          </div>
          <h1
            className={`${rubik_Gemstones.className} font-bold text-4xl group-hover:opacity-80 transition-opacity`}
          >
            PopChoice
          </h1>
        </Link>

        {/* Navigation Links - Hidden in minimize mode */}
        {!minimizeMode && (
          <>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    isActiveLink(link.href)
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
            >
              <div className="w-6 h-5 relative flex flex-col justify-between">
                <span
                  className={`block w-full h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 origin-center ${
                    isMenuOpen ? 'rotate-45 translate-y-[9px]' : ''
                  }`}
                />
                <span
                  className={`block w-full h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${
                    isMenuOpen ? 'opacity-0 scale-x-0' : ''
                  }`}
                />
                <span
                  className={`block w-full h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 origin-center ${
                    isMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''
                  }`}
                />
              </div>
            </button>
          </>
        )}
      </div>

      {/* Mobile Navigation Menu - Hidden in minimize mode */}
      {!minimizeMode && (
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="pt-4 pb-2 mt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-1">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${
                  isActiveLink(link.href)
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
