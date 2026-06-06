'use client';

import { Moon } from 'lucide-react';

import { useLanguage } from '@/i18n';

import { TONES } from '../../constants';

import { OptionIcon, SelectableOptionButton, StepHeader } from './StepPrimitives';

import type { PersonAnswers, Tone } from '../../types';

interface ToneStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

type ToneOption = (typeof TONES)[number];

export function ToneStep({ person, onUpdate }: ToneStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <StepHeader
        accentBackground="rgba(245,197,24,0.15)"
        accentColor="var(--pc-gold-text)"
        icon={<Moon size={20} />}
        title={t.quiz.tone.title}
      />

      <div className="grid grid-cols-2 gap-3">
        {TONES.map((tone) => (
          <ToneOptionButton
            key={tone.id}
            option={tone}
            selected={person.tone === tone.id}
            toneCopy={t.tones[tone.id as keyof typeof t.tones]}
            onSelect={() => onUpdate({ tone: tone.id as Tone })}
          />
        ))}
      </div>
    </div>
  );
}

function ToneOptionButton({
  onSelect,
  option,
  selected,
  toneCopy,
}: {
  onSelect: () => void;
  option: ToneOption;
  selected: boolean;
  toneCopy: { label: string; desc: string } | undefined;
}) {
  const copy = getToneOptionCopy(option, toneCopy);

  return (
    <SelectableOptionButton
      color={option.color}
      layout="stack"
      selected={selected}
      onClick={onSelect}
      selectedBackground={option.grad}
      selectedShadow={`0 0 20px ${option.color}14`}
    >
      <OptionIcon color={option.color} selected={selected}>
        <option.icon size={16} />
      </OptionIcon>
      <span>
        <span className="block" style={getToneLabelStyle(selected, option.color)}>
          {copy.label}
        </span>
        <span className="block" style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
          {copy.desc}
        </span>
      </span>
    </SelectableOptionButton>
  );
}

function getToneOptionCopy(
  option: ToneOption,
  toneCopy: { label: string; desc: string } | undefined,
) {
  if (!toneCopy) {
    return { desc: option.desc, label: option.label };
  }

  return toneCopy;
}

function getToneLabelStyle(selected: boolean, color: string) {
  return {
    color: selected ? color : 'var(--pc-t1)',
    fontSize: '0.88rem',
    fontWeight: 600,
  };
}
