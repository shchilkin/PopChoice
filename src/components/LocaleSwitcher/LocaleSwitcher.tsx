'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export const LocaleSwitcher = () => {
  const params = useParams();
  const router = useRouter();
  const currentLocale = params.locale as string;

  const [isOpen, setIsOpen] = useState(false);

  const locales = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'fi', name: 'Suomi' },
  ];

  const handleLocaleChange = (locale: string) => {
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${currentLocale}`, `/${locale}`);
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 right-4">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {locales.find((l) => l.code === currentLocale)?.name || 'English'}
          <svg
            className="w-5 h-5 ml-2 -mr-1 inline"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
            <div className="py-1">
              {locales.map((locale) => (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleChange(locale.code)}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    currentLocale === locale.code ? 'bg-gray-100 font-medium' : ''
                  }`}
                >
                  {locale.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
