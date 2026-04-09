'use client';

import { Moon } from 'lucide-react';

import { TONES } from '../../constants';

import type { PersonAnswers, Tone } from '../../types';

interface ToneStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

export function ToneStep({ person, onUpdate }: ToneStepProps) {
  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(245,197,24,0.15)',
            color: 'var(--pc-gold)',
          }}
        >
          <Moon size={20} />
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
          What tone are you after?
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TONES.map((t) => {
          const selected = person.tone === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onUpdate({ tone: t.id as Tone })}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: selected ? t.grad : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${t.color}50` : '1px solid var(--pc-bd1)',
                boxShadow: selected ? `0 0 20px ${t.color}14` : 'none',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: selected ? `${t.color}20` : 'var(--pc-ghost)',
                  color: selected ? t.color : 'var(--pc-t3)',
                }}
              >
                <t.icon size={16} />
              </div>
              <div>
                <div
                  style={{
                    color: selected ? t.color : 'var(--pc-t1)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.78rem',
                  }}
                >
                  {t.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
