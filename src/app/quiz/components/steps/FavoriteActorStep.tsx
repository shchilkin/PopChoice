'use client';

import { User } from 'lucide-react';

import { useLanguage } from '@/i18n';

import type { PersonAnswers } from '../../types';

interface FavoriteActorStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  onSubmit: () => void;
}

export function FavoriteActorStep({ person, onUpdate, onSubmit }: FavoriteActorStepProps) {
  const { t } = useLanguage();

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
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '1.8rem',
            letterSpacing: '0.04em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          {t.quiz.actor.title}
        </h2>
      </div>
      <p
        style={{
          color: 'var(--pc-t3)',
          fontSize: '0.88rem',
          marginTop: -8,
        }}
      >
        {t.quiz.actor.hint}
      </p>

      <div className="relative">
        <input
          autoFocus
          value={person.favoriteActor}
          onChange={(e) => onUpdate({ favoriteActor: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={t.quiz.actor.placeholder}
          className="w-full px-5 py-4 rounded-2xl outline-none transition-all duration-200"
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
          {t.quiz.actor.popularPicks}
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
                  person.favoriteActor === actor ? 'var(--pc-gold-tint)' : 'var(--pc-ghost)',
                border:
                  person.favoriteActor === actor
                    ? '1px solid var(--pc-gold-bd-strong)'
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
