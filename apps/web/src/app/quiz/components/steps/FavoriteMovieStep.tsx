'use client';

import { Clapperboard } from 'lucide-react';

import { useLanguage } from '@/i18n';

import { FavoriteTextInput } from './StepPrimitives';

import type { PersonAnswers } from '../../types';

interface FavoriteMovieStepProps {
  person: PersonAnswers;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  onSubmit: () => void;
  canProceed: boolean;
}

type FavoriteMovieCopy = ReturnType<typeof useLanguage>['t']['quiz']['favoriteMovie'];

const QUICK_PICKS = [
  { label: 'The Dark Knight', value: 'The Dark Knight' },
  { label: 'Inception', value: 'Inception' },
  { label: 'Parasite', value: 'Parasite' },
  { label: 'Pulp Fiction', value: 'Pulp Fiction' },
  { label: 'The Matrix', value: 'The Matrix' },
  { label: 'Coco', value: 'Coco' },
];

export function FavoriteMovieStep({
  person,
  onUpdate,
  onSubmit,
  canProceed,
}: FavoriteMovieStepProps) {
  const { t } = useLanguage();
  const copy = t.quiz.favoriteMovie;

  return (
    <div className="flex flex-col gap-6 pt-2">
      <ReferenceStepHeader copy={copy} />
      <ReferenceInput
        canProceed={canProceed}
        copy={copy}
        onSubmit={onSubmit}
        onUpdate={onUpdate}
        person={person}
      />
      <ReferenceQuickPicks copy={copy} onUpdate={onUpdate} person={person} />
      <ReferenceWhyField copy={copy} onUpdate={onUpdate} person={person} />
    </div>
  );
}

function ReferenceStepHeader({ copy }: { copy: FavoriteMovieCopy }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(245,197,24,0.15)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <Clapperboard size={20} />
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
          {copy.title}
        </h2>
      </div>
      <p
        style={{
          color: 'var(--pc-t3)',
          fontSize: '0.88rem',
          marginTop: -8,
        }}
      >
        {copy.hint}
      </p>
    </>
  );
}

function ReferenceInput({
  canProceed,
  copy,
  onSubmit,
  onUpdate,
  person,
}: {
  canProceed: boolean;
  copy: FavoriteMovieCopy;
  onSubmit: () => void;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  person: PersonAnswers;
}) {
  return (
    <FavoriteTextInput
      name="favoriteMovie"
      value={person.favoriteMovie}
      onChange={(favoriteMovie) => onUpdate({ favoriteMovie, hasNoReferenceMovie: false })}
      onEnter={() => {
        if (canProceed) onSubmit();
      }}
      placeholder={copy.placeholder}
    />
  );
}

function ReferenceQuickPicks({
  copy,
  onUpdate,
  person,
}: {
  copy: FavoriteMovieCopy;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  person: PersonAnswers;
}) {
  return (
    <div>
      <p
        style={{
          color: 'var(--pc-t4)',
          fontSize: '0.78rem',
          marginBottom: 10,
        }}
      >
        {copy.popularPicks}
      </p>
      <div className="flex flex-wrap gap-2">
        <ReferenceChoiceButton
          label={copy.noReference}
          selected={isReferenceOpen(person)}
          onClick={() => onUpdate({ favoriteMovie: '', hasNoReferenceMovie: true })}
        />
        {QUICK_PICKS.map((film) => (
          <ReferenceChoiceButton
            key={film.value}
            label={film.label}
            selected={person.favoriteMovie === film.value}
            onClick={() => onUpdate({ favoriteMovie: film.value, hasNoReferenceMovie: false })}
          />
        ))}
      </div>
    </div>
  );
}

function ReferenceChoiceButton({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-xl text-sm transition-all duration-150"
      style={{
        background: selected ? 'var(--pc-gold-tint)' : 'var(--pc-ghost)',
        border: selected ? '1px solid var(--pc-gold-bd-strong)' : '1px solid var(--pc-bd1)',
        color: selected ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
      }}
    >
      {label}
    </button>
  );
}

function ReferenceWhyField({
  copy,
  onUpdate,
  person,
}: {
  copy: FavoriteMovieCopy;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  person: PersonAnswers;
}) {
  return (
    <div>
      <p
        style={{
          color: 'var(--pc-t4)',
          fontSize: '0.78rem',
          marginBottom: 8,
        }}
      >
        {copy.why}{' '}
        <span style={{ color: 'var(--pc-t4)', fontWeight: 400 }}>{copy.whyOptional}</span>
      </p>
      <textarea
        value={person.favoriteMovieWhy}
        name="favoriteMovieWhy"
        onChange={(e) => onUpdate({ favoriteMovieWhy: e.target.value.slice(0, 300) })}
        placeholder={copy.whyPlaceholder}
        rows={3}
        className="w-full resize-none rounded-2xl px-5 py-4 outline-none transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
        style={{
          background: 'var(--pc-surface)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t1)',
          fontSize: '0.9rem',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--pc-gold-focus)';
          e.currentTarget.style.boxShadow = 'var(--pc-gold-ring)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--pc-bd2)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <p
        style={{
          color: 'var(--pc-t4)',
          fontSize: '0.75rem',
          textAlign: 'right',
          marginTop: 4,
        }}
      >
        {person.favoriteMovieWhy.length}/300
      </p>
    </div>
  );
}

function isReferenceOpen(person: PersonAnswers) {
  return person.hasNoReferenceMovie || person.favoriteMovie.trim().length === 0;
}
