'use client';

import { Clapperboard, Clock, Moon, Play, Smile, Sparkles, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { QuizNavigation } from '@/app/quiz/components';
import { AgeRatingPill } from '@/app/results/components/AgeRatingPill';
import { SimilarityBadge } from '@/app/results/components/SimilarityBadge';
import { SmallSuggestionCard } from '@/app/results/components/SmallSuggestionCard';
import { StarRating } from '@/app/results/components/StarRating';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Mascot } from '@/components/Mascot';
import { MoviesTable, MoviesTableSkeleton } from '@/components/MoviesTable';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TMDBAttribution } from '@/components/TMDBAttribution';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { Card, Label, Section } from '../_components';

import {
  AIBlock,
  AlertBanner,
  ComponentRow,
  EraOption,
  FeatureCard,
  GenreChip,
  NumberBadge,
  SkeletonCard,
  StyledInput,
  ToneCard,
} from './_components';
import { MOCK_MOVIES, MOCK_TABLE_MOVIES } from './_data';

export default function StyleGuideComponentsPage() {
  const { t } = useLanguage();

  const GENRES_L = [
    { id: 'action', label: t.genres.action, icon: Zap, color: palette.amber },
    { id: 'comedy', label: t.genres.comedy, icon: Smile, color: palette.gold },
    { id: 'drama', label: t.genres.drama, icon: Play, color: palette.purple },
    { id: 'scifi', label: t.genres.scifi, icon: Sparkles, color: palette.teal },
  ];

  const TONES_L = [
    {
      id: 'light',
      label: t.tones.light.label,
      desc: t.tones.light.desc,
      icon: Sparkles,
      color: palette.gold,
      grad: `linear-gradient(135deg, ${palette.gold}18, ${palette.amber}18)`,
    },
    {
      id: 'balanced',
      label: t.tones.balanced.label,
      desc: t.tones.balanced.desc,
      icon: Play,
      color: palette.teal,
      grad: `linear-gradient(135deg, ${palette.teal}18, ${palette.blue}18)`,
    },
    {
      id: 'serious',
      label: t.tones.serious.label,
      desc: t.tones.serious.desc,
      icon: Play,
      color: palette.purple,
      grad: `linear-gradient(135deg, ${palette.purple}18, ${palette.purpleLight}18)`,
    },
    {
      id: 'dark',
      label: t.tones.dark.label,
      desc: t.tones.dark.desc,
      icon: Clapperboard,
      color: palette.gray,
      grad: `linear-gradient(135deg, ${palette.gray}18, ${palette.red}18)`,
    },
  ];

  const ERAS_L = [
    {
      id: 'new',
      emoji: '✨',
      title: t.quiz.era.new.title,
      desc: t.quiz.era.new.desc,
      color: palette.teal,
    },
    {
      id: 'classic',
      emoji: '🎞️',
      title: t.quiz.era.classic.title,
      desc: t.quiz.era.classic.desc,
      color: palette.gold,
    },
    {
      id: 'both',
      emoji: '🎬',
      title: t.quiz.era.both.title,
      desc: t.quiz.era.both.desc,
      color: palette.purple,
    },
  ];
  // Selectable demo state
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['comedy']);
  const [selectedTone, setSelectedTone] = useState<string>('light');
  const [selectedEra, setSelectedEra] = useState<string>('both');
  const [activeCard, setActiveCard] = useState<number>(0);
  const [skeletonLoading, setSkeletonLoading] = useState<boolean>(true);

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
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/style-guide"
            className="text-(--pc-t3) text-xs uppercase tracking-widest font-semibold transition-colors hover:text-(--pc-gold)"
          >
            {t.styleGuide.backLink}
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
            className="mb-4"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: 'clamp(3rem, 8vw, 5rem)',
              letterSpacing: '0.04em',
              lineHeight: 1,
              color: 'var(--pc-t1)',
            }}
          >
            {t.styleGuide.componentsTitle}
          </h1>
          <p className="max-w-xl text-lg" style={{ color: 'var(--pc-t2)' }}>
            {t.styleGuide.componentsDescription}
          </p>
        </div>

        {/* ── Mascot ──────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.mascot} id="mascot">
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
                {t.styleGuide.comp.mascotNote}
              </p>
            </div>
          </Card>
        </Section>

        {/* ── Header Controls ──────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.headerControls} id="header-controls">
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

        {/* ── Breadcrumbs ──────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.breadcrumbs} id="breadcrumbs">
          <Card>
            <ComponentRow label="Default" code="<Breadcrumbs items={[...]} />">
              <Breadcrumbs
                items={[
                  { href: '/', label: t.styleGuide.comp.breadcrumbHome },
                  { href: '/quiz', label: t.styleGuide.comp.breadcrumbQuiz },
                  { label: t.styleGuide.comp.breadcrumbResults },
                ]}
              />
            </ComponentRow>
            <ComponentRow label="Single item" code="current page only">
              <Breadcrumbs items={[{ label: t.styleGuide.comp.breadcrumbStyleGuide }]} />
            </ComponentRow>
            <div className="pt-3">
              <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                {t.styleGuide.comp.breadcrumbsNote}
              </p>
            </div>
          </Card>
        </Section>

        {/* ── TMDB Attribution ─────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.tmdbAttribution} id="tmdb-attribution">
          <Card className="max-w-sm">
            <TMDBAttribution />
            <Label>&lt;TMDBAttribution /&gt;</Label>
          </Card>
        </Section>

        {/* ── SimilarityBadge ────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.similarityBadge} id="similarity-badge">
          <Card>
            <ComponentRow label={t.styleGuide.comp.similarity95} code="similarity={0.97}">
              <SimilarityBadge similarity={0.97} />
            </ComponentRow>
            <ComponentRow label={t.styleGuide.comp.similarity90} code="similarity={0.92}">
              <SimilarityBadge similarity={0.92} />
            </ComponentRow>
            <ComponentRow label={t.styleGuide.comp.similarity85} code="similarity={0.87}">
              <SimilarityBadge similarity={0.87} />
            </ComponentRow>
            <ComponentRow label={t.styleGuide.comp.similarityLow} code="similarity={0.80}">
              <SimilarityBadge similarity={0.8} />
            </ComponentRow>
          </Card>
        </Section>

        {/* ── StarRating ───────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.starRating} id="star-rating">
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
        <Section title={t.styleGuide.sections.ageRatingPill} id="age-rating-pill">
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
                <strong style={{ color: 'var(--pc-t2)' }}>AgeRatingPill</strong> — neutral, no color
                semantics. Used in{' '}
                <code style={{ color: 'var(--pc-gold)' }}>SmallSuggestionCard</code> where space is
                tight and color would compete with similarity badges.{' '}
                <strong style={{ color: 'var(--pc-t2)' }}>AgeRatingChip</strong> — semantic color
                per band. Used in <code style={{ color: 'var(--pc-gold)' }}>MoviesTable</code> and
                detail views where the rating is the primary data point (see Design System).
              </p>
            </div>
          </Card>
        </Section>

        {/* ── Movie Cards ──────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.movieCards} id="movie-cards">
          <div className="mb-4">
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              {t.styleGuide.comp.movieCardsNote}
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
          <Label>{t.styleGuide.comp.movieCardsLabel}</Label>
        </Section>

        {/* ── Skeleton States ──────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.skeletonLoading} id="skeleton-loading">
          <div className="space-y-6">
            {/* Toggle */}
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--pc-t3)' }}
              >
                {t.styleGuide.comp.stateLabel}
              </span>
              <button
                type="button"
                onClick={() => setSkeletonLoading((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: skeletonLoading ? 'var(--pc-gold-subtle)' : 'var(--pc-surface)',
                  border: `1px solid ${skeletonLoading ? 'var(--pc-gold-bd)' : 'var(--pc-bd2)'}`,
                  color: skeletonLoading ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
                }}
              >
                {skeletonLoading ? t.styleGuide.comp.loading : t.styleGuide.comp.loaded}
              </button>
            </div>

            {/* MoviesTable */}
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--pc-t3)' }}>
                {t.styleGuide.comp.skeletonMoviesNote}
              </p>
              {skeletonLoading ? (
                <MoviesTableSkeleton />
              ) : (
                <MoviesTable movies={MOCK_TABLE_MOVIES} />
              )}
            </div>

            {/* Card skeleton */}
            <div style={{ borderTop: '1px solid var(--pc-bd1)', paddingTop: '1.5rem' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--pc-t3)' }}>
                {t.styleGuide.comp.skeletonCardNote}
              </p>
              <div className="flex gap-4 flex-wrap">
                {MOCK_MOVIES.map((movie) => (
                  <SkeletonCard key={movie.id} loading={skeletonLoading} movie={movie} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── AI Content Block ─────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.aiContentBlock} id="ai-content-block">
          <Card>
            <AIBlock label={t.styleGuide.comp.aiPickLabel}>
              {t.styleGuide.comp.aiBlockContent}
            </AIBlock>
            <Label>{t.styleGuide.comp.aiBlockLabel}</Label>
          </Card>
        </Section>

        {/* ── Alert Banners ────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.alertBanners} id="alert-banners">
          <Card>
            <div className="space-y-3">
              <AlertBanner type="info">{t.styleGuide.comp.alertInfo}</AlertBanner>
              <AlertBanner type="warning">{t.styleGuide.comp.alertWarning}</AlertBanner>
              <AlertBanner type="error">{t.styleGuide.comp.alertError}</AlertBanner>
            </div>
          </Card>
        </Section>

        {/* ── Feature Cards ────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.featureCards} id="feature-cards">
          <Card>
            <p className="text-xs mb-6" style={{ color: 'var(--pc-t3)' }}>
              {t.styleGuide.comp.featureCardsNote}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <FeatureCard
                icon={Sparkles}
                title={t.styleGuide.comp.featureAiTitle}
                desc={t.styleGuide.comp.featureAiDesc}
                color={palette.gold}
              />
              <FeatureCard
                icon={Play}
                title={t.styleGuide.comp.featureQuestionsTitle}
                desc={t.styleGuide.comp.featureQuestionsDesc}
                color={palette.amber}
              />
              <FeatureCard
                icon={Users}
                title={t.styleGuide.comp.featureGroupTitle}
                desc={t.styleGuide.comp.featureGroupDesc}
                color={palette.purple}
              />
              <FeatureCard
                icon={Zap}
                title={t.styleGuide.comp.featureInstantTitle}
                desc={t.styleGuide.comp.featureInstantDesc}
                color={palette.teal}
              />
            </div>
            <Label>{t.styleGuide.comp.featureCardsLabel}</Label>
          </Card>
        </Section>

        {/* ── Genre Selector ───────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.genreSelector} id="genre-selector">
          <Card>
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              {t.styleGuide.comp.genreSelectorNote}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GENRES_L.map((g) => (
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
        <Section title={t.styleGuide.sections.toneSelector} id="tone-selector">
          <Card>
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              {t.styleGuide.comp.toneSelectorNote}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TONES_L.map((tone) => (
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
        <Section title={t.styleGuide.sections.eraSelector} id="era-selector">
          <Card>
            <p className="text-xs mb-4" style={{ color: 'var(--pc-t3)' }}>
              {t.styleGuide.comp.eraSelectorNote}
            </p>
            <div className="flex flex-col gap-3 max-w-sm">
              {ERAS_L.map((era) => (
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
        <Section title={t.styleGuide.sections.textInputs} id="text-inputs">
          <Card>
            <div className="grid gap-5 sm:grid-cols-2 max-w-xl">
              <StyledInput
                placeholder="e.g. The Matrix"
                label={t.styleGuide.comp.inputFavouriteMovie}
              />
              <StyledInput
                placeholder="e.g. Leonardo DiCaprio"
                label={t.styleGuide.comp.inputFavouriteActor}
              />
              <StyledInput placeholder="Your name" />
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--pc-t3)' }}
                >
                  {t.styleGuide.comp.inputWithNumberBadge}
                </p>
                <div className="flex items-center gap-3">
                  <NumberBadge n={1} />
                  <div className="flex-1">
                    <StyledInput placeholder="Player name" />
                  </div>
                </div>
              </div>
            </div>
            <Label>{t.styleGuide.comp.inputsLabel}</Label>
          </Card>
        </Section>

        {/* ── Number Badge ─────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.numberBadge} id="number-badge">
          <Card>
            <ComponentRow label={t.styleGuide.typo.sizes} code="NumberBadge">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <NumberBadge n={n} />
                  <Label>#{n}</Label>
                </div>
              ))}
            </ComponentRow>
            <div className="pt-3">
              <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                {t.styleGuide.comp.numberBadgeNote}
              </p>
            </div>
          </Card>
        </Section>

        {/* ── Quiz Navigation ──────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.quizNavigation} id="quiz-navigation">
          <Card>
            <div className="space-y-4 -mx-6">
              <div>
                <p className="text-xs mb-2 px-6" style={{ color: 'var(--pc-t3)' }}>
                  {t.styleGuide.comp.quizNavCanProceed}
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
                  {t.styleGuide.comp.quizNavCannotProceed}
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
                  {t.styleGuide.comp.quizNavLastStep}
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
        <Section title={t.styleGuide.sections.stepHeaderPattern} id="step-header-pattern">
          <Card>
            <p className="text-xs mb-6" style={{ color: 'var(--pc-t3)' }}>
              {t.styleGuide.comp.stepHeaderNote}
            </p>
            <div className="space-y-6">
              {[
                {
                  icon: Smile,
                  color: palette.purple,
                  title: t.quiz.mood.title,
                  bg: `${palette.purple}15`,
                },
                {
                  icon: Moon,
                  color: palette.gold,
                  title: t.quiz.tone.title,
                  bg: 'rgba(245,197,24,0.15)',
                },
                {
                  icon: Clock,
                  color: palette.amber,
                  title: t.quiz.era.title,
                  bg: 'rgba(255,159,28,0.15)',
                },
                {
                  icon: Clapperboard,
                  color: palette.teal,
                  title: t.quiz.favoriteMovie.title,
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
          className="mt-8 pt-8 text-sm flex items-center justify-between"
          style={{ borderTop: '1px solid var(--pc-bd1)', color: 'var(--pc-footer)' }}
        >
          <span>{t.styleGuide.footerComponents}</span>
          <Link
            href="/style-guide"
            className="text-(--pc-t3) text-xs uppercase tracking-widest font-semibold transition-colors hover:text-(--pc-gold)"
          >
            {t.styleGuide.backLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
