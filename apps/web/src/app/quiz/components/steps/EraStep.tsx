'use client';

import { Clock } from 'lucide-react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { SelectionMark, StepHeader } from './StepPrimitives';

import type { Era, PersonAnswers } from '../../types';

interface EraStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

type EraOptionData = {
  color: string;
  desc: string;
  emoji: string;
  id: Era;
  title: string;
};

export function EraStep({ person, onUpdate }: EraStepProps) {
  const { t } = useLanguage();

  const eraOptions: EraOptionData[] = [
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
      <StepHeader
        accentBackground="rgba(255,159,28,0.15)"
        accentColor="var(--pc-amber)"
        icon={<Clock size={20} />}
        title={t.quiz.era.title}
      />

      <div className="grid grid-cols-1 gap-4">
        {eraOptions.map((option) => (
          <EraOptionButton
            key={option.id}
            option={option}
            selected={person.era === option.id}
            onSelect={() => onUpdate({ era: option.id })}
          />
        ))}
      </div>
    </div>
  );
}

function EraOptionButton({
  onSelect,
  option,
  selected,
}: {
  onSelect: () => void;
  option: EraOptionData;
  selected: boolean;
}) {
  const styles = getEraOptionStyles(option, selected);

  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
      style={styles.button}
    >
      <div className="text-2xl">{option.emoji}</div>
      <div className="flex-1">
        <div style={styles.title}>{option.title}</div>
        <div style={{ color: 'var(--pc-t3)', fontSize: '0.82rem' }}>{option.desc}</div>
      </div>
      {selected && <SelectionMark color={option.color} />}
    </button>
  );
}

function getEraOptionStyles(option: EraOptionData, selected: boolean) {
  return {
    button: {
      background: getSelectedValue(selected, `${option.color}18`, 'var(--pc-surface)'),
      border: getSelectedValue(
        selected,
        `1.5px solid ${option.color}60`,
        '1px solid var(--pc-bd2)',
      ),
      boxShadow: getSelectedValue(selected, `0 0 20px ${option.color}18`, 'none'),
    },
    title: {
      color: getSelectedValue(selected, option.color, 'var(--pc-t1)'),
      fontSize: '0.95rem',
      fontWeight: 600,
    },
  };
}

function getSelectedValue<T>(selected: boolean, selectedValue: T, defaultValue: T) {
  return selected ? selectedValue : defaultValue;
}
