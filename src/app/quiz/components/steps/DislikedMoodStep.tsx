'use client';

import { CircleOff } from 'lucide-react';

import { useLanguage } from '@/i18n';

import { GENRES } from '../../constants';

import type { PersonAnswers } from '../../types';

interface DislikedMoodStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

export function DislikedMoodStep({ person, onUpdate }: DislikedMoodStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(239,68,68,0.14)',
            color: '#EF4444',
          }}
        >
          <CircleOff size={20} />
        </div>
        <div>
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
            {t.quiz.dislikedMood.title}
          </h2>
          <p
            style={{
              color: 'var(--pc-t3)',
              fontSize: '0.82rem',
              marginTop: 2,
            }}
          >
            {t.quiz.dislikedMood.pickAny}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GENRES.map((g) => {
          const selected = person.dislikedGenres.includes(g.id);
          const label = t.genres[g.id as keyof typeof t.genres] ?? g.label;
          return (
            <button
              key={g.id}
              onClick={() => {
                const dislikedGenres = selected
                  ? person.dislikedGenres.filter((m) => m !== g.id)
                  : [...person.dislikedGenres, g.id];
                onUpdate({ dislikedGenres });
              }}
              className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: selected ? `${g.color}14` : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${g.color}55` : '1px solid var(--pc-bd1)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: selected ? `${g.color}25` : 'var(--pc-ghost)',
                  color: selected ? g.color : 'var(--pc-t3)',
                }}
              >
                <g.icon size={15} />
              </div>
              <span
                style={{
                  color: selected ? g.color : 'var(--pc-t2)',
                  fontWeight: selected ? 600 : 400,
                  fontSize: '0.88rem',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onUpdate({ dislikedGenres: [] })}
        className="self-center px-4 py-2 rounded-lg text-sm transition-all duration-200 active:scale-[0.97]"
        style={{
          color: 'var(--pc-t3)',
          border: '1px dashed var(--pc-bd2)',
          background: 'transparent',
        }}
      >
        {t.quiz.dislikedMood.skip}
      </button>

      {person.dislikedGenres.length > 0 && (
        <p
          style={{
            color: 'var(--pc-t3)',
            fontSize: '0.78rem',
            textAlign: 'center',
          }}
        >
          {person.dislikedGenres.length === 1
            ? t.quiz.dislikedMood.selectedSingular.replace(
                '{n}',
                String(person.dislikedGenres.length),
              )
            : t.quiz.dislikedMood.selectedPlural.replace(
                '{n}',
                String(person.dislikedGenres.length),
              )}
        </p>
      )}
    </div>
  );
}
