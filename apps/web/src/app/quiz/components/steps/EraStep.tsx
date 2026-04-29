'use client';

import { Clock } from 'lucide-react';

import type { Era, PersonAnswers } from '../../types';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

interface EraStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

export function EraStep({ person, onUpdate }: EraStepProps) {
  const { t } = useLanguage();

  const ERA_OPTIONS = [
    {
      id: 'new' as Era,
      emoji: '✨',
      title: t.quiz.era.new.title,
      desc: t.quiz.era.new.desc,
      color: palette.teal,
    },
    {
      id: 'classic' as Era,
      emoji: '🎞️',
      title: t.quiz.era.classic.title,
      desc: t.quiz.era.classic.desc,
      color: palette.gold,
    },
    {
      id: 'both' as Era,
      emoji: '🎬',
      title: t.quiz.era.both.title,
      desc: t.quiz.era.both.desc,
      color: palette.purple,
    },
  ];

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(255,159,28,0.15)',
            color: 'var(--pc-amber)',
          }}
        >
          <Clock size={20} />
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
          {t.quiz.era.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {ERA_OPTIONS.map((opt) => {
          const selected = person.era === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onUpdate({ era: opt.id })}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
              style={{
                background: selected ? `${opt.color}18` : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${opt.color}60` : '1px solid var(--pc-bd2)',
                boxShadow: selected ? `0 0 20px ${opt.color}18` : 'none',
              }}
            >
              <div className="text-2xl">{opt.emoji}</div>
              <div className="flex-1">
                <div
                  style={{
                    color: selected ? opt.color : 'var(--pc-t1)',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  }}
                >
                  {opt.title}
                </div>
                <div
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.82rem',
                  }}
                >
                  {opt.desc}
                </div>
              </div>
              {selected && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: opt.color }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5L8 3"
                      stroke="var(--pc-cta-text)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
