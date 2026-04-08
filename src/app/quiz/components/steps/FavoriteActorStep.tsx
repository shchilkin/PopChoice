'use client';

import { User } from 'lucide-react';

import { usePCTheme } from '@/hooks/usePCTheme';

import type { PersonAnswers } from '../../types';

interface FavoriteActorStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  onSubmit: () => void;
}

export function FavoriteActorStep({ person, onUpdate, onSubmit }: FavoriteActorStepProps) {
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
          <User size={20} />
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
          Who&apos;s your favorite actor?
        </h2>
      </div>
      <p
        style={{
          color: 'var(--pc-t3)',
          fontSize: '0.88rem',
          marginTop: -8,
        }}
      >
        Optional — helps us find films featuring people you already love.
      </p>

      <div className="relative">
        <input
          autoFocus
          value={person.favoriteActor}
          onChange={(e) => onUpdate({ favoriteActor: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="e.g. Tom Hanks, Meryl Streep, Cillian Murphy…"
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
          {[
            'Tom Hanks',
            'Meryl Streep',
            'Leonardo DiCaprio',
            'Cate Blanchett',
            'Denzel Washington',
            'Scarlett Johansson',
          ].map((actor) => (
            <button
              key={actor}
              onClick={() => onUpdate({ favoriteActor: actor })}
              className="px-3 py-1.5 rounded-xl text-sm transition-all duration-150"
              style={{
                background:
                  person.favoriteActor === actor
                    ? isDark
                      ? 'rgba(245,197,24,0.2)'
                      : 'rgba(196,149,10,0.12)'
                    : chipUnselectedBg,
                border:
                  person.favoriteActor === actor
                    ? '1px solid rgba(245,197,24,0.4)'
                    : '1px solid var(--pc-bd1)',
                color: person.favoriteActor === actor ? 'var(--pc-gold)' : 'var(--pc-t2)',
              }}
            >
              {actor}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
