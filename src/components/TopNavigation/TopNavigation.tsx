'use client';

import { Rubik_Gemstones } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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

  const navigationLinks = [
    { href: '/about', label: 'About' },
    { href: '/available-movies', label: 'Available Movies' },
  ];

  const isActiveLink = (href: string) => pathname === href;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="w-full mb-8 sm:mb-12">
      <div className="flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-1">
          <div
            className={`w-[${logoSize}px] h-[${logoSize}px] flex items-center justify-center flex-shrink-0`}
          >
            <Mascot
              firstStripeColor={firstStripeColor}
              secondStripeColor={secondStripeColor}
              width={logoSize}
              height={logoSize}
            />
          </div>
          <Link href="/" className="block">
            <h1
              className={`${rubik_Gemstones.className} font-bold text-4xl hover:opacity-80 transition-opacity`}
            >
              PopChoice
            </h1>
          </Link>
        </div>

        {/* Navigation Links - Hidden in minimize mode */}
        {!minimizeMode && (
          <>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActiveLink(link.href)
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-sm'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span
                  className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${
                    isMenuOpen ? 'rotate-45 translate-y-1' : ''
                  }`}
                />
                <span
                  className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 mt-1 ${
                    isMenuOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 mt-1 ${
                    isMenuOpen ? '-rotate-45 -translate-y-1' : ''
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
            isMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="pt-4 pb-2 border-t border-gray-200 dark:border-gray-700 mt-4">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg font-medium transition-all duration-200 mb-2 ${
                  isActiveLink(link.href)
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
