'use client';

import { Clapperboard, Clock, Moon, Play, Smile, Sparkles, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Card, Label, Section } from '../_components';

import type { MovieRecommendation } from '@/utils/client';

import { QuizNavigation } from '@/app/quiz/components';
import { AgeRatingPill } from '@/app/results/components/AgeRatingPill';
import { SimilarityBadge } from '@/app/results/components/SimilarityBadge';
import { SmallSuggestionCard } from '@/app/results/components/SmallSuggestionCard';
import { StarRating } from '@/app/results/components/StarRating';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Mascot } from '@/components/Mascot';
import { MoviesTableSkeleton } from '@/components/MoviesTable';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TMDBAttribution } from '@/components/TMDBAttribution';
import { palette } from '@/styles/designTokens';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ComponentRow({
  label,
  children,
  code,
}: {
  label: string;
  children: React.ReactNode;
  code?: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-6 py-5"
      style={{ borderBottom: '1px solid var(--pc-bd1)' }}
    >
      <div className="w-36 shrink-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--pc-t3)' }}>
          {label}
        </p>
        {code && (
          <code className="text-xs" style={{ color: 'var(--pc-t4)' }}>
            {code}
          </code>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ── Feature Card ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div
      className="p-6 rounded-2xl flex flex-col gap-4"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={20} />
      </div>
      <div>
        <div className="font-bold text-sm mb-1" style={{ color: 'var(--pc-t1)' }}>
          {title}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--pc-t3)' }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

// ── Genre Chip ─────────────────────────────────────────────────────────────────

function GenreChip({
  icon: Icon,
  label,
  color,
  selected,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200"
      style={{
        background: selected ? `${color}18` : 'var(--pc-surface)',
        border: selected ? `1.5px solid ${color}50` : '1px solid var(--pc-bd1)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: selected ? `${color}25` : 'var(--pc-ghost)',
          color: selected ? color : 'var(--pc-t3)',
        }}
      >
        <Icon size={16} />
      </div>
      <span className="text-sm font-semibold" style={{ color: selected ? color : 'var(--pc-t1)' }}>
        {label}
      </span>
    </button>
  );
}

// ── Tone Card ─────────────────────────────────────────────────────────────────

function ToneCard({
  icon: Icon,
  label,
  desc,
  color,
  grad,
  selected,
  onSelect,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  grad: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200"
      style={{
        background: selected ? grad : 'var(--pc-surface)',
        border: selected ? `1.5px solid ${color}50` : '1px solid var(--pc-bd1)',
        boxShadow: selected ? `0 0 20px ${color}14` : 'none',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{
          background: selected ? `${color}20` : 'var(--pc-ghost)',
          color: selected ? color : 'var(--pc-t3)',
        }}
      >
        <Icon size={16} />
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: selected ? color : 'var(--pc-t1)' }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--pc-t3)' }}>
          {desc}
        </div>
      </div>
    </button>
  );
}

// ── Era Option ─────────────────────────────────────────────────────────────────

function EraOption({
  emoji,
  title,
  desc,
  color,
  selected,
  onSelect,
}: {
  emoji: string;
  title: string;
  desc: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 w-full"
      style={{
        background: selected ? `${color}18` : 'var(--pc-surface)',
        border: selected ? `1.5px solid ${color}60` : '1px solid var(--pc-bd2)',
        boxShadow: selected ? `0 0 20px ${color}18` : 'none',
      }}
    >
      <div className="text-2xl">{emoji}</div>
      <div>
        <div className="font-semibold text-sm" style={{ color: selected ? color : 'var(--pc-t1)' }}>
          {title}
        </div>
        <div className="text-xs" style={{ color: 'var(--pc-t3)' }}>
          {desc}
        </div>
      </div>
    </button>
  );
}

// ── Text Input ─────────────────────────────────────────────────────────────────

function StyledInput({ placeholder, label }: { placeholder: string; label?: string }) {
  const inputId = label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--pc-t3)' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        placeholder={placeholder}
        className="w-full rounded-xl border border-(--pc-bd2) bg-(--pc-bg) px-4 py-3 text-sm text-(--pc-t1) outline-none transition-all duration-200 focus-visible:border-(--pc-gold-bd) focus-visible:shadow-(--pc-gold-ring)"
      />
    </div>
  );
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)', width: 220 }}
    >
      <div className="h-32 animate-pulse" style={{ background: 'var(--pc-surface-deep)' }} />
      <div className="p-3 space-y-2">
        <div
          className="h-3 rounded animate-pulse"
          style={{ width: '70%', background: 'var(--pc-bd2)' }}
        />
        <div
          className="h-2.5 rounded animate-pulse"
          style={{ width: '40%', background: 'var(--pc-bd1)' }}
        />
        <div className="flex gap-2 mt-1">
          <div
            className="h-2.5 rounded-full animate-pulse"
            style={{ width: 48, background: 'var(--pc-bd2)' }}
          />
          <div
            className="h-2.5 rounded-full animate-pulse"
            style={{ width: 32, background: 'var(--pc-bd1)' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function NumberBadge({ n }: { n: number }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: `${palette.purple}33`, color: palette.purpleLight }}
    >
      {n}
    </div>
  );
}

// ── Alert / Toast ──────────────────────────────────────────────────────────────

function AlertBanner({
  type,
  children,
}: {
  type: 'info' | 'warning' | 'error';
  children: React.ReactNode;
}) {
  const styles = {
    info: { bg: `${palette.blue}15`, bd: `${palette.blue}35`, color: palette.blue },
    warning: {
      bg: `${palette.gold}12`,
      bd: 'var(--pc-gold-bd-subtle)',
      color: 'var(--pc-gold-text)',
    },
    error: { bg: `${palette.red}12`, bd: `${palette.red}35`, color: palette.red },
  }[type];

  return (
    <div
      className="px-4 py-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: `1px solid ${styles.bd}`, color: styles.color }}
    >
      {children}
    </div>
  );
}

// ── AI Content Block ───────────────────────────────────────────────────────────

function AIBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-5 py-4 rounded-xl text-sm leading-relaxed"
      style={{
        background: 'var(--pc-ai-bg)',
        border: '1px solid var(--pc-ai-bd)',
        color: 'var(--pc-t2)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} style={{ color: 'var(--pc-gold)' }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--pc-gold-text)' }}
        >
          AI Pick
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Static demo data (hoisted to avoid recreation on every render) ─────────────

const MOCK_MOVIES: MovieRecommendation[] = [
  {
    id: 1,
    name: 'Inception',
    year: 2010,
    similarity: 0.97,
    score_rating: 8.8,
    age_rating: 'PG-13',
    duration: 148,
  },
  {
    id: 2,
    name: 'Interstellar',
    year: 2014,
    similarity: 0.94,
    score_rating: 8.6,
    age_rating: 'PG-13',
    duration: 169,
  },
  {
    id: 3,
    name: 'The Dark Knight',
    year: 2008,
    similarity: 0.91,
    score_rating: 9.0,
    age_rating: 'PG-13',
    duration: 152,
  },
];

const GENRES = [
  { id: 'action', label: 'Action', icon: Zap, color: palette.amber },
  { id: 'comedy', label: 'Comedy', icon: Smile, color: palette.gold },
  { id: 'drama', label: 'Drama', icon: Play, color: palette.purple },
  { id: 'scifi', label: 'Sci-Fi', icon: Sparkles, color: palette.teal },
];

const TONES = [
  {
    id: 'light',
    label: 'Light & Fun',
    desc: 'Easy going, uplifting',
    icon: Sparkles,
    color: palette.gold,
    grad: `linear-gradient(135deg, ${palette.gold}18, ${palette.amber}18)`,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Mix of everything',
    icon: Play,
    color: palette.teal,
    grad: `linear-gradient(135deg, ${palette.teal}18, ${palette.blue}18)`,
  },
  {
    id: 'serious',
    label: 'Serious',
    desc: 'Deep and meaningful',
    icon: Moon,
    color: palette.purple,
    grad: `linear-gradient(135deg, ${palette.purple}18, ${palette.purpleLight}18)`,
  },
  {
    id: 'dark',
    label: 'Dark',
    desc: 'Intense and gritty',
    icon: Moon,
    color: palette.gray,
    grad: `linear-gradient(135deg, ${palette.gray}18, ${palette.red}18)`,
  },
];

const ERAS = [
  { id: 'new', emoji: '✨', title: 'New Releases', desc: 'Post-2010', color: palette.teal },
  { id: 'classic', emoji: '🎞️', title: 'Classics', desc: 'Pre-2000', color: palette.gold },
  { id: 'both', emoji: '🎬', title: 'Any Era', desc: 'No preference', color: palette.purple },
];

// ── Number Badge (GroupSetup) ──────────────────────────────────────────────────

export default function StyleGuideComponentsPage() {
  // Selectable demo state
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['comedy']);
  const [selectedTone, setSelectedTone] = useState<string>('light');
  const [selectedEra, setSelectedEra] = useState<string>('both');
  const [activeCard, setActiveCard] = useState<number>(0);

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--pc-bg)',
        fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/style-guide"
            className="text-(--pc-t3) text-xs uppercase tracking-widest font-semibold transition-colors hover:text-(--pc-gold)"
          >
            ← Style Guide
          </Link>
        </div>
        <div className="mb-16">
          <p
            className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--pc-gold)' }}
          >
            PopChoice
          </p>
          <h1
            className="mb-4 text-5xl font-bold"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              color: 'var(--pc-t1)',
            }}
          >
            Components
          </h1>
          <p className="max-w-xl text-lg" style={{ color: 'var(--pc-t2)' }}>
            All reusable UI components with their props and states.
          </p>
        </div>

        {/* ── Mascot ──────────────────────────────────────────────────── */}
        <Section title="Mascot">
          <Card>
            <ComponentRow label="Default" code="<Mascot />">
              <div className="flex items-end gap-8 flex-wrap">
                {[24, 40, 64, 96].map((size) => (
                  <div key={size} className="flex flex-col items-center gap-2">
                    <Mascot width={size} height={size} />
                    <Label>{size}px</Label>
                  </div>
                ))}
              </div>
            </ComponentRow>
            <div className="pt-4">
              <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                Click the mascot to trigger confetti. Accepts{' '}
                <code style={{ color: 'var(--pc-gold)' }}>width</code> and{' '}
                <code style={{ color: 'var(--pc-gold)' }}>height</code> props.
              </p>
            </div>
          </Card>
        </Section>

        {/* ── Header Controls ──────────────────────────────────────────── */}
        <Section title="Header Controls">
          <Card>
            <ComponentRow label="ThemeToggle" code="<ThemeToggle />">
              <ThemeToggle />
            </ComponentRow>
            <ComponentRow label="LanguageSwitcher" code="<LanguageSwitcher />">
              <LanguageSwitcher />
            </ComponentRow>
            <ComponentRow label="Combined (header)" code="nav controls">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'var(--pc-header-bg)', border: '1px solid var(--pc-bd1)' }}
              >
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </ComponentRow>
          </Card>
        </Section>

        {/* ── TMDB Attribution ─────────────────────────────────────────── */}
        <Section title="TMDB Attribution">
          <Card className="max-w-sm">
            <TMDBAttribution />
            <Label>&lt;TMDBAttribution /&gt;</Label>
          </Card>
        </Section>

        {/* ── SimilarityBadge ──────────────────────────────────────────── */}
        <Section title="Similarity Badge">
          <Card>
            <ComponentRow label="95%+ — Teal" code="similarity={0.97}">
              <SimilarityBadge similarity={0.97} />
            </ComponentRow>
            <ComponentRow label="90–94% — Gold" code="similarity={0.92}">
              <SimilarityBadge similarity={0.92} />
            </ComponentRow>
            <ComponentRow label="85–89% — Amber" code="similarity={0.87}">
              <SimilarityBadge similarity={0.87} />
            </ComponentRow>
            <ComponentRow label="< 85% — Purple" code="similarity={0.80}">
              <SimilarityBadge similarity={0.8} />
            </ComponentRow>
          </Card>
        </Section>

        {/* ── StarRating ───────────────────────────────────────────────── */}
        <Section title="Star Rating">
          <Card>
            {[10, 8.5, 7, 5, 2].map((score) => (
              <ComponentRow key={score} label={`${score}/10`} code={`score={${score}}`}>
                <StarRating score={score} />
                <span className="text-sm font-semibold" style={{ color: 'var(--pc-gold-text)' }}>
                  {score.toFixed(1)}/10
                </span>
              </ComponentRow>
            ))}
          </Card>
        </Section>

        {/* ── AgeRatingPill ────────────────────────────────────────────── */}
        <Section title="Age Rating Pill">
          <Card>
            <ComponentRow label="All ratings" code="<AgeRatingPill />">
              {['G', 'PG', 'PG-13', 'R', '18+', 'NR'].map((r) => (
                <div key={r} className="flex flex-col items-center gap-1">
                  <AgeRatingPill label={r} />
                  <Label>{r}</Label>
                </div>
              ))}
            </ComponentRow>
            <div className="pt-3">
              <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                Neutral pill used in movie cards. For semantic color ratings use{' '}
                <code style={{ color: 'var(--pc-gold)' }}>AgeRatingChip</code>.
              </p>
            </div>
          </Card>
        </Section>

        {/* ── Movie Cards ──────────────────────────────────────────────── */}
        <Section title="Movie Cards">
          <div className="mb-4">
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              Click to toggle active state.{' '}
              <code style={{ color: 'var(--pc-gold)' }}>SmallSuggestionCard</code> is used in the
              results scroll row.
            </p>
            <div className="flex gap-4 flex-wrap">
              {MOCK_MOVIES.map((movie, i) => (
                <SmallSuggestionCard
                  key={movie.id}
                  movie={movie}
                  active={activeCard === i}
                  onClick={() => setActiveCard(i)}
                />
              ))}
            </div>
          </div>
          <Label>SmallSuggestionCard — active / inactive states</Label>
        </Section>

        {/* ── Skeleton States ──────────────────────────────────────────── */}
        <Section title="Skeleton / Loading States">
          <div className="space-y-6">
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--pc-t3)' }}>
                <code style={{ color: 'var(--pc-gold)' }}>MoviesTableSkeleton</code> — shown while
                table data loads
              </p>
              <MoviesTableSkeleton />
            </div>
            <div style={{ borderTop: '1px solid var(--pc-bd1)', paddingTop: '1.5rem' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--pc-t3)' }}>
                Generic card skeleton pattern
              </p>
              <div className="flex gap-4 flex-wrap">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── AI Content Block ─────────────────────────────────────────── */}
        <Section title="AI Content Block">
          <Card>
            <AIBlock>
              Christopher Nolan&apos;s mind-bending thriller follows a skilled thief who steals
              secrets from dreams. A perfect match for fans of cerebral sci-fi with breathtaking
              visuals.
            </AIBlock>
            <Label>var(--pc-ai-bg) / var(--pc-ai-bd) — used for AI-generated descriptions</Label>
          </Card>
        </Section>

        {/* ── Alert Banners ────────────────────────────────────────────── */}
        <Section title="Alert Banners">
          <Card>
            <div className="space-y-3">
              <AlertBanner type="info">
                Movie database is loading — showing cached results.
              </AlertBanner>
              <AlertBanner type="warning">
                Some poster images couldn&apos;t be loaded from TMDB.
              </AlertBanner>
              <AlertBanner type="error">
                Recommendation service unavailable. Please try again.
              </AlertBanner>
            </div>
          </Card>
        </Section>

        {/* ── Feature Cards ────────────────────────────────────────────── */}
        <Section title="Feature Cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FeatureCard
              icon={Sparkles}
              title="AI Powered"
              desc="Uses OpenAI embeddings for smart recommendations"
              color={palette.gold}
            />
            <FeatureCard
              icon={Play}
              title="5 Questions"
              desc="Answer a short quiz to get personalized picks"
              color={palette.amber}
            />
            <FeatureCard
              icon={Users}
              title="Group Mode"
              desc="Find a movie everyone in your group will enjoy"
              color={palette.purple}
            />
            <FeatureCard
              icon={Zap}
              title="Instant Results"
              desc="Get recommendations in seconds, not minutes"
              color={palette.teal}
            />
          </div>
          <Label>FeatureCard — FeaturesSection pattern: icon + title + description</Label>
        </Section>

        {/* ── Genre Selector ───────────────────────────────────────────── */}
        <Section title="Genre Selector">
          <Card>
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              Multi-select. Click to toggle genres. Used in{' '}
              <code style={{ color: 'var(--pc-gold)' }}>MoodStep</code>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GENRES.map((g) => (
                <GenreChip
                  key={g.id}
                  icon={g.icon}
                  label={g.label}
                  color={g.color}
                  selected={selectedGenres.includes(g.id)}
                  onToggle={() =>
                    setSelectedGenres((prev) =>
                      prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id],
                    )
                  }
                />
              ))}
            </div>
            <Label>GenreChip — selected: [{selectedGenres.join(', ')}]</Label>
          </Card>
        </Section>

        {/* ── Tone Selector ────────────────────────────────────────────── */}
        <Section title="Tone Selector">
          <Card>
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              Single-select. Click to choose a tone. Used in{' '}
              <code style={{ color: 'var(--pc-gold)' }}>ToneStep</code>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TONES.map((tone) => (
                <ToneCard
                  key={tone.id}
                  icon={tone.icon}
                  label={tone.label}
                  desc={tone.desc}
                  color={tone.color}
                  grad={tone.grad}
                  selected={selectedTone === tone.id}
                  onSelect={() => setSelectedTone(tone.id)}
                />
              ))}
            </div>
            <Label>ToneCard — selected: {selectedTone}</Label>
          </Card>
        </Section>

        {/* ── Era Selector ─────────────────────────────────────────────── */}
        <Section title="Era Selector">
          <Card>
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              Single-select. Click to pick a film era. Used in{' '}
              <code style={{ color: 'var(--pc-gold)' }}>EraStep</code>.
            </p>
            <div className="flex flex-col gap-3 max-w-sm">
              {ERAS.map((era) => (
                <EraOption
                  key={era.id}
                  emoji={era.emoji}
                  title={era.title}
                  desc={era.desc}
                  color={era.color}
                  selected={selectedEra === era.id}
                  onSelect={() => setSelectedEra(era.id)}
                />
              ))}
            </div>
            <Label>EraOption — selected: {selectedEra}</Label>
          </Card>
        </Section>

        {/* ── Text Inputs ──────────────────────────────────────────────── */}
        <Section title="Text Inputs">
          <Card>
            <div className="grid gap-5 sm:grid-cols-2 max-w-xl">
              <StyledInput placeholder="e.g. The Matrix" label="Favourite Movie" />
              <StyledInput placeholder="e.g. Leonardo DiCaprio" label="Favourite Actor" />
              <StyledInput placeholder="Your name" />
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--pc-t3)' }}
                >
                  With number badge
                </p>
                <div className="flex items-center gap-3">
                  <NumberBadge n={1} />
                  <div className="flex-1">
                    <StyledInput placeholder="Player name" />
                  </div>
                </div>
              </div>
            </div>
            <Label>Default · focus: gold border + ring · used in quiz steps</Label>
          </Card>
        </Section>

        {/* ── Number Badge ─────────────────────────────────────────────── */}
        <Section title="Number Badge">
          <Card>
            <ComponentRow label="Sizes" code="NumberBadge">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <NumberBadge n={n} />
                  <Label>#{n}</Label>
                </div>
              ))}
            </ComponentRow>
            <div className="pt-3">
              <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                Used in <code style={{ color: 'var(--pc-gold)' }}>GroupSetup</code> to label
                participants.
              </p>
            </div>
          </Card>
        </Section>

        {/* ── Quiz Navigation ──────────────────────────────────────────── */}
        <Section title="Quiz Navigation">
          <Card>
            <div className="space-y-4 -mx-6">
              <div>
                <p className="text-xs mb-2 px-6" style={{ color: 'var(--pc-t3)' }}>
                  Can proceed · mid-quiz
                </p>
                <QuizNavigation
                  onBack={() => {}}
                  onNext={() => {}}
                  canProceed={true}
                  isSubmitting={false}
                  isLastStep={false}
                  isLastPerson={false}
                />
              </div>
              <div style={{ borderTop: '1px solid var(--pc-bd1)' }}>
                <p className="text-xs mt-4 mb-2 px-6" style={{ color: 'var(--pc-t3)' }}>
                  Cannot proceed
                </p>
                <QuizNavigation
                  onBack={() => {}}
                  onNext={() => {}}
                  canProceed={false}
                  isSubmitting={false}
                  isLastStep={false}
                  isLastPerson={false}
                />
              </div>
              <div style={{ borderTop: '1px solid var(--pc-bd1)' }}>
                <p className="text-xs mt-4 mb-2 px-6" style={{ color: 'var(--pc-t3)' }}>
                  Last step · submitting
                </p>
                <QuizNavigation
                  onBack={() => {}}
                  onNext={() => {}}
                  canProceed={true}
                  isSubmitting={true}
                  isLastStep={true}
                  isLastPerson={true}
                />
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Step Header Pattern ──────────────────────────────────────── */}
        <Section title="Step Header Pattern">
          <Card>
            <p className="text-xs mb-6" style={{ color: 'var(--pc-t3)' }}>
              Icon badge + Oswald heading used across all quiz step headers.
            </p>
            <div className="space-y-6">
              {[
                {
                  icon: Smile,
                  color: palette.purple,
                  title: "What's your mood?",
                  bg: `${palette.purple}15`,
                },
                {
                  icon: Moon,
                  color: palette.gold,
                  title: 'Pick a tone',
                  bg: 'rgba(245,197,24,0.15)',
                },
                {
                  icon: Clock,
                  color: palette.amber,
                  title: 'Choose an era',
                  bg: 'rgba(255,159,28,0.15)',
                },
                {
                  icon: Clapperboard,
                  color: palette.teal,
                  title: 'Favourite movie',
                  bg: `${palette.teal}15`,
                },
              ].map(({ icon: Icon, color, title, bg }) => (
                <div key={title} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: bg, color }}
                  >
                    <Icon size={20} />
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
                    {title}
                  </h2>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* Footer */}
        <div
          className="mt-8 pt-8 text-center text-sm flex items-center justify-between"
          style={{ borderTop: '1px solid var(--pc-bd1)', color: 'var(--pc-footer)' }}
        >
          <span>PopChoice Components</span>
          <Link
            href="/style-guide"
            className="text-(--pc-t3) text-xs uppercase tracking-widest font-semibold transition-colors hover:text-(--pc-gold)"
          >
            ← Back to Style Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
