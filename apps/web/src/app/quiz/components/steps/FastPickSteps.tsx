'use client';

import { Compass, ShieldOff, Sparkles } from 'lucide-react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { FAST_AVOIDS, FAST_DISCOVERY_OPTIONS, FAST_INTENTS } from '../../constants';

import { OptionIcon, SelectableOptionButton, SelectionMark, StepHeader } from './StepPrimitives';

import type { FastAvoid, FastDiscovery, FastIntent, PersonAnswers } from '../../types';
import type { ReactNode } from 'react';

interface FastPickStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
}

type FastIntentOption = (typeof FAST_INTENTS)[number];
type FastAvoidOption = (typeof FAST_AVOIDS)[number];
type FastDiscoveryOption = (typeof FAST_DISCOVERY_OPTIONS)[number];

export function FastIntentStep({ person, onUpdate }: FastPickStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <StepHeader
        accentBackground="rgba(245,197,24,0.15)"
        accentColor="var(--pc-gold-text)"
        icon={<Sparkles size={20} />}
        title={t.quiz.fast.intent.title}
        subtitle={t.quiz.fast.intent.hint}
      />
      <FastOptionGrid>
        {FAST_INTENTS.map((option) => (
          <FastIntentOptionButton
            key={option.id}
            option={option}
            person={person}
            label={t.quiz.fast.intent.options[option.id]}
            onUpdate={onUpdate}
          />
        ))}
      </FastOptionGrid>
    </div>
  );
}

export function FastAvoidsStep({ person, onUpdate }: FastPickStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <StepHeader
        accentBackground="rgba(239,68,68,0.15)"
        accentColor={palette.red}
        icon={<ShieldOff size={20} />}
        title={t.quiz.fast.avoids.title}
        subtitle={t.quiz.fast.avoids.hint}
      />
      <FastOptionGrid>
        {FAST_AVOIDS.map((option) => (
          <FastAvoidOptionButton
            key={option.id}
            option={option}
            person={person}
            label={t.quiz.fast.avoids.options[option.id]}
            onUpdate={onUpdate}
          />
        ))}
      </FastOptionGrid>
    </div>
  );
}

export function FastDiscoveryStep({ person, onUpdate }: FastPickStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <StepHeader
        accentBackground="rgba(20,184,166,0.15)"
        accentColor={palette.teal}
        icon={<Compass size={20} />}
        title={t.quiz.fast.discovery.title}
      />
      <div className="grid grid-cols-1 gap-4">
        {FAST_DISCOVERY_OPTIONS.map((option) => (
          <FastDiscoveryOptionButton
            key={option.id}
            option={option}
            selected={person.fastDiscovery === option.id}
            copy={t.quiz.fast.discovery.options[option.id]}
            onSelect={() => onUpdate({ fastDiscovery: option.id as FastDiscovery })}
          />
        ))}
      </div>
    </div>
  );
}

function FastOptionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function FastIntentOptionButton({
  label,
  onUpdate,
  option,
  person,
}: {
  label: string;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  option: FastIntentOption;
  person: PersonAnswers;
}) {
  const selected = person.fastIntent.includes(option.id);
  const nextIntent = getNextFastIntent(person.fastIntent, option.id, selected);

  return (
    <FastSelectableOption
      color={option.color}
      icon={<option.icon size={16} />}
      label={label}
      selected={selected}
      onClick={() => onUpdate({ fastIntent: nextIntent })}
    />
  );
}

function FastAvoidOptionButton({
  label,
  onUpdate,
  option,
  person,
}: {
  label: string;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  option: FastAvoidOption;
  person: PersonAnswers;
}) {
  const selected = person.fastAvoids.includes(option.id);
  const nextAvoids = getNextFastAvoids(person.fastAvoids, option.id, selected);

  return (
    <FastSelectableOption
      color={option.color}
      icon={<option.icon size={16} />}
      label={label}
      selected={selected}
      onClick={() => onUpdate({ fastAvoids: nextAvoids })}
    />
  );
}

function FastDiscoveryOptionButton({
  copy,
  onSelect,
  option,
  selected,
}: {
  copy: { title: string; desc: string };
  onSelect: () => void;
  option: FastDiscoveryOption;
  selected: boolean;
}) {
  return (
    <SelectableOptionButton
      color={option.color}
      layout="large-row"
      selected={selected}
      onClick={onSelect}
      selectedBorderAlpha="60"
      selectedShadow={`0 0 20px ${option.color}18`}
    >
      <OptionIcon color={option.color} selected={selected} size="lg">
        <option.icon size={19} />
      </OptionIcon>
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
    </SelectableOptionButton>
  );
}

function FastSelectableOption({
  color,
  icon,
  label,
  onClick,
  selected,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <SelectableOptionButton color={color} selected={selected} onClick={onClick}>
      <OptionIcon color={color} selected={selected}>
        {icon}
      </OptionIcon>
      <span
        className="flex-1"
        style={{
          color: selected ? color : 'var(--pc-t2)',
          fontSize: '0.9rem',
          fontWeight: selected ? 600 : 400,
        }}
      >
        {label}
      </span>
      {selected && <SelectionMark color={color} />}
    </SelectableOptionButton>
  );
}

function getNextFastIntent(
  currentIntent: FastIntent[],
  intentId: string,
  selected: boolean,
): FastIntent[] {
  return selected
    ? currentIntent.filter((intent) => intent !== intentId)
    : [...currentIntent, intentId as FastIntent].slice(0, 3);
}

function getNextFastAvoids(
  currentAvoids: FastAvoid[],
  avoidId: string,
  selected: boolean,
): FastAvoid[] {
  return selected
    ? currentAvoids.filter((avoid) => avoid !== avoidId)
    : [...currentAvoids, avoidId as FastAvoid];
}
