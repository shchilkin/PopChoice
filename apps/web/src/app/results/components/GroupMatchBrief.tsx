'use client';

import { Film, Smile, Sparkles, Ticket, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import type {
  GroupParticipantProfile,
  GroupResultInsights,
} from '@/features/recommendation/groupResultInsights';
import type { ReactNode } from 'react';

function joinList(values: string[], locale: string): string {
  return new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(values);
}

type TranslationCopy = ReturnType<typeof useLanguage>['t'];

function normalizeChoice(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateMood(value: string, t: TranslationCopy): string {
  const moodKey = normalizeChoice(value).replace(/\s+/g, '');
  const aliases: Record<string, keyof typeof t.genres> = {
    action: 'action',
    adventure: 'adventure',
    animation: 'animation',
    comedy: 'comedy',
    documentary: 'documentary',
    drama: 'drama',
    horror: 'horror',
    romance: 'romance',
    scifi: 'scifi',
    sciencefiction: 'scifi',
    thriller: 'thriller',
  };
  const key = aliases[moodKey];
  return key ? t.genres[key] : value;
}

function translateTone(value: string, t: TranslationCopy): string {
  const normalized = normalizeChoice(value);
  const aliases: Record<string, keyof typeof t.tones> = {
    balanced: 'balanced',
    dark: 'dark',
    'dark and intense': 'dark',
    light: 'light',
    'light and fun': 'light',
    serious: 'serious',
    'serious and thought provoking': 'serious',
  };
  const key = aliases[normalized];
  return key ? t.tones[key].label : value;
}

function translateEra(value: string, t: TranslationCopy): string {
  const normalized = normalizeChoice(value);
  const aliases: Record<string, keyof Omit<typeof t.quiz.era, 'title'>> = {
    both: 'both',
    'both new and classic': 'both',
    classic: 'classic',
    'timeless classics': 'classic',
    new: 'new',
    'new releases': 'new',
  };
  const key = aliases[normalized];
  return key ? t.quiz.era[key].title : value;
}

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
  profile,
  t,
  locale,
  hasDivider,
}: {
  profile: GroupParticipantProfile;
  t: TranslationCopy;
  locale: string;
  hasDivider: boolean;
}) {
  const moodValue =
    profile.moodPreferences.length > 0
      ? joinList(
          profile.moodPreferences.map((mood) => translateMood(mood, t)),
          locale,
        )
      : t.results.groupBriefMissingSignal;
  const toneValue = profile.tonePreference
    ? translateTone(profile.tonePreference, t)
    : t.results.groupBriefMissingSignal;
  const eraValue = profile.eraPreference
    ? translateEra(profile.eraPreference, t)
    : t.results.groupBriefMissingSignal;

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
          {profile.name}
        </span>
      </div>

      <div
        className="flex flex-wrap gap-x-3 gap-y-1.5"
        style={{ color: 'var(--pc-t3)', fontSize: '0.78rem', lineHeight: 1.5 }}
      >
        {profile.favoriteMovie && (
          <span>
            <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
              {t.results.groupBriefFavorite}
            </strong>{' '}
            {profile.favoriteMovie}
          </span>
        )}
        <span>
          <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
            {t.results.groupBriefMoodSignal}
          </strong>{' '}
          {moodValue}
        </span>
        <span>
          <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
            {t.results.groupBriefToneSignal}
          </strong>{' '}
          {toneValue}
        </span>
        <span>
          <strong style={{ color: 'var(--pc-t2)', fontWeight: 700 }}>
            {t.results.groupBriefEraSignal}
          </strong>{' '}
          {eraValue}
        </span>
      </div>
    </li>
  );
}

export function GroupMatchBrief({ insights }: { insights: GroupResultInsights }) {
  const { t, locale } = useLanguage();
  const names = joinList(insights.participantNames, locale);
  const sharedMoods =
    insights.sharedMoods.length > 0
      ? joinList(
          insights.sharedMoods.map((mood) => translateMood(mood, t)),
          locale,
        )
      : t.results.groupBriefNoSharedMoods;
  const tones =
    insights.tonePreferences.length > 0
      ? joinList(
          insights.tonePreferences.map((tone) => translateTone(tone, t)),
          locale,
        )
      : t.results.groupBriefMixedSignals;
  const eras =
    insights.eraPreferences.length > 0
      ? joinList(
          insights.eraPreferences.map((era) => translateEra(era, t)),
          locale,
        )
      : t.results.groupBriefMixedSignals;
  const actors =
    insights.favoriteActors.length > 0 ? joinList(insights.favoriteActors, locale) : null;

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
          value={t.results.groupBriefPeopleValue
            .replace(
              '{count}',
              new Intl.NumberFormat(locale).format(insights.participantNames.length),
            )
            .replace('{names}', names)}
        />
        <BriefRow
          icon={<Smile size={14} />}
          label={t.results.groupBriefSharedMood}
          value={sharedMoods}
        />
        <BriefRow icon={<Film size={14} />} label={t.results.groupBriefTone} value={tones} />
        <BriefRow icon={<Sparkles size={14} />} label={t.results.groupBriefEra} value={eras} />
      </div>

      {actors && (
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
          {t.results.groupBriefActors.replace('{actors}', actors)}
        </div>
      )}

      {insights.participantProfiles.length > 0 && (
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
            {insights.participantProfiles.map((profile, index) => (
              <ParticipantSignal
                key={`${profile.name}-${profile.favoriteMovie ?? profile.tonePreference ?? ''}`}
                profile={profile}
                t={t}
                locale={locale}
                hasDivider={index > 0}
              />
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
