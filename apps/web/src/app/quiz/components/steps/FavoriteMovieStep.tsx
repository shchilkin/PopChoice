'use client';

import { Clapperboard } from 'lucide-react';

import { useLanguage } from '@/i18n';

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
  const { t } = useLanguage();
  const quickPicks = [
    { label: 'The Dark Knight', value: 'The Dark Knight' },
    { label: 'Inception', value: 'Inception' },
    { label: 'Parasite', value: 'Parasite' },
    { label: 'Pulp Fiction', value: 'Pulp Fiction' },
    { label: 'The Matrix', value: 'The Matrix' },
    { label: 'Coco', value: 'Coco' },
  ];

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(245,197,24,0.15)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <Clapperboard size={20} />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '1.8rem',
            letterSpacing: '0.04em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          {t.quiz.favoriteMovie.title}
        </h2>
      </div>
      <p
        style={{
          color: 'var(--pc-t3)',
          fontSize: '0.88rem',
          marginTop: -8,
        }}
      >
        {t.quiz.favoriteMovie.hint}
      </p>

      <div className="relative">
        <input
          autoFocus
          name="favoriteMovie"
          value={person.favoriteMovie}
          onChange={(e) => onUpdate({ favoriteMovie: e.target.value, hasNoReferenceMovie: false })}
          onKeyDown={(e) => e.key === 'Enter' && canProceed && onSubmit()}
          placeholder={t.quiz.favoriteMovie.placeholder}
          className="w-full rounded-2xl px-5 py-4 outline-none transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
          style={{
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t1)',
            fontSize: '1rem',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--pc-gold-focus)';
            (e.currentTarget as HTMLInputElement).style.boxShadow = 'var(--pc-gold-ring)';
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
          {t.quiz.favoriteMovie.popularPicks}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onUpdate({ favoriteMovie: '', hasNoReferenceMovie: true })}
            className="px-3 py-1.5 rounded-xl text-sm transition-all duration-150"
            style={{
              background: person.hasNoReferenceMovie ? 'var(--pc-gold-tint)' : 'var(--pc-ghost)',
              border: person.hasNoReferenceMovie
                ? '1px solid var(--pc-gold-bd-strong)'
                : '1px solid var(--pc-bd1)',
              color: person.hasNoReferenceMovie ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
            }}
          >
            {t.quiz.favoriteMovie.noReference}
          </button>
          {quickPicks.map((film) => (
            <button
              key={film.value}
              onClick={() => onUpdate({ favoriteMovie: film.value, hasNoReferenceMovie: false })}
              className="px-3 py-1.5 rounded-xl text-sm transition-all duration-150"
              style={{
                background:
                  person.favoriteMovie === film.value ? 'var(--pc-gold-tint)' : 'var(--pc-ghost)',
                border:
                  person.favoriteMovie === film.value
                    ? '1px solid var(--pc-gold-bd-strong)'
                    : '1px solid var(--pc-bd1)',
                color: person.favoriteMovie === film.value ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
              }}
            >
              {film.label}
            </button>
          ))}
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
          {t.quiz.favoriteMovie.why}{' '}
          <span style={{ color: 'var(--pc-t4)', fontWeight: 400 }}>
            {t.quiz.favoriteMovie.whyOptional}
          </span>
        </p>
        <textarea
          value={person.favoriteMovieWhy}
          name="favoriteMovieWhy"
          onChange={(e) => onUpdate({ favoriteMovieWhy: e.target.value.slice(0, 300) })}
          placeholder={t.quiz.favoriteMovie.whyPlaceholder}
          rows={3}
          className="w-full resize-none rounded-2xl px-5 py-4 outline-none transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
          style={{
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t1)',
            fontSize: '0.9rem',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--pc-gold-focus)';
            e.currentTarget.style.boxShadow = 'var(--pc-gold-ring)';
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
