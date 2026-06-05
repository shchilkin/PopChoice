'use client';

import { Film, Smile, Sparkles, Ticket, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import {
  buildGroupMatchBriefViewModel,
  type GroupMatchBriefViewModel,
  type GroupParticipantSignalViewModel,
} from './groupMatchBriefViewModel';

import type { GroupResultInsights } from '@/features/recommendation/groupResultInsights';
import type { ReactNode } from 'react';

type TranslationCopy = ReturnType<typeof useLanguage>['t'];

function BriefRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'var(--pc-gold-subtle)',
          color: 'var(--pc-gold-text)',
        }}
      >
        {icon}
      </div>
      <div>
        <div
          className="uppercase tracking-widest"
          style={{ color: 'var(--pc-t4)', fontSize: '0.62rem' }}
        >
          {label}
        </div>
        <div style={{ color: 'var(--pc-t2)', fontSize: '0.88rem', lineHeight: 1.55 }}>{value}</div>
      </div>
    </div>
  );
}

function ParticipantSignal({
  participant,
  t,
  hasDivider,
}: {
  participant: GroupParticipantSignalViewModel;
  t: TranslationCopy;
  hasDivider: boolean;
}) {
  return (
    <li
      className="grid gap-2 py-3 sm:grid-cols-[minmax(6rem,0.8fr)_1fr] sm:gap-4"
      style={{
        borderTop: hasDivider ? '1px solid var(--pc-bd1)' : '0',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'var(--pc-gold-subtle)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <Ticket size={13} />
        </div>
        <span style={{ color: 'var(--pc-t1)', fontSize: '0.9rem', fontWeight: 700 }}>
          {participant.name}
        </span>
      </div>

      <div
        className="flex flex-wrap gap-x-3 gap-y-1.5"
        style={{ color: 'var(--pc-t3)', fontSize: '0.78rem', lineHeight: 1.5 }}
      >
        <FavoriteMovieSignal participant={participant} t={t} />
        <span>
          <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
            {t.results.groupBriefMoodSignal}
          </strong>{' '}
          {participant.moodValue}
        </span>
        <span>
          <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
            {t.results.groupBriefToneSignal}
          </strong>{' '}
          {participant.toneValue}
        </span>
        <span>
          <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
            {t.results.groupBriefEraSignal}
          </strong>{' '}
          {participant.eraValue}
        </span>
      </div>
    </li>
  );
}

function FavoriteMovieSignal({
  participant,
  t,
}: {
  participant: GroupParticipantSignalViewModel;
  t: TranslationCopy;
}) {
  if (!participant.favoriteMovie) return null;

  return (
    <span>
      <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
        {t.results.groupBriefFavorite}
      </strong>{' '}
      {participant.favoriteMovie}
    </span>
  );
}

export function GroupMatchBrief({ insights }: { insights: GroupResultInsights }) {
  const { t, locale } = useLanguage();
  const view = buildGroupMatchBriefViewModel(insights, t, locale);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className="mb-8 rounded-2xl p-5"
      style={{
        background: 'var(--pc-ghost)',
        border: '1px solid var(--pc-bd2)',
      }}
      aria-label={t.results.groupBriefTitle}
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={14} style={{ color: 'var(--pc-gold-text)' }} />
        <h2
          className="uppercase tracking-widest"
          style={{ color: 'var(--pc-gold-text)', fontSize: '0.72rem' }}
        >
          {t.results.groupBriefTitle}
        </h2>
      </div>

      <p
        className="mb-5 max-w-2xl"
        style={{ color: 'var(--pc-t3)', fontSize: '0.86rem', lineHeight: 1.6 }}
      >
        {t.results.groupBriefTakeaway}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <BriefRow
          icon={<Users size={14} />}
          label={t.results.groupBriefPeople}
          value={view.peopleValue}
        />
        <BriefRow
          icon={<Smile size={14} />}
          label={t.results.groupBriefSharedMood}
          value={view.sharedMoods}
        />
        <BriefRow icon={<Film size={14} />} label={t.results.groupBriefTone} value={view.tones} />
        <BriefRow icon={<Sparkles size={14} />} label={t.results.groupBriefEra} value={view.eras} />
      </div>

      <ActorsBrief view={view} />
      <ParticipantSignals t={t} view={view} />
    </motion.section>
  );
}

function ActorsBrief({ view }: { view: GroupMatchBriefViewModel }) {
  if (!view.hasActors) return null;

  return (
    <div
      className="mt-4 rounded-xl px-4 py-3"
      style={{
        background: `${palette.purple}16`,
        border: `1px solid ${palette.purple}30`,
        color: 'var(--pc-t3)',
        fontSize: '0.82rem',
        lineHeight: 1.55,
      }}
    >
      {view.actorsText}
    </div>
  );
}

function ParticipantSignals({ t, view }: { t: TranslationCopy; view: GroupMatchBriefViewModel }) {
  if (!view.hasParticipantSignals) return null;

  return (
    <div
      className="mt-5 rounded-xl px-4 py-3"
      style={{
        background: 'var(--pc-surface-hover)',
        border: '1px solid var(--pc-bd1)',
      }}
    >
      <div
        className="mb-1 uppercase tracking-widest"
        style={{ color: 'var(--pc-t4)', fontSize: '0.62rem' }}
      >
        {t.results.groupBriefParticipantSignals}
      </div>
      <ul>
        {view.participants.map((participant, index) => (
          <ParticipantSignal
            key={participant.key}
            participant={participant}
            t={t}
            hasDivider={index > 0}
          />
        ))}
      </ul>
    </div>
  );
}
