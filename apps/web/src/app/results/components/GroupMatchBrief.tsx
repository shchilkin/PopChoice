'use client';

import { Film, Smile, Sparkles, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import type { GroupResultInsights } from '@/features/recommendation/groupResultInsights';
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
    </motion.section>
  );
}
