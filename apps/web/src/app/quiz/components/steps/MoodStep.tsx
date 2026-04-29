'use client';

import { Smile } from 'lucide-react';

import { GENRES } from '../../constants';

import type { PersonAnswers } from '../../types';

import { useLanguage } from '@/i18n';

interface MoodStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

export function MoodStep({ person, onUpdate }: MoodStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(139,92,246,0.15)',
            color: '#8B5CF6',
          }}
        >
          <Smile size={20} />
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
            {t.quiz.mood.title}
          </h2>
          <p
            style={{
              color: 'var(--pc-t3)',
              fontSize: '0.82rem',
              marginTop: 2,
            }}
          >
            {t.quiz.mood.pickOne}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GENRES.map((g) => {
          const selected = person.moods.includes(g.id);
          const label = t.genres[g.id as keyof typeof t.genres] ?? g.label;
          return (
            <button
              key={g.id}
              onClick={() => {
                const newMoods = selected
                  ? person.moods.filter((m) => m !== g.id)
                  : [...person.moods, g.id];
                onUpdate({ moods: newMoods });
              }}
              className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: selected ? `${g.color}18` : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${g.color}50` : '1px solid var(--pc-bd1)',
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

      {person.moods.length > 0 && (
        <p
          style={{
            color: 'var(--pc-t3)',
            fontSize: '0.78rem',
            textAlign: 'center',
          }}
        >
          {person.moods.length === 1
            ? t.quiz.mood.selectedSingular.replace('{n}', String(person.moods.length))
            : t.quiz.mood.selectedPlural.replace('{n}', String(person.moods.length))}
        </p>
      )}
    </div>
  );
}
