import React from 'react';

import { SectionHeader } from './helpers';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta = {
  title: 'Design System/Typography',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

interface TypeScaleRow {
  name: string;
  size: string;
  family: string;
  weight: number;
  tracking?: string;
  lineHeight?: number | string;
  sample: string;
}

const TYPE_SCALE: TypeScaleRow[] = [
  {
    name: 'Hero',
    size: 'clamp(3.5rem, 10vw, 6rem)',
    family: 'Oswald',
    weight: 600,
    tracking: '0.04em',
    lineHeight: 1,
    sample: 'PopChoice',
  },
  {
    name: 'Page H1',
    size: '2.2rem',
    family: 'Oswald',
    weight: 600,
    tracking: '0.05em',
    lineHeight: 1.1,
    sample: 'What do you feel like watching?',
  },
  {
    name: 'Subhead',
    size: '2rem',
    family: 'Oswald',
    weight: 600,
    tracking: '0.04em',
    lineHeight: 1.1,
    sample: 'Finding your perfect film…',
  },
  {
    name: 'Section H2',
    size: '1.6rem',
    family: 'Oswald',
    weight: 600,
    tracking: '0.05em',
    lineHeight: 1.2,
    sample: 'How It Works',
  },
  {
    name: 'Nav Wordmark',
    size: '1.4rem',
    family: 'Oswald',
    weight: 600,
    tracking: '0.12em',
    lineHeight: 1,
    sample: 'POPCHOICE',
  },
  {
    name: 'Movie Title',
    size: 'clamp(1.8rem, 5vw, 3rem)',
    family: 'Oswald',
    weight: 600,
    tracking: '0.04em',
    lineHeight: 1.1,
    sample: 'Interstellar',
  },
  {
    name: 'Expanded Title',
    size: '1.3rem',
    family: 'Oswald',
    weight: 600,
    tracking: '0.04em',
    lineHeight: 1.1,
    sample: 'The Dark Knight',
  },
  {
    name: 'Hero Body',
    size: '1.1rem',
    family: 'Manrope',
    weight: 400,
    lineHeight: 1.6,
    sample: "Tell us your mood and we'll find the perfect film for your night.",
  },
  {
    name: 'Body',
    size: '1rem',
    family: 'Manrope',
    weight: 400,
    lineHeight: 1.65,
    sample: 'A masterful thriller that keeps you guessing until the very end.',
  },
  {
    name: 'Description',
    size: '0.88rem',
    family: 'Manrope',
    weight: 400,
    lineHeight: 1.7,
    sample: 'This pick perfectly matches your love of slow-burn tension and psychological depth.',
  },
  {
    name: 'Meta',
    size: '0.82rem',
    family: 'Manrope',
    weight: 400,
    lineHeight: 1.5,
    sample: '2h 32m  ·  PG-13  ·  2023',
  },
  {
    name: 'Small',
    size: '0.78rem',
    family: 'Manrope',
    weight: 500,
    lineHeight: 1.4,
    sample: '★ 8.6  ·  96% match',
  },
  {
    name: 'Nano',
    size: '0.72rem',
    family: 'Manrope',
    weight: 500,
    lineHeight: 1.4,
    sample: 'GENRE  ·  TOKEN LABEL',
  },
  {
    name: 'Eyebrow',
    size: '0.65rem',
    family: 'Manrope',
    weight: 600,
    tracking: '0.1em',
    lineHeight: 1.3,
    sample: 'WHY THIS FILM',
  },
];

export const AllTypography: Story = {
  name: 'All Typography',
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
        Typography
      </h1>
      <p style={{ color: 'var(--pc-t2)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
        PopChoice type system — Oswald for display, Manrope for body.
      </p>

      {/* ── Font Families ─────────────────────────────────────────────── */}
      <SectionHeader>Font Families</SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Oswald */}
        <div
          style={{
            flex: 1,
            minWidth: 260,
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd2)',
            borderRadius: 12,
            padding: '1.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--pc-t3)',
              fontFamily: 'Manrope, sans-serif',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Display / Headings
          </span>
          <p
            style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: '2.5rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              lineHeight: 1,
              color: 'var(--pc-t1)',
              margin: 0,
            }}
          >
            Oswald
          </p>
          <p
            style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--pc-t2)',
              marginTop: '0.5rem',
            }}
          >
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </p>
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--pc-t3)',
              marginTop: '0.75rem',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            Weight 600 · Uppercase · Wide tracking · Google Fonts
          </p>
        </div>

        {/* Manrope */}
        <div
          style={{
            flex: 1,
            minWidth: 260,
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd2)',
            borderRadius: 12,
            padding: '1.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--pc-t3)',
              fontFamily: 'Manrope, sans-serif',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Body / UI
          </span>
          <p
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '2.5rem',
              fontWeight: 400,
              color: 'var(--pc-t1)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Manrope
          </p>
          <p
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '1rem',
              fontWeight: 400,
              color: 'var(--pc-t2)',
              marginTop: '0.5rem',
            }}
          >
            abcdefghijklmnopqrstuvwxyz
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--pc-t3)', marginTop: '0.75rem' }}>
            Weight 400–700 · Inter fallback · Google Fonts
          </p>
        </div>
      </div>

      {/* ── Type Scale ────────────────────────────────────────────────── */}
      <SectionHeader>Type Scale</SectionHeader>
      <div
        style={{
          background: 'var(--pc-surface)',
          border: '1px solid var(--pc-bd2)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--pc-bd2)',
                background: 'var(--pc-surface-deep)',
              }}
            >
              {['Level', 'Size', 'Font', 'Sample'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '0.6rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--pc-t3)',
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPE_SCALE.map((row, i) => (
              <tr
                key={row.name}
                style={{
                  borderBottom: i < TYPE_SCALE.length - 1 ? '1px solid var(--pc-bd1)' : undefined,
                }}
              >
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--pc-t2)',
                    fontFamily: 'Manrope, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.name}
                </td>
                <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                  <code
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--pc-t3)',
                      background: 'var(--pc-surface-deep)',
                      padding: '2px 5px',
                      borderRadius: 4,
                    }}
                  >
                    {row.size}
                  </code>
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.72rem',
                    color: 'var(--pc-t3)',
                    fontFamily: 'Manrope, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.family}
                </td>
                <td style={{ padding: '0.75rem 1rem', maxWidth: 480, overflow: 'hidden' }}>
                  <span
                    style={{
                      fontFamily:
                        row.family === 'Oswald'
                          ? 'Oswald, sans-serif'
                          : 'Manrope, Inter, sans-serif',
                      fontSize: row.size,
                      fontWeight: row.weight,
                      textTransform: row.family === 'Oswald' ? 'uppercase' : undefined,
                      letterSpacing: row.tracking,
                      lineHeight: row.lineHeight,
                      color: 'var(--pc-t1)',
                      display: 'block',
                    }}
                  >
                    {row.sample}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Conventions ───────────────────────────────────────────────── */}
      <SectionHeader>Conventions</SectionHeader>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {[
          {
            rule: 'Oswald always uppercase',
            detail: 'textTransform: uppercase on all Oswald usage. Never mixed-case.',
          },
          {
            rule: 'Oswald is semibold',
            detail: 'font-weight: 600 for all display text. 700 only for extreme emphasis.',
          },
          {
            rule: 'Wide letter-spacing',
            detail: '0.04em–0.12em for headings. Nav wordmark gets 0.12em.',
          },
          {
            rule: 'Body weight',
            detail: 'font-weight: 400 standard, 500 medium emphasis. Bold labels use 600–700.',
          },
          {
            rule: 'Line heights',
            detail: '1.0 for display, 1.1–1.2 for subheads, 1.5–1.75 for body copy.',
          },
          {
            rule: 'Base font size',
            detail: '16px (1rem). All relative units scale from this base.',
          },
        ].map(({ rule, detail }) => (
          <div
            key={rule}
            style={{
              background: 'var(--pc-surface)',
              border: '1px solid var(--pc-bd2)',
              borderRadius: 10,
              padding: '1rem',
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '0.85rem',
                color: 'var(--pc-t1)',
                marginBottom: '0.3rem',
              }}
            >
              {rule}
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--pc-t3)', lineHeight: 1.5 }}>
              {detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  ),
};
