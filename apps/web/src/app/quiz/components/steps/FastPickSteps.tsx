'use client';

import { Check, Compass, ShieldOff, Sparkles } from 'lucide-react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { FAST_AVOIDS, FAST_DISCOVERY_OPTIONS, FAST_INTENTS } from '../../constants';

import type { FastAvoid, FastDiscovery, FastIntent, PersonAnswers } from '../../types';

interface FastPickStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

function SelectionMark({ color }: { color: string }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ background: color }}
    >
      <Check size={12} style={{ color: 'var(--pc-cta-text)' }} />
    </span>
  );
}

export function FastIntentStep({ person, onUpdate }: FastPickStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: 'rgba(245,197,24,0.15)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <Sparkles size={20} />
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
            {t.quiz.fast.intent.title}
          </h2>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.82rem', marginTop: 2 }}>
            {t.quiz.fast.intent.hint}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FAST_INTENTS.map((option) => {
          const selected = person.fastIntent.includes(option.id);
          const label = t.quiz.fast.intent.options[option.id];
          const nextIntent = selected
            ? person.fastIntent.filter((intent) => intent !== option.id)
            : [...person.fastIntent, option.id as FastIntent].slice(0, 3);

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onUpdate({ fastIntent: nextIntent })}
              className="flex items-center gap-3 rounded-xl p-3.5 text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: selected ? `${option.color}18` : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${option.color}50` : '1px solid var(--pc-bd1)',
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: selected ? `${option.color}25` : 'var(--pc-ghost)',
                  color: selected ? option.color : 'var(--pc-t3)',
                }}
              >
                <option.icon size={16} />
              </span>
              <span
                className="flex-1"
                style={{
                  color: selected ? option.color : 'var(--pc-t2)',
                  fontWeight: selected ? 600 : 400,
                  fontSize: '0.9rem',
                }}
              >
                {label}
              </span>
              {selected && <SelectionMark color={option.color} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FastAvoidsStep({ person, onUpdate }: FastPickStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: 'rgba(239,68,68,0.15)',
            color: palette.red,
          }}
        >
          <ShieldOff size={20} />
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
            {t.quiz.fast.avoids.title}
          </h2>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.82rem', marginTop: 2 }}>
            {t.quiz.fast.avoids.hint}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FAST_AVOIDS.map((option) => {
          const selected = person.fastAvoids.includes(option.id);
          const label = t.quiz.fast.avoids.options[option.id];
          const nextAvoids = selected
            ? person.fastAvoids.filter((avoid) => avoid !== option.id)
            : [...person.fastAvoids, option.id as FastAvoid];

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onUpdate({ fastAvoids: nextAvoids })}
              className="flex items-center gap-3 rounded-xl p-3.5 text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: selected ? `${option.color}18` : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${option.color}50` : '1px solid var(--pc-bd1)',
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: selected ? `${option.color}25` : 'var(--pc-ghost)',
                  color: selected ? option.color : 'var(--pc-t3)',
                }}
              >
                <option.icon size={16} />
              </span>
              <span
                className="flex-1"
                style={{
                  color: selected ? option.color : 'var(--pc-t2)',
                  fontWeight: selected ? 600 : 400,
                  fontSize: '0.9rem',
                }}
              >
                {label}
              </span>
              {selected && <SelectionMark color={option.color} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FastDiscoveryStep({ person, onUpdate }: FastPickStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: 'rgba(20,184,166,0.15)',
            color: palette.teal,
          }}
        >
          <Compass size={20} />
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
          {t.quiz.fast.discovery.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {FAST_DISCOVERY_OPTIONS.map((option) => {
          const selected = person.fastDiscovery === option.id;
          const copy = t.quiz.fast.discovery.options[option.id];

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onUpdate({ fastDiscovery: option.id as FastDiscovery })}
              className="flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98]"
              style={{
                background: selected ? `${option.color}18` : 'var(--pc-surface)',
                border: selected ? `1.5px solid ${option.color}60` : '1px solid var(--pc-bd2)',
                boxShadow: selected ? `0 0 20px ${option.color}18` : 'none',
              }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: selected ? `${option.color}25` : 'var(--pc-ghost)',
                  color: selected ? option.color : 'var(--pc-t3)',
                }}
              >
                <option.icon size={19} />
              </span>
              <span className="flex-1">
                <span
                  className="block"
                  style={{ color: selected ? option.color : 'var(--pc-t1)', fontWeight: 600 }}
                >
                  {copy.title}
                </span>
                <span className="block" style={{ color: 'var(--pc-t3)', fontSize: '0.82rem' }}>
                  {copy.desc}
                </span>
              </span>
              {selected && <SelectionMark color={option.color} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
