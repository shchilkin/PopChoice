'use client';

import Image from 'next/image';

import { useLanguage } from '@/i18n';

export function TMDBAttribution() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/tmdb-logo.svg"
          alt="The Movie Database logo"
          width={60}
          height={43}
          className="inline-block"
        />
        <p className="text-sm text-[var(--muted-foreground)]">{t.tmdbAttribution.disclaimer}</p>
      </div>
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[var(--primary)] hover:text-[var(--primary-foreground)] hover:bg-[var(--primary)] underline transition-colors duration-200"
      >
        {t.tmdbAttribution.visitLink}
      </a>
    </div>
  );
}
