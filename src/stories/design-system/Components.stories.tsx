import React from 'react';

import { Button } from '../../components/Button';

import { SectionHeader } from './helpers';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta = {
  title: 'Design System/Components',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

// ── Genre pill colours (fixed hex) ──────────────────────────────────────────
const GENRE_COLORS: { name: string; hex: string }[] = [
  { name: 'Action', hex: '#FF9F1C' },
  { name: 'Sci-Fi', hex: '#14B8A6' },
  { name: 'Drama', hex: '#8B5CF6' },
  { name: 'Romance', hex: '#EC4899' },
  { name: 'Horror', hex: '#6B7280' },
];

// ── Match badge colours ──────────────────────────────────────────────────────
const MATCH_COLORS: { label: string; hex: string; pct: string }[] = [
  { label: 'Excellent', hex: '#14B8A6', pct: '97%' },
  { label: 'Great', hex: '#F5C518', pct: '92%' },
  { label: 'Good', hex: '#FF9F1C', pct: '87%' },
  { label: 'Moderate', hex: '#8B5CF6', pct: '80%' },
];

export const AllComponents: Story = {
  name: 'All Components',
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
        Components
      </h1>
      <p style={{ color: 'var(--pc-t2)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
        Live component compositions using real project components.
      </p>

      {/* ── Buttons ───────────────────────────────────────────────────── */}
      <SectionHeader>Buttons</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Row: standard variants */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ minWidth: 180 }}>
            <p
              style={{
                margin: '0 0 0.4rem',
                fontSize: '0.72rem',
                color: 'var(--pc-t3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              CTA (Primary)
            </p>
            <Button variant="cta">&#9654; Find My Movie</Button>
          </div>
          <div style={{ minWidth: 180 }}>
            <p
              style={{
                margin: '0 0 0.4rem',
                fontSize: '0.72rem',
                color: 'var(--pc-t3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Default (Accent)
            </p>
            <Button variant="default">Submit</Button>
          </div>
          <div style={{ minWidth: 180 }}>
            <p
              style={{
                margin: '0 0 0.4rem',
                fontSize: '0.72rem',
                color: 'var(--pc-t3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Ghost (Secondary)
            </p>
            <Button variant="ghost">How it works</Button>
          </div>
          <div style={{ minWidth: 180 }}>
            <p
              style={{
                margin: '0 0 0.4rem',
                fontSize: '0.72rem',
                color: 'var(--pc-t3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Disabled
            </p>
            <Button variant="cta" disabled>
              Continue
            </Button>
          </div>
        </div>

        {/* Group Mode & Icon */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ minWidth: 180 }}>
            <p
              style={{
                margin: '0 0 0.4rem',
                fontSize: '0.72rem',
                color: 'var(--pc-t3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Group Mode
            </p>
            <button
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                color: '#F8F8FF',
                fontWeight: 600,
                fontSize: '1rem',
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              &#128101; Group Mode
            </button>
          </div>
          <div>
            <p
              style={{
                margin: '0 0 0.4rem',
                fontSize: '0.72rem',
                color: 'var(--pc-t3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Icon Button
            </p>
            <button
              style={{
                marginTop: '1rem',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--pc-bd2)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}
            >
              &#9776;
            </button>
          </div>
        </div>
      </div>

      {/* ── Badges & Pills ────────────────────────────────────────────── */}
      <SectionHeader>Badges &amp; Pills</SectionHeader>

      {/* Brand Badge */}
      <div style={{ marginBottom: '1rem' }}>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.72rem',
            color: 'var(--pc-t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Brand Badge
        </p>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '0.25rem 0.75rem',
            borderRadius: 9999,
            background: 'rgba(196,149,10,0.12)',
            border: '1px solid rgba(245,197,24,0.25)',
            color: 'var(--pc-gold)',
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          ✦ PopChoice Pick
        </span>
      </div>

      {/* Match Badges */}
      <div style={{ marginBottom: '1rem' }}>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.72rem',
            color: 'var(--pc-t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Match Badges
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {MATCH_COLORS.map(({ label, hex, pct }) => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '0.3rem 0.75rem',
                borderRadius: 9999,
                background: `${hex}18`,
                border: `1px solid ${hex}55`,
                color: hex,
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              ✦ {pct} match — {label}
            </span>
          ))}
        </div>
      </div>

      {/* Genre Pills */}
      <div style={{ marginBottom: '1rem' }}>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.72rem',
            color: 'var(--pc-t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Genre Pills
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {GENRE_COLORS.map(({ name, hex }) => (
            <span
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '0.25rem 0.65rem',
                borderRadius: 9999,
                background: 'var(--pc-bd1)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
                fontSize: '0.78rem',
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: hex,
                  display: 'inline-block',
                }}
              />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* NEW badge + AI Pick */}
      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.2rem 0.6rem',
            borderRadius: 9999,
            background: 'rgba(139,92,246,0.15)',
            color: '#A78BFA',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          NEW
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '0.25rem 0.65rem',
            borderRadius: 9999,
            background: 'rgba(196,149,10,0.1)',
            backdropFilter: 'blur(8px)',
            color: 'var(--pc-gold)',
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          ✦ AI Pick
        </span>
      </div>

      {/* ── Progress Indicators ───────────────────────────────────────── */}
      <SectionHeader>Progress Indicators</SectionHeader>

      {/* Quiz dots */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p
          style={{
            margin: '0 0 0.75rem',
            fontSize: '0.72rem',
            color: 'var(--pc-t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Quiz Progress Dots
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {/* Completed */}
          <div
            style={{ width: 8, height: 8, borderRadius: 9999, background: 'rgba(245,197,24,0.5)' }}
          />
          {/* Current (wider) */}
          <div
            style={{
              width: 24,
              height: 8,
              borderRadius: 9999,
              background: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
            }}
          />
          {/* Upcoming */}
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: 'var(--pc-bd2)' }} />
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: 'var(--pc-bd2)' }} />
        </div>
        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span
            style={{ fontSize: '0.6rem', color: 'var(--pc-t3)', width: 8, textAlign: 'center' }}
          >
            1
          </span>
          <span
            style={{ fontSize: '0.6rem', color: 'var(--pc-t3)', width: 24, textAlign: 'center' }}
          >
            2
          </span>
          <span
            style={{ fontSize: '0.6rem', color: 'var(--pc-t3)', width: 8, textAlign: 'center' }}
          >
            3
          </span>
          <span
            style={{ fontSize: '0.6rem', color: 'var(--pc-t3)', width: 8, textAlign: 'center' }}
          >
            4
          </span>
        </div>
      </div>

      {/* Loading bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p
          style={{
            margin: '0 0 0.75rem',
            fontSize: '0.72rem',
            color: 'var(--pc-t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Loading Progress Bar
        </p>
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            height: 6,
            borderRadius: 9999,
            background: 'var(--pc-bd2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '65%',
              height: '100%',
              borderRadius: 9999,
              background: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
            }}
          />
        </div>
      </div>

      {/* Section Accent Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p
          style={{
            margin: '0 0 0.75rem',
            fontSize: '0.72rem',
            color: 'var(--pc-t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Section Accent Bar
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 6,
              height: 20,
              borderRadius: 9999,
              background: 'linear-gradient(180deg, #F5C518, #FF9F1C)',
            }}
          />
          <span
            style={{
              fontFamily: 'Oswald, sans-serif',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '1rem',
              color: 'var(--pc-t1)',
            }}
          >
            Section Label
          </span>
        </div>
      </div>

      {/* ── Input States ──────────────────────────────────────────────── */}
      <SectionHeader>Input States</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
        {/* Default */}
        <div>
          <p
            style={{
              margin: '0 0 0.4rem',
              fontSize: '0.72rem',
              color: 'var(--pc-t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Default
          </p>
          <input
            type="text"
            placeholder="Your name…"
            readOnly
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              background: 'var(--pc-bg)',
              border: '1px solid var(--pc-bd2)',
              borderRadius: 16,
              color: 'var(--pc-t1)',
              fontSize: '1rem',
              fontFamily: 'Manrope, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Focused (gold) */}
        <div>
          <p
            style={{
              margin: '0 0 0.4rem',
              fontSize: '0.72rem',
              color: 'var(--pc-t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Focused (Gold)
          </p>
          <input
            type="text"
            placeholder="Your name…"
            readOnly
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              background: 'var(--pc-bg)',
              border: '1px solid rgba(245,197,24,0.4)',
              borderRadius: 16,
              color: 'var(--pc-t1)',
              fontSize: '1rem',
              fontFamily: 'Manrope, sans-serif',
              outline: 'none',
              boxShadow: '0 0 0 3px rgba(245,197,24,0.06)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Group focused (purple) */}
        <div>
          <p
            style={{
              margin: '0 0 0.4rem',
              fontSize: '0.72rem',
              color: 'var(--pc-t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Group Focus (Purple)
          </p>
          <input
            type="text"
            placeholder="Group member name…"
            readOnly
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              background: 'var(--pc-bg)',
              border: '1px solid rgba(139,92,246,0.5)',
              borderRadius: 16,
              color: 'var(--pc-t1)',
              fontSize: '1rem',
              fontFamily: 'Manrope, sans-serif',
              outline: 'none',
              boxShadow: '0 0 0 3px rgba(139,92,246,0.08)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  ),
};
