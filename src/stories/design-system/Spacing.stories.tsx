import React from 'react';

import { SectionHeader, SwatchRow } from './helpers';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta = {
  title: 'Design System/Spacing & Layout',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

export const AllSpacing: Story = {
  name: 'All Spacing & Layout',
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
        Spacing &amp; Layout
      </h1>
      <p style={{ color: 'var(--pc-t2)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
        Border radius, border styles, shadows and layout max-widths.
      </p>

      {/* ── Border Radius ─────────────────────────────────────────────── */}
      <SectionHeader>Border Radius</SectionHeader>
      <SwatchRow>
        {[
          { label: 'rounded-xl', value: '12px', usage: 'Badges, inputs, icon containers' },
          { label: 'rounded-2xl', value: '16px', usage: 'Cards, quiz panels, buttons' },
          { label: 'rounded-3xl', value: '24px', usage: 'Main movie card' },
          { label: 'rounded-full', value: '9999px', usage: 'Pills, progress dots' },
        ].map(({ label, value, usage }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              minWidth: 100,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: 'var(--pc-surface)',
                border: '2px solid var(--pc-gold)',
                borderRadius: value,
              }}
            />
            <code style={{ fontSize: '0.72rem', color: 'var(--pc-t2)', fontWeight: 600 }}>
              {label}
            </code>
            <span style={{ fontSize: '0.65rem', color: 'var(--pc-t3)' }}>{value}</span>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--pc-t3)',
                textAlign: 'center',
                maxWidth: 100,
              }}
            >
              {usage}
            </span>
          </div>
        ))}
      </SwatchRow>

      {/* ── Border Styles ─────────────────────────────────────────────── */}
      <SectionHeader>Border Styles</SectionHeader>
      <SwatchRow>
        {[
          { label: 'Subtle', border: '1px solid var(--pc-bd1)', usage: 'Default card' },
          { label: 'Default', border: '1px solid var(--pc-bd2)', usage: 'Interactive elements' },
          { label: 'Emphasis', border: '1px solid var(--pc-bd4)', usage: 'More visible dividers' },
          {
            label: 'Gold Accent',
            border: '1px solid rgba(245,197,24,0.25)',
            usage: 'Brand badges',
          },
          {
            label: 'Gold Hover',
            border: '1px solid rgba(245,197,24,0.4)',
            usage: 'Active / hovered gold',
          },
          {
            label: 'Selected',
            border: '1.5px solid rgba(245,197,24,0.38)',
            usage: 'Selected quiz option',
          },
          { label: 'Dashed Add', border: '1px dashed var(--pc-bd4)', usage: '"Add person" button' },
        ].map(({ label, border, usage }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              minWidth: 100,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: 'var(--pc-surface)',
                borderRadius: 10,
                border,
              }}
            />
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--pc-t1)',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--pc-t3)',
                textAlign: 'center',
                maxWidth: 110,
              }}
            >
              {usage}
            </span>
          </div>
        ))}
      </SwatchRow>

      {/* ── Shadows & Glows ───────────────────────────────────────────── */}
      <SectionHeader>Shadows &amp; Glows</SectionHeader>
      <SwatchRow>
        {[
          { label: '--pc-card-shadow', token: 'var(--pc-card-shadow)', usage: 'Main movie card' },
          { label: '--pc-cta-shadow', token: 'var(--pc-cta-shadow)', usage: 'CTA resting glow' },
          {
            label: '--pc-cta-shadow-hover',
            token: 'var(--pc-cta-shadow-hover)',
            usage: 'CTA hover glow',
          },
          {
            label: 'Active Card Glow',
            token: '0 0 30px rgba(245,197,24,0.1)',
            usage: 'Selected carousel item',
          },
          {
            label: 'Focus Ring',
            token: '0 0 0 3px rgba(245,197,24,0.06)',
            usage: 'Input focus state',
          },
        ].map(({ label, token, usage }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              minWidth: 130,
            }}
          >
            <div
              style={{
                width: 100,
                height: 60,
                background: 'var(--pc-surface)',
                borderRadius: 10,
                border: '1px solid var(--pc-bd1)',
                boxShadow: token,
              }}
            />
            <code
              style={{
                fontSize: '0.65rem',
                color: 'var(--pc-t3)',
                background: 'var(--pc-surface-deep)',
                padding: '2px 5px',
                borderRadius: 4,
                textAlign: 'center',
                maxWidth: 140,
                wordBreak: 'break-word',
              }}
            >
              {label}
            </code>
            <span style={{ fontSize: '0.65rem', color: 'var(--pc-t3)', textAlign: 'center' }}>
              {usage}
            </span>
          </div>
        ))}
      </SwatchRow>

      {/* ── Layout Max Widths ─────────────────────────────────────────── */}
      <SectionHeader>Layout Max Widths</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 900 }}>
        {[
          { label: 'max-w-sm', px: 384, usage: 'Loading state' },
          { label: 'max-w-md', px: 448, usage: 'Intro / group setup' },
          { label: 'max-w-xl', px: 576, usage: 'Quiz' },
          { label: 'max-w-3xl', px: 768, usage: 'About page' },
          { label: 'max-w-5xl', px: 1024, usage: 'Landing features' },
        ].map(({ label, px, usage }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              {label}
            </code>
            <div
              style={{
                height: 24,
                width: `${(px / 1024) * 100}%`,
                minWidth: 30,
                background: 'var(--pc-cta)',
                borderRadius: 4,
                opacity: 0.8,
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--pc-t2)', whiteSpace: 'nowrap' }}>
              {px}px — {usage}
            </span>
          </div>
        ))}
      </div>

      {/* ── Spacing Scale (common values) ─────────────────────────────── */}
      <SectionHeader>Spacing Reference</SectionHeader>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80].map((px) => (
          <div
            key={px}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          >
            <div
              style={{
                width: 28,
                height: px,
                background: 'var(--pc-gold)',
                borderRadius: 3,
                opacity: 0.75,
              }}
            />
            <span style={{ fontSize: '0.6rem', color: 'var(--pc-t3)' }}>{px}px</span>
          </div>
        ))}
      </div>
    </div>
  ),
};
