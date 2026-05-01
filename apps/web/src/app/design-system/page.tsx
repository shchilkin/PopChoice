'use client';

import Link from 'next/link';

import { AgeRatingChip } from '@/components/AgeRatingChip';
import { Button } from '@/components/Button';
import { ProgressDots } from '@/components/ProgressDots';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { Card, ColorSwatch, Label, MascotSection, Section, TokenRow } from './_components';

export default function StyleGuidePage() {
  const { t } = useLanguage();
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
        <div className="mb-20">
          <p
            className="mb-4 text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--pc-gold)' }}
          >
            PopChoice
          </p>
          <h1
            className="mb-6"
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
            {t.styleGuide.title}
          </h1>
          <p
            className="max-w-2xl mb-10"
            style={{ color: 'var(--pc-t2)', fontSize: '1.05rem', lineHeight: 1.7 }}
          >
            {t.styleGuide.description}
          </p>
          <nav className="flex flex-wrap items-center gap-2">
            {[
              { label: t.styleGuide.nav.brandPalette, href: '#brand-palette' },
              { label: t.styleGuide.nav.typography, href: '#typography' },
              { label: t.styleGuide.nav.buttons, href: '#buttons' },
              { label: t.styleGuide.nav.progressDots, href: '#progress-dots' },
              { label: t.styleGuide.nav.components, href: '/style-guide/components' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.06em] transition-colors duration-200 hover:text-(--pc-t1)"
                style={{
                  background: 'var(--pc-surface)',
                  border: '1px solid var(--pc-bd2)',
                  color: 'var(--pc-t3)',
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Brand Voice ───────────────────────────────────────────── */}
        <section className="mb-20">
          <p
            className="mb-6 text-sm font-bold uppercase tracking-[0.2em]"
            style={{
              color: 'var(--pc-gold)',
              fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
            }}
          >
            {t.styleGuide.sections.brandVoice}
          </p>
          <div
            className="grid gap-8 sm:grid-cols-3"
            style={{ borderTop: '1px solid var(--pc-bd1)', paddingTop: '1.5rem' }}
          >
            {[
              t.styleGuide.voice.cinematic,
              t.styleGuide.voice.confident,
              t.styleGuide.voice.playful,
            ].map(({ word, desc }) => (
              <div key={word}>
                <p
                  className="mb-3"
                  style={{
                    fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '1.4rem',
                    letterSpacing: '0.06em',
                    color: 'var(--pc-t1)',
                  }}
                >
                  {word}
                </p>
                <p className="text-sm" style={{ color: 'var(--pc-t2)', lineHeight: 1.7 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Mascot ────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.mascot} id="mascot">
          <Card>
            <MascotSection />
          </Card>
        </Section>

        {/* ── Brand Principles ───────────────────────────────────────────── */}
        <div className="mb-16" style={{ borderTop: '1px solid var(--pc-bd1)' }}>
          {[
            { num: '01', ...t.styleGuide.principles.p01 },
            { num: '02', ...t.styleGuide.principles.p02 },
            { num: '03', ...t.styleGuide.principles.p03 },
            { num: '04', ...t.styleGuide.principles.p04 },
          ].map(({ num, title, body }) => (
            <div
              key={num}
              className="grid gap-x-8 gap-y-1 py-6 sm:grid-cols-[3rem_minmax(180px,1fr)_minmax(0,2fr)]"
              style={{ borderBottom: '1px solid var(--pc-bd1)' }}
            >
              <span
                className="text-xs font-bold"
                style={{ color: 'var(--pc-t4)', fontFamily: 'monospace', paddingTop: '0.1rem' }}
              >
                {num}
              </span>
              <p className="text-sm font-bold" style={{ color: 'var(--pc-t1)' }}>
                {title}
              </p>
              <p className="text-sm" style={{ color: 'var(--pc-t2)', lineHeight: 1.7 }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* ── Brand Palette ──────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.brandPalette} id="brand-palette">
          <Card>
            <div className="space-y-0">
              {[
                { name: 'Gold', cssVar: '--pc-gold', hex: palette.gold },
                { name: 'Amber', cssVar: '--pc-amber', hex: palette.amber },
                { name: 'Purple', cssVar: null, hex: palette.purple },
                { name: 'Purple Light', cssVar: null, hex: palette.purpleLight },
                { name: 'Teal', cssVar: null, hex: palette.teal },
                { name: 'Red', cssVar: null, hex: palette.red },
                { name: 'Pink', cssVar: null, hex: palette.pink },
                { name: 'Gray', cssVar: null, hex: palette.gray },
                { name: 'Green', cssVar: null, hex: palette.green },
                { name: 'Blue', cssVar: null, hex: palette.blue },
              ].map(({ name, cssVar, hex }) => (
                <div
                  key={name}
                  className="flex items-center gap-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                >
                  <div
                    className="h-8 w-8 shrink-0 rounded-md border"
                    style={{ background: hex, borderColor: 'var(--pc-bd2)' }}
                  />
                  <span className="w-28 text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
                    {name}
                  </span>
                  <code className="w-32 text-xs font-mono" style={{ color: 'var(--pc-gold)' }}>
                    {cssVar ?? 'palette.' + name.toLowerCase().replace(' ', '')}
                  </code>
                  <code className="text-xs font-mono" style={{ color: 'var(--pc-t3)' }}>
                    {hex}
                  </code>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Theme Backgrounds ──────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.backgrounds} id="backgrounds">
          <Card>
            <TokenRow token="--pc-bg" description={t.styleGuide.tokens.pageBackground} />
            <TokenRow token="--pc-surface" description={t.styleGuide.tokens.cardSurface} />
            <TokenRow token="--pc-surface-hover" description={t.styleGuide.tokens.hoveredSurface} />
            <TokenRow token="--pc-surface-deep" description={t.styleGuide.tokens.deepSurface} />
            <TokenRow token="--pc-ghost" description={t.styleGuide.tokens.subtleInteractive} />
          </Card>
        </Section>

        {/* ── Text ──────────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.textColors} id="text-colors">
          <Card>
            <div className="space-y-3">
              {[
                {
                  token: '--pc-t1',
                  label: t.styleGuide.tokens.primaryText,
                  size: 'text-2xl',
                  weight: 'font-bold',
                },
                {
                  token: '--pc-t2',
                  label: t.styleGuide.tokens.secondaryText,
                  size: 'text-xl',
                  weight: 'font-semibold',
                },
                {
                  token: '--pc-t3',
                  label: t.styleGuide.tokens.tertiaryText,
                  size: 'text-base',
                  weight: 'font-normal',
                },
                {
                  token: '--pc-t4',
                  label: t.styleGuide.tokens.mutedText,
                  size: 'text-sm',
                  weight: 'font-normal',
                },
                {
                  token: '--pc-gold-text',
                  label: t.styleGuide.tokens.goldText,
                  size: 'text-base',
                  weight: 'font-semibold',
                },
                {
                  token: '--pc-amber-text',
                  label: t.styleGuide.tokens.amberText,
                  size: 'text-base',
                  weight: 'font-semibold',
                },
              ].map(({ token, label, size, weight }) => (
                <div key={token} className="flex items-baseline gap-4">
                  <span
                    className={`${size} ${weight}`}
                    style={{ color: `var(${token})`, minWidth: 240 }}
                  >
                    {label}
                  </span>
                  <code
                    className="text-xs"
                    style={{ color: 'var(--pc-t3)', fontFamily: 'monospace' }}
                  >
                    {token}
                  </code>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Brand Colors ──────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.brandColors} id="brand-colors">
          <Card>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorSwatch isVar color="--pc-gold" name="Gold" token="--pc-gold" />
              <ColorSwatch isVar color="--pc-amber" name="Amber" token="--pc-amber" />
              <ColorSwatch
                isVar
                color="--pc-gold-subtle"
                name="Gold Subtle"
                token="--pc-gold-subtle"
              />
              <ColorSwatch isVar color="--pc-gold-wash" name="Gold Wash" token="--pc-gold-wash" />
            </div>
          </Card>
        </Section>

        {/* ── Gradients ─────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.gradients} id="gradients">
          <Card>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: t.styleGuide.tokens.ctaGradient,
                  token: '--pc-cta',
                  style: { background: 'var(--pc-cta)' },
                },
                {
                  label: t.styleGuide.tokens.ctaHorizontal,
                  token: '--pc-cta-h',
                  style: { background: 'var(--pc-cta-h)' },
                },
                {
                  label: t.styleGuide.tokens.progressGradient,
                  token: '--pc-progress',
                  style: { background: 'var(--pc-progress)' },
                },
              ].map(({ label, token, style }) => (
                <div key={token}>
                  <div className="h-16 w-full rounded-xl" style={style} />
                  <Label>{token}</Label>
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--pc-t2)' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Typography ────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.typography} id="typography">
          <Card>
            <div className="space-y-8">
              {/* Oswald */}
              <div>
                <p
                  className="mb-4 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--pc-t3)' }}
                >
                  {t.styleGuide.typo.oswaldLabel}
                </p>
                <div
                  className="space-y-3"
                  style={{
                    fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {[
                    { text: 'Find Your Film', size: 'text-5xl', weight: 'font-bold' },
                    { text: 'Group Mode', size: 'text-4xl', weight: 'font-bold' },
                    { text: 'How It Works', size: 'text-3xl', weight: 'font-semibold' },
                    { text: 'Taste Profile', size: 'text-2xl', weight: 'font-medium' },
                  ].map(({ text, size, weight }) => (
                    <div key={text} className="flex items-baseline gap-4">
                      <span
                        className={`${size} ${weight}`}
                        style={{ color: 'var(--pc-t1)', minWidth: 200 }}
                      >
                        {text}
                      </span>
                      <code className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                        {size} {weight}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--pc-bd1)', paddingTop: '2rem' }}>
                <p
                  className="mb-4 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--pc-t3)' }}
                >
                  {t.styleGuide.typo.manropeLabel}
                </p>
                <div className="space-y-3">
                  {[
                    {
                      text: 'Five questions. One film worth watching.',
                      size: 'text-xl',
                      weight: 'font-normal',
                    },
                    {
                      text: 'Your answers become a taste profile matched by tone, pacing, and style.',
                      size: 'text-base',
                      weight: 'font-normal',
                    },
                    {
                      text: 'No sign-up required. Takes about 60 seconds.',
                      size: 'text-sm',
                      weight: 'font-normal',
                    },
                    { text: 'AI-Powered Match', size: 'text-sm', weight: 'font-bold' },
                    { text: '400+ pre-analyzed films', size: 'text-xs', weight: 'font-normal' },
                  ].map(({ text, size, weight }) => (
                    <div key={text} className="flex items-baseline gap-4">
                      <span
                        className={`${size} ${weight}`}
                        style={{ color: 'var(--pc-t1)', minWidth: 200 }}
                      >
                        {text}
                      </span>
                      <code className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                        {size} {weight}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Buttons ───────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.buttons} id="buttons">
          <Card>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <Button variant="cta">{t.styleGuide.btns.ctaButton}</Button>
                <Label>variant=&quot;cta&quot;</Label>
              </div>
              <div>
                <Button variant="default">{t.styleGuide.btns.defaultButton}</Button>
                <Label>variant=&quot;default&quot;</Label>
              </div>
              <div>
                <Button variant="ghost">{t.styleGuide.btns.ghostButton}</Button>
                <Label>variant=&quot;ghost&quot;</Label>
              </div>
            </div>
            <div
              className="mt-6 grid gap-6 sm:grid-cols-3"
              style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--pc-bd1)' }}
            >
              <div>
                <Button variant="cta" disabled>
                  {t.styleGuide.btns.ctaDisabled}
                </Button>
                <Label>variant=&quot;cta&quot; disabled</Label>
              </div>
              <div>
                <Button variant="default" disabled>
                  {t.styleGuide.btns.defaultDisabled}
                </Button>
                <Label>variant=&quot;default&quot; disabled</Label>
              </div>
              <div>
                <Button variant="ghost" disabled>
                  {t.styleGuide.btns.ghostDisabled}
                </Button>
                <Label>variant=&quot;ghost&quot; disabled</Label>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Age Rating Chips ──────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.ageRatingChips} id="age-rating-chips">
          <Card>
            <p className="text-xs mb-6" style={{ color: 'var(--pc-t3)' }}>
              {t.styleGuide.ageChip.note}
            </p>
            {/* Sizes */}
            <div className="mb-8">
              <p
                className="mb-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--pc-t3)' }}
              >
                {t.styleGuide.typo.sizes}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <AgeRatingChip rating="PG-13" size="sm" />
                  <Label>sm</Label>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <AgeRatingChip rating="PG-13" size="md" />
                  <Label>md</Label>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <AgeRatingChip rating="PG-13" size="lg" />
                  <Label>lg</Label>
                </div>
              </div>
            </div>

            {/* All ratings */}
            <div style={{ borderTop: '1px solid var(--pc-bd1)', paddingTop: '1.5rem' }}>
              <p
                className="mb-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--pc-t3)' }}
              >
                {t.styleGuide.typo.allRatings}
              </p>
              <div className="flex flex-wrap gap-3">
                {(['G', 'PG', 'PG-13', 'R', '12+', '15', '16+', '18+', 'NR'] as const).map(
                  (rating) => (
                    <div key={rating} className="flex flex-col items-center gap-2">
                      <AgeRatingChip rating={rating} />
                      <Label>{rating}</Label>
                    </div>
                  ),
                )}
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Progress Dots ─────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.progressDots} id="progress-dots">
          <Card>
            <div className="space-y-6">
              {[
                { current: 0, total: 5, label: t.styleGuide.progress.step1 },
                { current: 2, total: 5, label: t.styleGuide.progress.step3 },
                { current: 4, total: 5, label: t.styleGuide.progress.step5 },
              ].map(({ current, total, label }) => (
                <div key={label} className="flex items-center gap-6">
                  <ProgressDots current={current} total={total} />
                  <span className="text-sm" style={{ color: 'var(--pc-t3)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Borders ───────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.borders} id="borders">
          <Card>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { token: '--pc-bd1', label: t.styleGuide.tokens.subtleBorder },
                { token: '--pc-bd2', label: t.styleGuide.tokens.defaultBorder },
                { token: '--pc-bd3', label: t.styleGuide.tokens.mediumBorder },
                { token: '--pc-bd4', label: t.styleGuide.tokens.strongBorder },
              ].map(({ token, label }) => (
                <div key={token}>
                  <div
                    className="h-20 w-full rounded-xl"
                    style={{
                      background: 'var(--pc-surface-deep)',
                      border: `2px solid var(${token})`,
                    }}
                  />
                  <Label>{token}</Label>
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--pc-t2)' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Shadows ───────────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.shadows} id="shadows">
          <Card>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { token: '--pc-card-shadow', label: t.styleGuide.tokens.cardShadow },
                { token: '--pc-cta-shadow', label: t.styleGuide.tokens.ctaShadow },
                { token: '--pc-cta-shadow-hover', label: t.styleGuide.tokens.ctaShadowHover },
              ].map(({ token, label }) => (
                <div key={token}>
                  <div
                    className="h-20 w-full rounded-xl"
                    style={{
                      background: 'var(--pc-surface-deep)',
                      boxShadow: `var(${token})`,
                    }}
                  />
                  <Label>{token}</Label>
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--pc-t2)' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Gold Accent States ────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.goldAccentStates} id="gold-accent-states">
          <Card>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                '--pc-gold-subtle',
                '--pc-gold-tint',
                '--pc-gold-wash',
                '--pc-gold-focus',
                '--pc-gold-bd-subtle',
                '--pc-gold-bd',
                '--pc-gold-bd-strong',
                '--pc-ai-bg',
              ].map((token) => (
                <ColorSwatch
                  key={token}
                  isVar
                  color={token}
                  name={token.replace('--pc-', '')}
                  token={token}
                />
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Spacing Scale ─────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.spacingScale} id="spacing-scale">
          <Card>
            <div className="space-y-3">
              {[
                { size: '4px', tailwind: 'p-1 / gap-1', px: 4 },
                { size: '8px', tailwind: 'p-2 / gap-2', px: 8 },
                { size: '12px', tailwind: 'p-3 / gap-3', px: 12 },
                { size: '16px', tailwind: 'p-4 / gap-4', px: 16 },
                { size: '24px', tailwind: 'p-6 / gap-6', px: 24 },
                { size: '32px', tailwind: 'p-8 / gap-8', px: 32 },
                { size: '48px', tailwind: 'p-12 / gap-12', px: 48 },
                { size: '64px', tailwind: 'p-16 / gap-16', px: 64 },
              ].map(({ size, tailwind, px }) => (
                <div key={size} className="flex items-center gap-4">
                  <div
                    className="h-4 rounded-sm shrink-0"
                    style={{
                      width: px,
                      background: 'var(--pc-cta)',
                    }}
                  />
                  <code className="w-12 text-xs" style={{ color: 'var(--pc-t1)' }}>
                    {size}
                  </code>
                  <code className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                    {tailwind}
                  </code>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Border Radius ─────────────────────────────────────────────── */}
        <Section title={t.styleGuide.sections.borderRadius} id="border-radius">
          <Card>
            <div className="flex flex-wrap items-end gap-8">
              {[
                { label: 'sm', radius: '0.125rem', class: 'rounded-sm', px: 40 },
                { label: 'md', radius: '0.375rem', class: 'rounded-md', px: 52 },
                { label: 'lg', radius: '0.5rem', class: 'rounded-lg', px: 64 },
                { label: 'xl', radius: '0.75rem', class: 'rounded-xl', px: 72 },
                { label: '2xl', radius: '1rem', class: 'rounded-2xl', px: 80 },
                { label: 'full', radius: '9999px', class: 'rounded-full', px: 56 },
              ].map(({ label, radius, class: cls, px }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className={cls}
                    style={{
                      width: px,
                      height: px,
                      background: 'var(--pc-surface-deep)',
                      border: '2px solid var(--pc-bd3)',
                    }}
                  />
                  <Label>{label}</Label>
                  <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
                    {radius}
                  </p>
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
          <span>{t.styleGuide.footerTokens}</span>
          <Link
            href="/style-guide/components"
            className="text-(--pc-t3) text-xs uppercase tracking-widest font-semibold transition-colors hover:text-(--pc-gold)"
          >
            {t.styleGuide.forwardLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
