import React from 'react';

import { ColorSwatch, GradientSwatch, SectionHeader, SwatchRow } from './helpers';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta = {
  title: 'Design System/Colors',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

// ── Genre Colors (fixed hex per design guidelines) ────────────────────────
const GENRE_COLORS: { name: string; hex: string }[] = [
  { name: 'Action', hex: '#FF9F1C' },
  { name: 'Comedy', hex: '#F5C518' },
  { name: 'Drama', hex: '#8B5CF6' },
  { name: 'Sci-Fi', hex: '#14B8A6' },
  { name: 'Thriller', hex: '#EF4444' },
  { name: 'Romance', hex: '#EC4899' },
  { name: 'Horror', hex: '#6B7280' },
  { name: 'Adventure', hex: '#10B981' },
  { name: 'Animation', hex: '#A78BFA' },
  { name: 'Documentary', hex: '#60A5FA' },
];

// ── Match Badge Colors ─────────────────────────────────────────────────────
const MATCH_COLORS: { label: string; hex: string; threshold: string }[] = [
  { label: 'Excellent', hex: '#14B8A6', threshold: '≥ 95%' },
  { label: 'Great', hex: '#F5C518', threshold: '≥ 90%' },
  { label: 'Good', hex: '#FF9F1C', threshold: '≥ 85%' },
  { label: 'Moderate', hex: '#8B5CF6', threshold: '< 85%' },
];

export const AllColors: Story = {
  name: 'All Colors',
  render: () => (
    <div
      style={{
        background: 'var(--pc-bg)',
        color: 'var(--pc-t1)',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'Manrope, Inter, sans-serif',
      }}
    >
      <h1
        style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          fontSize: '2rem',
          marginBottom: '0.5rem',
          background: 'var(--pc-cta)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Color System
      </h1>
      <p style={{ color: 'var(--pc-t2)', marginBottom: '1rem', fontSize: '0.95rem' }}>
        All{' '}
        <code style={{ background: 'var(--pc-surface-deep)', padding: '1px 4px', borderRadius: 4 }}>
          --pc-*
        </code>{' '}
        color tokens. Toggle the Storybook theme to see dark / light variants.
      </p>

      {/* ── Brand Accents ─────────────────────────────────────────────── */}
      <SectionHeader>Brand Accents</SectionHeader>
      <SwatchRow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--pc-t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Dark mode
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <ColorSwatch hex="#F5C518" label="Gold" description="#F5C518" />
            <ColorSwatch hex="#FF9F1C" label="Amber" description="#FF9F1C" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--pc-t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Light mode
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <ColorSwatch hex="#C4950A" label="Gold" description="#C4950A" />
            <ColorSwatch hex="#D4760C" label="Amber" description="#D4760C" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--pc-t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Theme-aware (active)
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <ColorSwatch token="--pc-gold" label="--pc-gold" description="Gold" />
            <ColorSwatch token="--pc-amber" label="--pc-amber" description="Amber" />
          </div>
        </div>
      </SwatchRow>

      {/* ── Background Tokens ─────────────────────────────────────────── */}
      <SectionHeader>Background Tokens</SectionHeader>
      <SwatchRow>
        <ColorSwatch token="--pc-bg" label="--pc-bg" description="Page background" size={90} />
        <ColorSwatch
          token="--pc-surface"
          label="--pc-surface"
          description="Cards / panels"
          size={90}
        />
        <ColorSwatch
          token="--pc-surface-hover"
          label="--pc-surface-hover"
          description="Hovered panels"
          size={90}
        />
        <ColorSwatch
          token="--pc-surface-deep"
          label="--pc-surface-deep"
          description="Skeletons / deep"
          size={90}
        />
      </SwatchRow>

      {/* ── Text Tokens ───────────────────────────────────────────────── */}
      <SectionHeader>Text Tokens</SectionHeader>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: 'var(--pc-surface)',
          padding: '1.25rem',
          borderRadius: 12,
          border: '1px solid var(--pc-bd2)',
        }}
      >
        {['--pc-t1', '--pc-t2', '--pc-t3', '--pc-t4', '--pc-t5'].map((token, i) => (
          <div key={token} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <code
              style={{
                fontSize: '0.72rem',
                color: 'var(--pc-t3)',
                minWidth: 100,
                background: 'var(--pc-surface-deep)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {token}
            </code>
            <span style={{ color: `var(${token})`, fontSize: '1rem' }}>
              The quick brown fox jumps over the lazy dog — t{i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* ── Border Tokens ─────────────────────────────────────────────── */}
      <SectionHeader>Border Tokens</SectionHeader>
      <SwatchRow>
        {['--pc-bd1', '--pc-bd2', '--pc-bd3', '--pc-bd4'].map((token) => (
          <div
            key={token}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                background: 'var(--pc-surface)',
                border: `2px solid var(${token})`,
              }}
            />
            <code
              style={{
                fontSize: '0.65rem',
                color: 'var(--pc-t3)',
                background: 'var(--pc-surface-deep)',
                padding: '2px 4px',
                borderRadius: 4,
              }}
            >
              {token}
            </code>
          </div>
        ))}
      </SwatchRow>

      {/* ── Genre Color Map ───────────────────────────────────────────── */}
      <SectionHeader>Genre Color Map</SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        {GENRE_COLORS.map(({ name, hex }) => (
          <div
            key={name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.3rem 0.75rem',
              borderRadius: 9999,
              background: `${hex}22`,
              border: `1px solid ${hex}55`,
              color: hex,
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: hex,
                display: 'inline-block',
              }}
            />
            {name}
            <code style={{ fontSize: '0.65rem', opacity: 0.75 }}>{hex}</code>
          </div>
        ))}
      </div>

      {/* ── Similarity Match Badge Colors ─────────────────────────────── */}
      <SectionHeader>Similarity Match Badge Colors</SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {MATCH_COLORS.map(({ label, hex, threshold }) => (
          <div
            key={threshold}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.4rem 1rem',
              borderRadius: 9999,
              background: `${hex}18`,
              border: `1px solid ${hex}55`,
              color: hex,
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            ✦ {threshold} — {label}
            <code style={{ fontSize: '0.65rem', opacity: 0.75 }}>{hex}</code>
          </div>
        ))}
      </div>

      {/* ── CTA Gradients ─────────────────────────────────────────────── */}
      <SectionHeader>CTA Gradients</SectionHeader>
      <SwatchRow>
        <GradientSwatch
          gradient="linear-gradient(135deg, #F5C518, #FF9F1C)"
          label="Primary CTA"
          token="--pc-cta"
        />
        <GradientSwatch
          gradient="linear-gradient(90deg, #F5C518, #FF9F1C)"
          label="CTA Horizontal"
          token="--pc-cta-h"
        />
        <GradientSwatch
          gradient="linear-gradient(180deg, #F5C518, #FF9F1C)"
          label="Accent Bar"
          token="--pc-accent-bar"
          height={80}
          width={40}
        />
        <GradientSwatch
          gradient="linear-gradient(90deg, #F5C518, #FF9F1C)"
          label="Progress"
          token="--pc-progress"
          width={200}
          height={20}
        />
      </SwatchRow>

      {/* ── Additional Feature Colors ──────────────────────────────────── */}
      <SectionHeader>Feature Colors</SectionHeader>
      <SwatchRow>
        <ColorSwatch hex="#8B5CF6" label="Purple" description="Group mode / Drama" />
        <ColorSwatch hex="#A78BFA" label="Purple Light" description="NEW badge / tint" />
        <ColorSwatch hex="#14B8A6" label="Teal" description="Sci-Fi / ≥95% match" />
        <ColorSwatch hex="#EF4444" label="Red" description="Thriller / error" />
        <ColorSwatch hex="#EC4899" label="Pink" description="Romance" />
        <ColorSwatch hex="#10B981" label="Green" description="Adventure / success" />
        <ColorSwatch hex="#60A5FA" label="Blue" description="Documentary" />
        <ColorSwatch hex="#6B7280" label="Gray" description="Horror / neutral" />
      </SwatchRow>
    </div>
  ),
};
