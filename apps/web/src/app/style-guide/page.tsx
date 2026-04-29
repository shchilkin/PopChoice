import Link from 'next/link';


import { AgeRatingChip } from '@/components/AgeRatingChip';
import { Button } from '@/components/Button';
import { ProgressDots } from '@/components/ProgressDots';
import { palette } from '@/styles/designTokens';

import { Card, Label, Section } from './_components';

// ── Color Swatch ──────────────────────────────────────────────────────────────

function ColorSwatch({
  color,
  name,
  token,
  isVar = false,
}: {
  color: string;
  name: string;
  token: string;
  isVar?: boolean;
}) {
  const bg = isVar ? undefined : color;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-lg border"
        style={{
          background: isVar ? `var(${color})` : bg,
          borderColor: 'var(--pc-bd2)',
        }}
      />
      <p className="text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
        {name}
      </p>
      <p className="text-xs font-mono" style={{ color: 'var(--pc-t3)' }}>
        {token}
      </p>
    </div>
  );
}

// ── Token Row ─────────────────────────────────────────────────────────────────

function TokenRow({ token, description }: { token: string; description: string }) {
  return (
    <div
      className="flex items-center gap-4 py-3"
      style={{ borderBottom: '1px solid var(--pc-bd1)' }}
    >
      <div
        className="h-8 w-8 shrink-0 rounded-md border"
        style={{ background: `var(${token})`, borderColor: 'var(--pc-bd2)' }}
      />
      <code className="min-w-56 text-xs" style={{ color: 'var(--pc-gold)' }}>
        {token}
      </code>
      <span className="text-sm" style={{ color: 'var(--pc-t2)' }}>
        {description}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StyleGuidePage() {
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
            Style Guide
          </h1>
          <p className="max-w-xl text-lg" style={{ color: 'var(--pc-t2)' }}>
            Design tokens, components, and patterns that make up the PopChoice visual language.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/style-guide/components"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: 'var(--pc-gold-subtle)',
                border: '1px solid var(--pc-gold-bd-subtle)',
                color: 'var(--pc-gold-text)',
              }}
            >
              Components →
            </Link>
          </div>
        </div>

        {/* ── Brand Palette ──────────────────────────────────────────────── */}
        <Section title="Brand Palette">
          <Card>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {(Object.entries(palette) as [string, string][]).map(([key, value]) => (
                <ColorSwatch key={key} color={value} name={key} token={value} />
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Theme Backgrounds ──────────────────────────────────────────── */}
        <Section title="Backgrounds">
          <Card>
            <TokenRow token="--pc-bg" description="Page background" />
            <TokenRow token="--pc-surface" description="Card / surface" />
            <TokenRow token="--pc-surface-hover" description="Hovered surface" />
            <TokenRow token="--pc-surface-deep" description="Deep / nested surface" />
            <TokenRow token="--pc-ghost" description="Subtle interactive fill" />
          </Card>
        </Section>

        {/* ── Text ──────────────────────────────────────────────────────── */}
        <Section title="Text Colors">
          <Card>
            <div className="space-y-3">
              {[
                { token: '--pc-t1', label: 'Primary text', size: 'text-2xl', weight: 'font-bold' },
                {
                  token: '--pc-t2',
                  label: 'Secondary text',
                  size: 'text-xl',
                  weight: 'font-semibold',
                },
                {
                  token: '--pc-t3',
                  label: 'Tertiary text',
                  size: 'text-base',
                  weight: 'font-normal',
                },
                { token: '--pc-t4', label: 'Muted text', size: 'text-sm', weight: 'font-normal' },
                {
                  token: '--pc-gold-text',
                  label: 'Gold text (accessible)',
                  size: 'text-base',
                  weight: 'font-semibold',
                },
                {
                  token: '--pc-amber-text',
                  label: 'Amber text (accessible)',
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
        <Section title="Brand Colors">
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
        <Section title="Gradients">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'CTA', token: '--pc-cta', style: { background: 'var(--pc-cta)' } },
              {
                label: 'CTA Horizontal',
                token: '--pc-cta-h',
                style: { background: 'var(--pc-cta-h)' },
              },
              {
                label: 'Progress',
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
        </Section>

        {/* ── Typography ────────────────────────────────────────────────── */}
        <Section title="Typography">
          <Card>
            <div className="space-y-8">
              {/* Oswald */}
              <div>
                <p
                  className="mb-4 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--pc-t3)' }}
                >
                  Oswald — Display / Headings
                </p>
                <div
                  className="space-y-3"
                  style={{ fontFamily: "var(--font-oswald), 'Oswald', sans-serif" }}
                >
                  {[
                    { text: 'Heading 1', size: 'text-5xl', weight: 'font-bold' },
                    { text: 'Heading 2', size: 'text-4xl', weight: 'font-bold' },
                    { text: 'Heading 3', size: 'text-3xl', weight: 'font-semibold' },
                    { text: 'Heading 4', size: 'text-2xl', weight: 'font-medium' },
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
                  Manrope — Body / UI
                </p>
                <div className="space-y-3">
                  {[
                    { text: 'Body Large', size: 'text-xl', weight: 'font-normal' },
                    { text: 'Body Base', size: 'text-base', weight: 'font-normal' },
                    { text: 'Body Small', size: 'text-sm', weight: 'font-normal' },
                    { text: 'Label Bold', size: 'text-sm', weight: 'font-bold' },
                    { text: 'Caption', size: 'text-xs', weight: 'font-normal' },
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
        <Section title="Buttons">
          <Card>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <Button variant="cta">CTA Button</Button>
                <Label>variant=&quot;cta&quot;</Label>
              </div>
              <div>
                <Button variant="default">Default Button</Button>
                <Label>variant=&quot;default&quot;</Label>
              </div>
              <div>
                <Button variant="ghost">Ghost Button</Button>
                <Label>variant=&quot;ghost&quot;</Label>
              </div>
            </div>
            <div
              className="mt-6 grid gap-6 sm:grid-cols-3"
              style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--pc-bd1)' }}
            >
              <div>
                <Button variant="cta" disabled>
                  CTA Disabled
                </Button>
                <Label>variant=&quot;cta&quot; disabled</Label>
              </div>
              <div>
                <Button variant="default" disabled>
                  Default Disabled
                </Button>
                <Label>variant=&quot;default&quot; disabled</Label>
              </div>
              <div>
                <Button variant="ghost" disabled>
                  Ghost Disabled
                </Button>
                <Label>variant=&quot;ghost&quot; disabled</Label>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Age Rating Chips ──────────────────────────────────────────── */}
        <Section title="Age Rating Chips">
          <Card>
            {/* Sizes */}
            <div className="mb-8">
              <p
                className="mb-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--pc-t3)' }}
              >
                Sizes
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
                All Ratings
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
        <Section title="Progress Dots">
          <Card>
            <div className="space-y-6">
              {[
                { current: 0, total: 5, label: 'Step 1 of 5' },
                { current: 2, total: 5, label: 'Step 3 of 5' },
                { current: 4, total: 5, label: 'Step 5 of 5' },
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
        <Section title="Borders">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { token: '--pc-bd1', label: 'bd1 — subtle' },
              { token: '--pc-bd2', label: 'bd2 — default' },
              { token: '--pc-bd3', label: 'bd3 — medium' },
              { token: '--pc-bd4', label: 'bd4 — strong' },
            ].map(({ token, label }) => (
              <div key={token}>
                <div
                  className="h-20 w-full rounded-xl"
                  style={{
                    background: 'var(--pc-surface)',
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
        </Section>

        {/* ── Shadows ───────────────────────────────────────────────────── */}
        <Section title="Shadows">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { token: '--pc-card-shadow', label: 'Card Shadow' },
              { token: '--pc-cta-shadow', label: 'CTA Shadow' },
              { token: '--pc-cta-shadow-hover', label: 'CTA Shadow Hover' },
            ].map(({ token, label }) => (
              <div key={token}>
                <div
                  className="h-20 w-full rounded-xl"
                  style={{
                    background: 'var(--pc-surface)',
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
        </Section>

        {/* ── Gold Accent States ────────────────────────────────────────── */}
        <Section title="Gold Accent States">
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
        <Section title="Spacing Scale">
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
        <Section title="Border Radius">
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
                    background: 'var(--pc-surface)',
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
        </Section>

        {/* Footer */}
        <div
          className="mt-8 pt-8 text-sm flex items-center justify-between"
          style={{ borderTop: '1px solid var(--pc-bd1)', color: 'var(--pc-footer)' }}
        >
          <span>PopChoice Style Guide &mdash; design tokens &amp; components</span>
          <Link
            href="/style-guide/components"
            className="text-(--pc-t3) text-xs uppercase tracking-widest font-semibold transition-colors hover:text-(--pc-gold)"
          >
            Components →
          </Link>
        </div>
      </div>
    </div>
  );
}
