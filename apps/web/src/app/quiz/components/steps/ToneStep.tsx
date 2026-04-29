'use client';

import { Moon } from 'lucide-react';

import { useLanguage } from '@/i18n';

import { TONES } from '../../constants';

import type { PersonAnswers, Tone } from '../../types';


interface ToneStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

export function ToneStep({ person, onUpdate }: ToneStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(245,197,24,0.15)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <Moon size={20} />
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
          {t.quiz.tone.title}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TONES.map((tone) => {
          const selected = person.tone === tone.id;
          const toneT = t.tones[tone.id as keyof typeof t.tones];
          const label = toneT?.label ?? tone.label;
          const desc = toneT?.desc ?? tone.desc;
          return (
            <button
              key={tone.id}
              onClick={() => onUpdate({ tone: tone.id as Tone })}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: selected ? tone.grad : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${tone.color}50` : '1px solid var(--pc-bd1)',
                boxShadow: selected ? `0 0 20px ${tone.color}14` : 'none',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: selected ? `${tone.color}20` : 'var(--pc-ghost)',
                  color: selected ? tone.color : 'var(--pc-t3)',
                }}
              >
                <tone.icon size={16} />
              </div>
              <div>
                <div
                  style={{
                    color: selected ? tone.color : 'var(--pc-t1)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.78rem',
                  }}
                >
                  {desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
