'use client';

import { Smile } from 'lucide-react';

import { useLanguage } from '@/i18n';

import { GENRES } from '../../constants';

import { OptionIcon, SelectableOptionButton, StepHeader } from './StepPrimitives';

import type { PersonAnswers } from '../../types';

const MAX_MOOD_SELECTIONS = 3;

interface MoodStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

type MoodOption = (typeof GENRES)[number];

export function MoodStep({ person, onUpdate }: MoodStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <StepHeader
        accentBackground="rgba(139,92,246,0.15)"
        accentColor="#8B5CF6"
        icon={<Smile size={20} />}
        title={t.quiz.mood.title}
        subtitle={t.quiz.mood.pickOne}
      />

      <div className="grid grid-cols-2 gap-3">
        {GENRES.map((genre) => (
          <MoodOptionButton
            key={genre.id}
            genre={genre}
            label={t.genres[genre.id as keyof typeof t.genres] ?? genre.label}
            person={person}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      <MoodSelectionSummary count={person.moods.length} copy={t.quiz.mood} />
    </div>
  );
}

function MoodOptionButton({
  genre,
  label,
  onUpdate,
  person,
}: {
  genre: MoodOption;
  label: string;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  person: PersonAnswers;
}) {
  const selected = person.moods.includes(genre.id);
  const selectionLimitReached = !selected && person.moods.length >= MAX_MOOD_SELECTIONS;

  return (
    <SelectableOptionButton
      color={genre.color}
      disabled={selectionLimitReached}
      selected={selected}
      onClick={() => onUpdate({ moods: getNextMoodSelection(person.moods, genre.id, selected) })}
    >
      <OptionIcon color={genre.color} selected={selected} size="sm">
        <genre.icon size={15} />
      </OptionIcon>
      <span
        style={{
          color: selected ? genre.color : 'var(--pc-t2)',
          fontSize: '0.88rem',
          fontWeight: selected ? 600 : 400,
        }}
      >
        {label}
      </span>
    </SelectableOptionButton>
  );
}

function MoodSelectionSummary({
  count,
  copy,
}: {
  count: number;
  copy: ReturnType<typeof useLanguage>['t']['quiz']['mood'];
}) {
  if (count === 0) return null;

  const template = count === 1 ? copy.selectedSingular : copy.selectedPlural;

  return (
    <p style={{ color: 'var(--pc-t3)', fontSize: '0.78rem', textAlign: 'center' }}>
      {template.replace('{n}', String(count))}
    </p>
  );
}

function getNextMoodSelection(currentMoods: string[], moodId: string, selected: boolean): string[] {
  return selected
    ? currentMoods.filter((mood) => mood !== moodId)
    : [...currentMoods, moodId].slice(0, MAX_MOOD_SELECTIONS);
}
