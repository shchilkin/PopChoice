'use client';

import { Clapperboard } from 'lucide-react';

import { usePCTheme } from '@/hooks/usePCTheme';

import type { PersonAnswers } from '../../types';

interface FavoriteMovieStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  onSubmit: () => void;
  canProceed: boolean;
}

export function FavoriteMovieStep({
  person,
  onUpdate,
  onSubmit,
  canProceed,
}: FavoriteMovieStepProps) {
  const { isDark } = usePCTheme();
  const chipUnselectedBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(245,197,24,0.15)',
            color: 'var(--pc-gold)',
          }}
        >
          <Clapperboard size={20} />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
            fontSize: '1.8rem',
            letterSpacing: '0.04em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          What&apos;s your favorite movie?
        </h2>
      </div>
      <p
        style={{
          color: 'var(--pc-t3)',
          fontSize: '0.88rem',
          marginTop: -8,
        }}
      >
        This helps us understand your taste. Any film that made an impression on you.
      </p>

      <div className="relative">
        <input
          autoFocus
          value={person.favoriteMovie}
          onChange={(e) => onUpdate({ favoriteMovie: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && canProceed && onSubmit()}
          placeholder="e.g. The Dark Knight, Parasite, Coco…"
          className="w-full px-5 py-4 rounded-2xl outline-none transition-all duration-200"
          style={{
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t1)',
            fontSize: '1rem',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = isDark
              ? 'rgba(245,197,24,0.4)'
              : 'rgba(196,149,10,0.5)';
            (e.currentTarget as HTMLInputElement).style.boxShadow =
              '0 0 0 3px rgba(245,197,24,0.06)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--pc-bd2)';
            (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Quick suggestions */}
      <div>
        <p
          style={{
            color: 'var(--pc-t4)',
            fontSize: '0.78rem',
            marginBottom: 10,
          }}
        >
          POPULAR PICKS
        </p>
        <div className="flex flex-wrap gap-2">
          {['The Dark Knight', 'Inception', 'Parasite', 'Pulp Fiction', 'The Matrix', 'Coco'].map(
            (film) => (
              <button
                key={film}
                onClick={() => onUpdate({ favoriteMovie: film })}
                className="px-3 py-1.5 rounded-xl text-sm transition-all duration-150"
                style={{
                  background:
                    person.favoriteMovie === film
                      ? isDark
                        ? 'rgba(245,197,24,0.2)'
                        : 'rgba(196,149,10,0.12)'
                      : chipUnselectedBg,
                  border:
                    person.favoriteMovie === film
                      ? '1px solid rgba(245,197,24,0.4)'
                      : '1px solid var(--pc-bd1)',
                  color: person.favoriteMovie === film ? 'var(--pc-gold)' : 'var(--pc-t2)',
                }}
              >
                {film}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Optional Why? */}
      <div>
        <p
          style={{
            color: 'var(--pc-t4)',
            fontSize: '0.78rem',
            marginBottom: 8,
          }}
        >
          WHY? <span style={{ color: 'var(--pc-t4)', fontWeight: 400 }}>(optional)</span>
        </p>
        <textarea
          value={person.favoriteMovieWhy}
          onChange={(e) => onUpdate({ favoriteMovieWhy: e.target.value.slice(0, 300) })}
          placeholder="Share your thoughts — plot, characters, what made it special…"
          rows={3}
          className="w-full px-5 py-4 rounded-2xl outline-none transition-all duration-200 resize-none"
          style={{
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t1)',
            fontSize: '0.9rem',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = isDark
              ? 'rgba(245,197,24,0.4)'
              : 'rgba(196,149,10,0.5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.06)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--pc-bd2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <p
          style={{
            color: 'var(--pc-t4)',
            fontSize: '0.75rem',
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          {person.favoriteMovieWhy.length}/300
        </p>
      </div>
    </div>
  );
}
