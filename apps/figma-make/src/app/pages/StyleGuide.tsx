import {
  Check,
  Copy,
  Sparkles,
  Play,
  Users,
  Zap,
  Smile,
  Film,
  FlaskConical,
  Ghost,
  Heart,
  Skull,
  Globe,
  Star,
  Clock,
  Moon,
  Sun,
  CloudSun,
  RotateCcw,
  ChevronRight,
  Clapperboard,
  ArrowLeft,
  Palette,
  Type,
  Layers,
  Box,
  Wand2,
  Cpu,
  Grid3X3,
  SunMoon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';

import { PopcornMascot } from '../components/PopcornMascot';
import { usePCTheme } from '../contexts/ThemeContext';

// ─── Color data ───────────────────────────────────────────────────────────────

const BACKGROUND_COLORS = [
  { name: 'Base BG', value: '#09090F', usage: 'Page background, outermost layer' },
  { name: 'Surface', value: '#13131F', usage: 'Cards, inputs, panels' },
  { name: 'Surface Hover', value: '#1A1A30', usage: 'Hovered cards & interactive panels' },
  { name: 'Surface Deep', value: '#1C1C2E', usage: 'Poster placeholders, skeleton loaders' },
  { name: 'Header BG', value: 'rgba(9,9,15,0.85)', usage: 'Sticky nav with backdrop blur' },
];

const TEXT_COLORS = [
  { name: 'Text Primary', value: '#F8F8FF', usage: 'Headings, prominent labels' },
  { name: 'Text Secondary', value: '#8888AA', usage: 'Body copy, subtitles' },
  { name: 'Text Tertiary', value: '#5A5A78', usage: 'Captions, meta info' },
  { name: 'Text Muted', value: '#3D3D55', usage: 'Disabled states, low-emphasis' },
  { name: 'Text Disabled', value: '#2D2D45', usage: 'Disclaimers, barely-there text' },
];

const ACCENT_COLORS = [
  { name: 'Gold', value: '#F5C518', usage: 'Primary brand accent — CTAs, highlights' },
  { name: 'Amber', value: '#FF9F1C', usage: 'Secondary warm accent — gradient pair' },
  { name: 'Purple', value: '#8B5CF6', usage: 'Group mode, drama genre' },
  { name: 'Purple Light', value: '#A78BFA', usage: 'Purple tint, NEW badge text' },
  { name: 'Teal', value: '#14B8A6', usage: 'Sci-Fi genre, ≥95% match' },
  { name: 'Red', value: '#EF4444', usage: 'Thriller genre, dark tone' },
  { name: 'Pink', value: '#EC4899', usage: 'Romance genre' },
  { name: 'Green', value: '#10B981', usage: 'Adventure genre, success' },
  { name: 'Blue', value: '#60A5FA', usage: 'Documentary genre' },
  { name: 'Gray', value: '#6B7280', usage: 'Horror genre, neutral' },
];

const GENRE_COLORS = [
  { name: 'Action', value: '#FF9F1C' },
  { name: 'Comedy', value: '#F5C518' },
  { name: 'Drama', value: '#8B5CF6' },
  { name: 'Sci-Fi', value: '#14B8A6' },
  { name: 'Thriller', value: '#EF4444' },
  { name: 'Romance', value: '#EC4899' },
  { name: 'Horror', value: '#6B7280' },
  { name: 'Adventure', value: '#10B981' },
  { name: 'Animation', value: '#A78BFA' },
  { name: 'Documentary', value: '#60A5FA' },
];

const GRADIENTS = [
  {
    name: 'Primary CTA',
    value: 'linear-gradient(135deg, #F5C518 0%, #FF9F1C 100%)',
    usage: 'Main action buttons',
    textColor: '#09090F',
    dark: false,
  },
  {
    name: 'Hero Title',
    value: 'linear-gradient(135deg, #FFFFFF 0%, #F5C518 60%, #FF9F1C 100%)',
    usage: 'Brand wordmark on dark bg',
    textColor: '#09090F',
    dark: false,
  },
  {
    name: 'Purple Action',
    value: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    usage: 'Group mode CTA',
    textColor: '#F8F8FF',
    dark: false,
  },
  {
    name: 'Accent Bar',
    value: 'linear-gradient(180deg, #F5C518, #FF9F1C)',
    usage: 'Section accent lines',
    textColor: '#09090F',
    dark: false,
  },
  {
    name: 'More Suggestions',
    value: 'linear-gradient(180deg, #8B5CF6, #14B8A6)',
    usage: 'Secondary section bars',
    textColor: '#09090F',
    dark: false,
  },
  {
    name: 'Progress Bar',
    value: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
    usage: 'Loading progress',
    textColor: '#09090F',
    dark: false,
  },
  {
    name: 'Cinema Radial',
    value: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,197,24,0.06) 0%, transparent 70%)',
    usage: 'Subtle hero background glow',
    textColor: '#09090F',
    dark: true,
  },
  {
    name: 'Page Fade',
    value:
      'linear-gradient(180deg, #09090F 0%, rgba(9,9,15,0.4) 30%, rgba(9,9,15,0.6) 70%, #09090F 100%)',
    usage: 'Hero section image overlay',
    textColor: '#09090F',
    dark: true,
  },
];

const RADIUS_TOKENS = [
  { name: 'rounded-xl', value: '12px', usage: 'Badges, inputs, icon containers' },
  { name: 'rounded-2xl', value: '16px', usage: 'Cards, quiz panels' },
  { name: 'rounded-3xl', value: '24px', usage: 'Main movie card' },
  { name: 'rounded-full', value: '9999px', usage: 'Pills, avatar circles' },
];

const BORDER_TOKENS = [
  {
    name: 'Subtle',
    value: '1px solid rgba(255,255,255,0.06)',
    usage: 'Default card/panel borders',
  },
  {
    name: 'Default',
    value: '1px solid rgba(255,255,255,0.08)',
    usage: 'Interactive element borders',
  },
  { name: 'Emphasis', value: '1px solid rgba(255,255,255,0.12)', usage: 'More visible dividers' },
  { name: 'Gold Accent', value: '1px solid rgba(245,197,24,0.25)', usage: 'Badge borders' },
  {
    name: 'Gold Hover',
    value: '1px solid rgba(245,197,24,0.4)',
    usage: 'Active/hovered gold states',
  },
  { name: 'Selected', value: '1.5px solid {color}60', usage: 'Selected quiz option' },
  {
    name: 'Dashed Add',
    value: '1px dashed rgba(255,255,255,0.12)',
    usage: 'Add another person button',
  },
];

const SHADOW_TOKENS = [
  {
    name: 'Glow CTA',
    value: '0 0 40px rgba(245,197,24,0.35), 0 8px 32px rgba(245,197,24,0.2)',
    usage: 'Primary CTA resting glow',
  },
  {
    name: 'Glow CTA Hover',
    value: '0 0 60px rgba(245,197,24,0.5), 0 12px 40px rgba(245,197,24,0.3)',
    usage: 'Primary CTA hover glow',
  },
  {
    name: 'Card Shadow',
    value: '0 40px 80px rgba(0,0,0,0.5)',
    usage: 'Main movie recommendation card',
  },
  {
    name: 'Active Card Glow',
    value: '0 0 30px rgba(245,197,24,0.1)',
    usage: 'Selected carousel item',
  },
  { name: 'Selected Option', value: '0 0 20px {color}18', usage: 'Quiz option selected state' },
  { name: 'Focus Ring', value: '0 0 0 3px rgba(245,197,24,0.06)', usage: 'Input focus ring' },
];

const SECTIONS = [
  { id: 'brand', label: 'Brand', icon: Sparkles },
  { id: 'themes', label: 'Themes', icon: SunMoon },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'gradients', label: 'Gradients', icon: Wand2 },
  { id: 'spacing', label: 'Spacing & Borders', icon: Layers },
  { id: 'components', label: 'Components', icon: Box },
  { id: 'genres', label: 'Genre System', icon: Grid3X3 },
  { id: 'motion', label: 'Motion', icon: Cpu },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function CopyBadge({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all duration-200"
      style={{
        background: copied ? 'rgba(20,184,166,0.15)' : 'var(--pc-bd1)',
        border: `1px solid ${copied ? 'rgba(20,184,166,0.3)' : 'var(--pc-bd2)'}`,
        color: copied ? '#14B8A6' : 'var(--pc-t3)',
        fontSize: '0.7rem',
        fontFamily: 'monospace',
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      <span>{value.length > 26 ? value.slice(0, 26) + '…' : value}</span>
    </button>
  );
}

function ColorCard({ swatch }: { swatch: { name: string; value: string; usage: string } }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--pc-bd2)' }}>
      <div
        className="h-16 w-full"
        style={{ background: swatch.value, borderBottom: '1px solid var(--pc-bd2)' }}
      />
      <div className="p-3" style={{ background: 'var(--pc-surface)' }}>
        <div
          style={{ color: 'var(--pc-t1)', fontSize: '0.82rem', fontWeight: 600 }}
          className="mb-0.5"
        >
          {swatch.name}
        </div>
        <div
          style={{ color: 'var(--pc-t3)', fontSize: '0.72rem', lineHeight: 1.5 }}
          className="mb-2"
        >
          {swatch.usage}
        </div>
        <CopyBadge value={swatch.value} />
      </div>
    </div>
  );
}

function GradientCard({ g }: { g: (typeof GRADIENTS)[0] }) {
  const { isDark } = usePCTheme();
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--pc-bd2)' }}>
      <div
        className="h-20 w-full flex items-center justify-center"
        style={{
          background: g.dark ? 'var(--pc-bg)' : undefined,
          backgroundImage: g.dark ? g.value : g.value,
        }}
      >
        {!g.dark && (
          <span style={{ color: g.textColor, fontWeight: 700, fontSize: '0.8rem', opacity: 0.7 }}>
            Preview
          </span>
        )}
      </div>
      <div className="p-3" style={{ background: 'var(--pc-surface)' }}>
        <div
          style={{ color: 'var(--pc-t1)', fontSize: '0.82rem', fontWeight: 600 }}
          className="mb-0.5"
        >
          {g.name}
        </div>
        <div
          style={{ color: 'var(--pc-t3)', fontSize: '0.72rem', lineHeight: 1.5 }}
          className="mb-2"
        >
          {g.usage}
        </div>
        <CopyBadge value={g.value} />
      </div>
    </div>
  );
}

function SectionTitle({
  label,
  icon: Icon,
  id,
}: {
  label: string;
  icon: React.ElementType;
  id: string;
}) {
  const { isDark } = usePCTheme();
  return (
    <div id={id} className="flex items-center gap-3 mb-8 pt-2 scroll-mt-20">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.08)',
          color: 'var(--pc-gold)',
        }}
      >
        <Icon size={17} />
      </div>
      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.8rem',
          letterSpacing: '0.06em',
          color: 'var(--pc-t1)',
        }}
      >
        {label}
      </h2>
      <div className="flex-1 h-px" style={{ background: 'var(--pc-bd1)' }} />
    </div>
  );
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: '-20% 0px -60% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);
  return active;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StyleGuide() {
  const sectionIds = SECTIONS.map((s) => s.id);
  const activeSection = useActiveSection(sectionIds);
  const { isDark, toggle, theme } = usePCTheme();

  const cardStyle = { background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' };

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: 'var(--pc-t1)' }}
    >
      {/* Header */}
      <div
        className="border-b px-5 md:px-10 py-8"
        style={{
          borderColor: 'var(--pc-bd1)',
          background: isDark ? 'rgba(19,19,31,0.6)' : 'rgba(255,255,255,0.6)',
        }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 mb-4 text-sm transition-colors duration-200"
          style={{ color: 'var(--pc-t3)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--pc-gold)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--pc-t3)')}
        >
          <ArrowLeft size={14} /> Back to app
        </Link>
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs uppercase tracking-widest mb-3"
          style={{
            background: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.08)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(196,149,10,0.25)',
            color: 'var(--pc-gold)',
          }}
        >
          <Sparkles size={10} /> Design System
        </div>
        <h1
          style={{
            display: 'inline-block',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(2.2rem, 6vw, 3.5rem)',
            letterSpacing: '0.06em',
            lineHeight: 1,
            background: isDark
              ? 'linear-gradient(135deg, #FFFFFF 0%, #F5C518 60%, #FF9F1C 100%)'
              : 'linear-gradient(135deg, #0D0D1A 0%, #C4950A 55%, #D4760C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          PopChoice Style Guide
        </h1>
        <p className="mt-2" style={{ color: 'var(--pc-t2)', fontSize: '0.95rem' }}>
          Tokens, components & patterns that define the PopChoice cinema aesthetic.
        </p>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className="hidden lg:flex flex-col gap-1 w-52 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto p-5"
          style={{ borderRight: '1px solid var(--pc-bd1)' }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-all duration-200"
              style={{
                background:
                  activeSection === s.id
                    ? isDark
                      ? 'rgba(245,197,24,0.1)'
                      : 'rgba(196,149,10,0.08)'
                    : 'transparent',
                color: activeSection === s.id ? 'var(--pc-gold)' : 'var(--pc-t3)',
                fontWeight: activeSection === s.id ? 600 : 400,
              }}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </aside>

        {/* Mobile pills */}
        <div
          className="lg:hidden sticky top-[57px] z-10 w-full overflow-x-auto flex gap-2 px-5 py-3"
          style={{
            background: isDark ? 'rgba(9,9,15,0.97)' : 'rgba(247,245,238,0.97)',
            borderBottom: '1px solid var(--pc-bd1)',
          }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-200"
              style={{
                background:
                  activeSection === s.id
                    ? isDark
                      ? 'rgba(245,197,24,0.15)'
                      : 'rgba(196,149,10,0.1)'
                    : isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.04)',
                border: `1px solid ${activeSection === s.id ? 'rgba(245,197,24,0.3)' : 'var(--pc-bd2)'}`,
                color: activeSection === s.id ? 'var(--pc-gold)' : 'var(--pc-t2)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 px-5 md:px-10 py-10 max-w-4xl">
          {/* ── BRAND ── */}
          <SectionTitle id="brand" label="Brand Identity" icon={Sparkles} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="rounded-2xl p-8 flex flex-col items-center gap-5" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Popcorn Mascot
              </div>
              <div className="flex items-end gap-8">
                {[
                  { size: 80, label: 'Animated', animated: true },
                  { size: 52, label: 'Static · 52px', animated: false },
                  { size: 32, label: 'Nav · 32px', animated: false },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col items-center gap-2">
                    <PopcornMascot size={m.size} animated={m.animated} />
                    <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-8 flex flex-col gap-6" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Wordmark & Logotype
              </div>
              <div>
                <div style={{ color: 'var(--pc-t4)', fontSize: '0.65rem', marginBottom: 6 }}>
                  Hero — Bebas Neue, gradient fill
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '3.2rem',
                    letterSpacing: '0.07em',
                    lineHeight: 1,
                    background: isDark
                      ? 'linear-gradient(135deg, #FFFFFF 0%, #F5C518 60%, #FF9F1C 100%)'
                      : 'linear-gradient(135deg, #0D0D1A 0%, #C4950A 55%, #D4760C 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  }}
                >
                  PopChoice
                </span>
              </div>
              <div>
                <div style={{ color: 'var(--pc-t4)', fontSize: '0.65rem', marginBottom: 6 }}>
                  Nav — Bebas Neue, gold gradient
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.4rem',
                    letterSpacing: '0.12em',
                    background: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  }}
                >
                  POPCHOICE
                </span>
              </div>
            </div>

            <div className="rounded-2xl p-6 md:col-span-2" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Brand Personality
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Playful', desc: 'Fun, popcorn energy', color: '#F5C518' },
                  { label: 'Confident', desc: 'AI-powered, curated picks', color: '#FF9F1C' },
                  { label: 'Cinematic', desc: 'Dark theatre aesthetic', color: '#8B5CF6' },
                  { label: 'Mobile-first', desc: 'Thumb-friendly, responsive', color: '#14B8A6' },
                ].map((v) => (
                  <div
                    key={v.label}
                    className="p-3 rounded-xl"
                    style={{ background: `${v.color}10`, border: `1px solid ${v.color}20` }}
                  >
                    <div style={{ color: v.color, fontWeight: 700, fontSize: '0.88rem' }}>
                      {v.label}
                    </div>
                    <div
                      style={{
                        color: 'var(--pc-t3)',
                        fontSize: '0.75rem',
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {v.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── THEMES ── */}
          <SectionTitle id="themes" label="Theme System" icon={SunMoon} />
          <div className="space-y-5 mb-16">
            {/* Live toggle */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Live Theme Toggle
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <button
                  onClick={toggle}
                  className="flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 active:scale-95"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, #1A1A30, #13131F)'
                      : 'linear-gradient(135deg, #F0ECE2, #FFFFFF)',
                    border: '1px solid var(--pc-bd3)',
                    color: 'var(--pc-t1)',
                  }}
                >
                  {isDark ? (
                    <Moon size={16} style={{ color: '#8B5CF6' }} />
                  ) : (
                    <Sun size={16} style={{ color: '#D4760C' }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <div
                    className="w-10 h-5 rounded-full relative transition-colors duration-300"
                    style={{ background: isDark ? '#3D3D55' : '#D4760C' }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
                      style={{
                        background: '#FFFFFF',
                        left: isDark ? '2px' : '22px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </button>
                <p style={{ color: 'var(--pc-t3)', fontSize: '0.78rem', lineHeight: 1.6 }}>
                  Current: <strong style={{ color: 'var(--pc-t1)' }}>{theme}</strong> · Theme class{' '}
                  <code style={{ color: 'var(--pc-gold)', fontFamily: 'monospace' }}>
                    .pc-light
                  </code>{' '}
                  is applied to{' '}
                  <code style={{ color: 'var(--pc-gold)', fontFamily: 'monospace' }}>
                    &lt;html&gt;
                  </code>{' '}
                  to drive CSS variable overrides. Persists in{' '}
                  <code style={{ color: 'var(--pc-gold)', fontFamily: 'monospace' }}>
                    localStorage
                  </code>
                  .
                </p>
              </div>
            </div>

            {/* Side-by-side */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Side-by-Side Comparison
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="px-4 py-2 flex items-center gap-2"
                    style={{
                      background: '#13131F',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Moon size={12} style={{ color: '#8B5CF6' }} />
                    <span style={{ color: '#F8F8FF', fontSize: '0.72rem', fontWeight: 600 }}>
                      Dark · Cinema
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-3" style={{ background: '#09090F' }}>
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div
                        style={{
                          color: '#F8F8FF',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        Deep Cinema
                      </div>
                      <div style={{ color: '#5A5A78', fontSize: '0.72rem' }}>
                        Surface on near-black bg
                      </div>
                    </div>
                    <button
                      className="w-full py-2 rounded-xl text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #F5C518, #FF9F1C)',
                        color: '#09090F',
                        fontWeight: 700,
                      }}
                    >
                      Primary CTA
                    </button>
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{
                          background: 'rgba(245,197,24,0.12)',
                          border: '1px solid rgba(245,197,24,0.25)',
                          color: '#F5C518',
                        }}
                      >
                        Gold #F5C518
                      </span>
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#8888AA' }}
                      >
                        Text #8888AA
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                >
                  <div
                    className="px-4 py-2 flex items-center gap-2"
                    style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <Sun size={12} style={{ color: '#D4760C' }} />
                    <span style={{ color: '#0D0D1A', fontSize: '0.72rem', fontWeight: 600 }}>
                      Light · Cinema Daylight
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-3" style={{ background: '#F7F5EE' }}>
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.09)' }}
                    >
                      <div
                        style={{
                          color: '#0D0D1A',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        Warm Parchment
                      </div>
                      <div style={{ color: '#6A6A88', fontSize: '0.72rem' }}>
                        White surface on cream bg
                      </div>
                    </div>
                    <button
                      className="w-full py-2 rounded-xl text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #C4950A, #D4760C)',
                        color: '#09090F',
                        fontWeight: 700,
                      }}
                    >
                      Primary CTA
                    </button>
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{
                          background: 'rgba(196,149,10,0.1)',
                          border: '1px solid rgba(196,149,10,0.25)',
                          color: '#C4950A',
                        }}
                      >
                        Gold #C4950A
                      </span>
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ background: 'rgba(0,0,0,0.06)', color: '#424260' }}
                      >
                        Text #424260
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Token table */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                CSS Custom Property Tokens
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      {['Token', 'Dark', 'Light', 'Usage'].map((h) => (
                        <th
                          key={h}
                          className="text-left pb-3 pr-4"
                          style={{
                            color: 'var(--pc-t3)',
                            fontSize: '0.68rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            borderBottom: '1px solid var(--pc-bd1)',
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        token: '--pc-bg',
                        dark: '#09090F',
                        light: '#F7F5EE',
                        use: 'Page background',
                      },
                      {
                        token: '--pc-surface',
                        dark: '#13131F',
                        light: '#FFFFFF',
                        use: 'Cards, panels',
                      },
                      {
                        token: '--pc-surface-hover',
                        dark: '#1A1A30',
                        light: '#F0ECE2',
                        use: 'Hover states',
                      },
                      { token: '--pc-t1', dark: '#F8F8FF', light: '#0D0D1A', use: 'Primary text' },
                      {
                        token: '--pc-t2',
                        dark: '#8888AA',
                        light: '#424260',
                        use: 'Secondary text',
                      },
                      { token: '--pc-t3', dark: '#5A5A78', light: '#6A6A88', use: 'Tertiary text' },
                      { token: '--pc-t4', dark: '#3D3D55', light: '#9090B0', use: 'Muted text' },
                      {
                        token: '--pc-bd2',
                        dark: 'rgba(fff,0.08)',
                        light: 'rgba(0,0,0,0.09)',
                        use: 'Default border',
                      },
                      {
                        token: '--pc-gold',
                        dark: '#F5C518',
                        light: '#C4950A',
                        use: 'Brand accent',
                      },
                      {
                        token: '--pc-amber',
                        dark: '#FF9F1C',
                        light: '#D4760C',
                        use: 'Brand secondary',
                      },
                      {
                        token: '--pc-fog',
                        dark: '#09090F',
                        light: '#F7F5EE',
                        use: 'Gradient fade edge',
                      },
                      {
                        token: '--pc-card-shadow',
                        dark: '0 40px 80px rgba(0,0,0,0.5)',
                        light: '0 20px 50px rgba(0,0,0,0.1)',
                        use: 'Card lift',
                      },
                    ].map((row) => (
                      <tr key={row.token}>
                        <td
                          className="py-2.5 pr-4"
                          style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                        >
                          <code
                            style={{
                              color: 'var(--pc-gold)',
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                            }}
                          >
                            {row.token}
                          </code>
                        </td>
                        <td
                          className="py-2.5 pr-4"
                          style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded shrink-0"
                              style={{
                                background: row.dark.startsWith('0')
                                  ? 'rgba(255,255,255,0.08)'
                                  : row.dark.startsWith('rgba')
                                    ? 'rgba(255,255,255,0.08)'
                                    : row.dark,
                                border: '1px solid var(--pc-bd2)',
                              }}
                            />
                            <code
                              style={{
                                color: 'var(--pc-t3)',
                                fontFamily: 'monospace',
                                fontSize: '0.65rem',
                              }}
                            >
                              {row.dark.length > 16 ? row.dark.slice(0, 16) + '…' : row.dark}
                            </code>
                          </div>
                        </td>
                        <td
                          className="py-2.5 pr-4"
                          style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded shrink-0"
                              style={{
                                background: row.light.startsWith('0')
                                  ? 'rgba(0,0,0,0.09)'
                                  : row.light.startsWith('rgba')
                                    ? 'rgba(0,0,0,0.09)'
                                    : row.light,
                                border: '1px solid rgba(0,0,0,0.1)',
                              }}
                            />
                            <code
                              style={{
                                color: 'var(--pc-t3)',
                                fontFamily: 'monospace',
                                fontSize: '0.65rem',
                              }}
                            >
                              {row.light.length > 16 ? row.light.slice(0, 16) + '…' : row.light}
                            </code>
                          </div>
                        </td>
                        <td
                          className="py-2.5"
                          style={{
                            color: 'var(--pc-t3)',
                            fontSize: '0.72rem',
                            borderBottom: '1px solid var(--pc-bd1)',
                          }}
                        >
                          {row.use}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── COLORS ── */}
          <SectionTitle id="colors" label="Color System" icon={Palette} />
          <div className="mb-5">
            <div
              style={{
                color: 'var(--pc-t3)',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 12,
              }}
            >
              Backgrounds (dark theme values)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {BACKGROUND_COLORS.map((c) => (
                <ColorCard key={c.name} swatch={c} />
              ))}
            </div>
          </div>
          <div className="mb-5">
            <div
              style={{
                color: 'var(--pc-t3)',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 12,
                marginTop: 24,
              }}
            >
              Text Colors
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {TEXT_COLORS.map((c) => (
                <div
                  key={c.name}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--pc-bd2)' }}
                >
                  <div
                    className="h-16 w-full flex items-center justify-center"
                    style={{ background: 'var(--pc-bg)' }}
                  >
                    <span style={{ color: c.value, fontWeight: 700, fontSize: '1.1rem' }}>Aa</span>
                  </div>
                  <div className="p-3" style={{ background: 'var(--pc-surface)' }}>
                    <div
                      style={{ color: 'var(--pc-t1)', fontSize: '0.82rem', fontWeight: 600 }}
                      className="mb-0.5"
                    >
                      {c.name}
                    </div>
                    <div
                      style={{ color: 'var(--pc-t3)', fontSize: '0.72rem', lineHeight: 1.5 }}
                      className="mb-2"
                    >
                      {c.usage}
                    </div>
                    <CopyBadge value={c.value} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-16">
            <div
              style={{
                color: 'var(--pc-t3)',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 12,
                marginTop: 24,
              }}
            >
              Accent Colors
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {ACCENT_COLORS.map((c) => (
                <ColorCard key={c.name} swatch={c} />
              ))}
            </div>
          </div>

          {/* ── TYPOGRAPHY ── */}
          <SectionTitle id="typography" label="Typography" icon={Type} />
          <div className="space-y-5 mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl" style={cardStyle}>
                <div
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 12,
                  }}
                >
                  Display — Bebas Neue
                </div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '2.4rem',
                    letterSpacing: '0.06em',
                    color: 'var(--pc-t1)',
                    lineHeight: 1.1,
                  }}
                >
                  Bebas Neue
                </div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.2rem',
                    letterSpacing: '0.08em',
                    color: 'var(--pc-t2)',
                    marginTop: 4,
                  }}
                >
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
                </div>
                <div
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.75rem',
                    marginTop: 12,
                    lineHeight: 1.6,
                  }}
                >
                  All headings, titles, CTA labels. Always uppercase. Google Fonts import.
                </div>
              </div>
              <div className="p-6 rounded-2xl" style={cardStyle}>
                <div
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 12,
                  }}
                >
                  Body — DM Sans / Inter
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '1.5rem',
                    color: 'var(--pc-t1)',
                    lineHeight: 1.2,
                  }}
                >
                  DM Sans
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    color: 'var(--pc-t2)',
                    marginTop: 4,
                    lineHeight: 1.6,
                  }}
                >
                  The quick brown fox jumps over the lazy dog.
                </div>
                <div
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.75rem',
                    marginTop: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Body copy, labels, inputs, captions. DM Sans primary, Inter fallback.
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Type Scale
              </div>
              <div className="space-y-3">
                {[
                  { size: 'clamp(3.5rem,10vw,6rem)', label: 'Hero', ff: true },
                  { size: '2.2rem', label: 'Quiz H1', ff: true },
                  { size: '2rem', label: 'Subhead', ff: true },
                  { size: '1.4rem', label: 'Nav Mark', ff: true },
                  { size: '1.1rem', label: 'Hero Body', ff: false },
                  { size: '1rem', label: 'Body', ff: false },
                  { size: '0.88rem', label: 'Description', ff: false },
                  { size: '0.82rem', label: 'Meta', ff: false },
                  { size: '0.72rem', label: 'Nano', ff: false },
                  { size: '0.65rem', label: 'Eyebrow', ff: false },
                ].map((t) => (
                  <div key={t.label} className="flex items-baseline gap-4 flex-wrap">
                    <span
                      style={{
                        fontFamily: t.ff ? "'Bebas Neue'" : "'DM Sans'",
                        fontSize: t.size,
                        letterSpacing: t.ff ? '0.05em' : undefined,
                        color: 'var(--pc-t1)',
                        lineHeight: 1,
                        minWidth: 100,
                      }}
                    >
                      {t.label}
                    </span>
                    <span
                      style={{ color: 'var(--pc-t4)', fontSize: '0.7rem', fontFamily: 'monospace' }}
                    >
                      {t.size} · {t.ff ? 'Bebas Neue' : 'DM Sans'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── GRADIENTS ── */}
          <SectionTitle id="gradients" label="Gradients" icon={Wand2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
            {GRADIENTS.map((g) => (
              <GradientCard key={g.name} g={g} />
            ))}
          </div>

          {/* ── SPACING ── */}
          <SectionTitle id="spacing" label="Spacing & Borders" icon={Layers} />
          <div className="space-y-5 mb-16">
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Border Radius
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {RADIUS_TOKENS.map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-3">
                    <div
                      className="w-16 h-16"
                      style={{
                        background: isDark ? 'rgba(245,197,24,0.08)' : 'rgba(196,149,10,0.07)',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(196,149,10,0.25)',
                        borderRadius: r.value,
                      }}
                    />
                    <div className="text-center">
                      <div
                        style={{
                          color: 'var(--pc-gold)',
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {r.name}
                      </div>
                      <div style={{ color: 'var(--pc-t3)', fontSize: '0.7rem' }}>{r.value}</div>
                      <div
                        style={{
                          color: 'var(--pc-t4)',
                          fontSize: '0.68rem',
                          lineHeight: 1.5,
                          marginTop: 4,
                        }}
                      >
                        {r.usage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Border Styles
              </div>
              <div className="space-y-3">
                {BORDER_TOKENS.map((b) => (
                  <div key={b.name} className="flex items-center gap-4">
                    <div
                      className="w-12 h-8 rounded-lg shrink-0"
                      style={{
                        border: b.value.includes('{')
                          ? '1.5px solid rgba(245,197,24,0.6)'
                          : b.value,
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          style={{ color: 'var(--pc-t1)', fontSize: '0.82rem', fontWeight: 600 }}
                        >
                          {b.name}
                        </span>
                        <CopyBadge value={b.value} />
                      </div>
                      <div style={{ color: 'var(--pc-t3)', fontSize: '0.72rem', marginTop: 2 }}>
                        {b.usage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Shadow & Glow Tokens
              </div>
              <div className="space-y-4">
                {SHADOW_TOKENS.map((s) => (
                  <div key={s.name} className="flex items-center gap-4">
                    <div
                      className="w-12 h-8 rounded-xl shrink-0"
                      style={{
                        background: 'var(--pc-surface-hover)',
                        boxShadow: s.value.includes('{')
                          ? '0 0 20px rgba(245,197,24,0.2)'
                          : s.value,
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          style={{ color: 'var(--pc-t1)', fontSize: '0.82rem', fontWeight: 600 }}
                        >
                          {s.name}
                        </span>
                        <CopyBadge value={s.value} />
                      </div>
                      <div style={{ color: 'var(--pc-t3)', fontSize: '0.72rem' }}>{s.usage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── COMPONENTS ── */}
          <SectionTitle id="components" label="Components" icon={Box} />
          <div className="space-y-5 mb-16">
            {/* Buttons */}
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Buttons
              </div>
              <div className="flex flex-wrap gap-4 items-start">
                {[
                  {
                    label: 'Primary CTA',
                    sub: 'Primary / Glow',
                    bg: 'linear-gradient(135deg, #F5C518, #FF9F1C)',
                    col: '#09090F',
                    fw: 700,
                    shadow: 'var(--pc-cta-shadow)',
                    icon: <Play size={16} className="fill-current" />,
                  },
                  {
                    label: 'Group Mode',
                    sub: 'Purple Action',
                    bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                    col: '#F8F8FF',
                    fw: 600,
                    icon: <Users size={15} />,
                  },
                  {
                    label: 'Secondary',
                    sub: 'Ghost',
                    bg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    col: 'var(--pc-t2)',
                    fw: 400,
                    bd: '1px solid var(--pc-bd2)',
                    icon: <RotateCcw size={14} />,
                  },
                  {
                    label: 'Back',
                    sub: 'Tertiary',
                    bg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    col: 'var(--pc-t2)',
                    fw: 400,
                    bd: '1px solid var(--pc-bd2)',
                  },
                ].map((b) => (
                  <div key={b.label} className="flex flex-col items-center gap-2">
                    <button
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl active:scale-95 transition-all duration-200"
                      style={{
                        background: b.bg,
                        color: b.col,
                        fontWeight: b.fw,
                        border: (b as any).bd,
                        boxShadow: (b as any).shadow,
                      }}
                    >
                      {(b as any).icon}
                      {b.label}
                    </button>
                    <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>{b.sub}</span>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-2">
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: 'var(--pc-bd2)',
                      border: '1px solid var(--pc-bd2)',
                      color: 'var(--pc-t1)',
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>Icon circle</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Badges & Pills
              </div>
              <div className="flex flex-wrap gap-3 items-start">
                <div className="flex flex-col items-start gap-1.5">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs uppercase tracking-widest"
                    style={{
                      background: isDark ? 'rgba(245,197,24,0.12)' : 'rgba(196,149,10,0.1)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(245,197,24,0.25)' : 'rgba(196,149,10,0.3)',
                      color: 'var(--pc-gold)',
                    }}
                  >
                    <Sparkles size={10} /> AI-Powered Movie Finder
                  </div>
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>Brand badge</span>
                </div>
                {[
                  { pct: 97, col: '#14B8A6' },
                  { pct: 91, col: '#F5C518' },
                  { pct: 86, col: '#FF9F1C' },
                  { pct: 80, col: '#8B5CF6' },
                ].map(({ pct, col }) => (
                  <div key={pct} className="flex flex-col items-start gap-1.5">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{ background: `${col}18`, border: `1px solid ${col}35`, color: col }}
                    >
                      <Sparkles size={10} /> {pct}% match
                    </div>
                    <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>
                      Match — {pct}%+
                    </span>
                  </div>
                ))}
                <div className="flex flex-col items-start gap-1.5">
                  <div
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}
                  >
                    NEW
                  </div>
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>NEW badge</span>
                </div>
                <div className="flex flex-col items-start gap-1.5">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs"
                    style={{
                      background: 'var(--pc-bd1)',
                      border: '1px solid var(--pc-bd2)',
                      color: 'var(--pc-t2)',
                    }}
                  >
                    Thriller
                  </span>
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>Genre pill</span>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Input Fields
              </div>
              <div className="space-y-4 max-w-md">
                <div className="flex flex-col gap-1.5">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>Default state</span>
                  <input
                    readOnly
                    value=""
                    placeholder="e.g. The Dark Knight, Parasite, Coco…"
                    className="w-full px-5 py-4 rounded-2xl outline-none"
                    style={{
                      background: 'var(--pc-bg)',
                      border: '1px solid var(--pc-bd2)',
                      color: 'var(--pc-t1)',
                      fontSize: '1rem',
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>
                    Focus state (gold border + ring)
                  </span>
                  <input
                    readOnly
                    value="The Dark Knight"
                    className="w-full px-5 py-4 rounded-2xl outline-none"
                    style={{
                      background: 'var(--pc-bg)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(245,197,24,0.4)' : 'rgba(196,149,10,0.5)',
                      boxShadow: '0 0 0 3px rgba(245,197,24,0.06)',
                      color: 'var(--pc-t1)',
                      fontSize: '1rem',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Cards & Panels
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>Feature card</span>
                  <div
                    className="p-5 rounded-2xl flex flex-col gap-4"
                    style={{ background: 'var(--pc-bg)', border: '1px solid var(--pc-bd1)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(245,197,24,0.18)', color: 'var(--pc-gold)' }}
                    >
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}>
                        AI-Powered
                      </div>
                      <div
                        style={{
                          color: 'var(--pc-t3)',
                          fontSize: '0.82rem',
                          lineHeight: 1.6,
                          marginTop: 4,
                        }}
                      >
                        Vector search finds films that truly match your vibe
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>
                    Quiz option — selected
                  </span>
                  <button
                    className="flex items-center gap-4 p-4 rounded-2xl text-left w-full"
                    style={{
                      background: 'rgba(245,197,24,0.08)',
                      border: '1.5px solid rgba(245,197,24,0.5)',
                      boxShadow: '0 0 20px rgba(245,197,24,0.1)',
                    }}
                  >
                    <div className="text-xl">✨</div>
                    <div>
                      <div style={{ color: 'var(--pc-gold)', fontWeight: 600, fontSize: '0.9rem' }}>
                        New Releases
                      </div>
                      <div style={{ color: 'var(--pc-t3)', fontSize: '0.8rem' }}>
                        Recent films, last 5 years
                      </div>
                    </div>
                    <div
                      className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(245,197,24,0.2)', color: 'var(--pc-gold)' }}
                    >
                      <Check size={11} />
                    </div>
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>AI insight box</span>
                  <div
                    className="p-4 rounded-2xl"
                    style={{
                      background: isDark ? 'rgba(245,197,24,0.05)' : 'rgba(196,149,10,0.05)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.15)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={11} style={{ color: 'var(--pc-gold)' }} />
                      <span
                        className="uppercase tracking-widest"
                        style={{ color: 'var(--pc-gold)', fontSize: '0.62rem' }}
                      >
                        Why this film
                      </span>
                    </div>
                    <p style={{ color: 'var(--pc-t2)', fontSize: '0.82rem', lineHeight: 1.75 }}>
                      A cerebral thrill ride that aligns perfectly with your love of mind-bending
                      stories.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Progress Indicators
              </div>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>
                    Quiz progress dots
                  </span>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="transition-all duration-300 rounded-full"
                        style={{
                          width: i === 2 ? 24 : 8,
                          height: 8,
                          background:
                            i < 2
                              ? 'rgba(245,197,24,0.5)'
                              : i === 2
                                ? 'linear-gradient(90deg, var(--pc-gold), var(--pc-amber))'
                                : 'var(--pc-bd2)',
                        }}
                      />
                    ))}
                    <span style={{ color: 'var(--pc-t3)', fontSize: '0.72rem', marginLeft: 8 }}>
                      3 of 4
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>
                    Loading progress bar
                  </span>
                  <div className="max-w-xs">
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--pc-bd2)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, var(--pc-gold), var(--pc-amber))',
                          width: '68%',
                        }}
                      />
                    </div>
                    <p
                      className="mt-2 text-right"
                      style={{ color: 'var(--pc-t4)', fontSize: '0.72rem' }}
                    >
                      68%
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>
                    Section accent bars
                  </span>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-5 rounded-full"
                        style={{
                          background: 'linear-gradient(180deg, var(--pc-gold), var(--pc-amber))',
                        }}
                      />
                      <span
                        className="uppercase tracking-widest text-xs"
                        style={{ color: 'var(--pc-gold)' }}
                      >
                        Top Pick
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-5 rounded-full"
                        style={{ background: 'linear-gradient(180deg, #8B5CF6, #14B8A6)' }}
                      />
                      <span
                        className="uppercase tracking-widest text-xs"
                        style={{ color: 'var(--pc-t2)' }}
                      >
                        More suggestions
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span style={{ color: 'var(--pc-t4)', fontSize: '0.68rem' }}>Star rating</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i <= 4 ? '#F5C518' : 'none'}
                          stroke={i <= 4 ? '#F5C518' : 'var(--pc-t4)'}
                        />
                      ))}
                    </div>
                    <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
                      8.5/10 on IMDb
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav preview */}
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Navigation Header
              </div>
              <div
                className="flex items-center justify-between px-5 py-3 rounded-2xl"
                style={{
                  background: 'var(--pc-header-bg)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--pc-bd1)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <PopcornMascot size={28} />
                  <span
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '1.3rem',
                      letterSpacing: '0.12em',
                      background: 'linear-gradient(90deg, #F5C518, #FF9F1C)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                    }}
                  >
                    PopChoice
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1.5 rounded-xl text-sm"
                    style={{ color: 'var(--pc-t3)' }}
                  >
                    How it works
                  </span>
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      border: '1px solid var(--pc-bd2)',
                      color: 'var(--pc-t2)',
                    }}
                  >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                  </span>
                  <span
                    className="px-3 py-1.5 rounded-xl text-sm"
                    style={{
                      background: 'linear-gradient(135deg, var(--pc-gold), var(--pc-amber))',
                      color: '#09090F',
                      fontWeight: 600,
                    }}
                  >
                    Find a movie
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── GENRES ── */}
          <SectionTitle id="genres" label="Genre System" icon={Grid3X3} />
          <div className="space-y-5 mb-16">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {GENRE_COLORS.map((g) => {
                const icons: Record<string, React.ElementType> = {
                  Action: Zap,
                  Comedy: Smile,
                  Drama: Film,
                  'Sci-Fi': FlaskConical,
                  Thriller: Ghost,
                  Romance: Heart,
                  Horror: Skull,
                  Adventure: Globe,
                  Animation: Star,
                  Documentary: Clock,
                };
                const Icon = icons[g.name];
                return (
                  <div
                    key={g.name}
                    className="p-4 rounded-2xl flex flex-col items-center gap-2 text-center"
                    style={{ background: `${g.value}10`, border: `1px solid ${g.value}25` }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${g.value}20`, color: g.value }}
                    >
                      {Icon && <Icon size={17} />}
                    </div>
                    <div style={{ color: 'var(--pc-t1)', fontSize: '0.82rem', fontWeight: 600 }}>
                      {g.name}
                    </div>
                    <CopyBadge value={g.value} />
                  </div>
                );
              })}
            </div>
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Tone Cards
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Light & Fun',
                    desc: 'Easy going',
                    icon: Sun,
                    color: '#F5C518',
                    grad: 'linear-gradient(135deg, #F5C51818, #FF9F1C18)',
                  },
                  {
                    label: 'Balanced',
                    desc: 'Mix of everything',
                    icon: CloudSun,
                    color: '#14B8A6',
                    grad: 'linear-gradient(135deg, #14B8A618, #60A5FA18)',
                  },
                  {
                    label: 'Serious',
                    desc: 'Thought-provoking',
                    icon: Star,
                    color: '#8B5CF6',
                    grad: 'linear-gradient(135deg, #8B5CF618, #A78BFA18)',
                  },
                  {
                    label: 'Dark & Intense',
                    desc: 'Gripping',
                    icon: Moon,
                    color: '#EF4444',
                    grad: 'linear-gradient(135deg, #EF444418, #6B728018)',
                  },
                ].map((t) => (
                  <button
                    key={t.label}
                    className="flex items-center gap-3 p-3.5 rounded-2xl text-left"
                    style={{ background: t.grad, border: `1.5px solid ${t.color}40` }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${t.color}20`, color: t.color }}
                    >
                      <t.icon size={16} />
                    </div>
                    <div>
                      <div style={{ color: t.color, fontWeight: 600, fontSize: '0.82rem' }}>
                        {t.label}
                      </div>
                      <div style={{ color: 'var(--pc-t3)', fontSize: '0.72rem' }}>{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── MOTION ── */}
          <SectionTitle id="motion" label="Motion & Animation" icon={Cpu} />
          <div className="space-y-5 mb-16">
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Animation Tokens
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  {
                    name: 'Page Enter',
                    desc: 'Staggered fade-in + Y offset',
                    code: `initial={{ opacity: 0, y: 20 }}\nanimate={{ opacity: 1, y: 0 }}\ntransition={{ duration: 0.5 }}`,
                    color: '#F5C518',
                  },
                  {
                    name: 'Hero Spring',
                    desc: 'Mascot / bold element entry',
                    code: `initial={{ opacity: 0, scale: 0.5, y: 30 }}\nanimate={{ opacity: 1, scale: 1, y: 0 }}\ntransition={{ type: "spring", stiffness: 200 }}`,
                    color: '#FF9F1C',
                  },
                  {
                    name: 'Scroll Reveal',
                    desc: 'whileInView for sections',
                    code: `initial={{ opacity: 0, y: 30 }}\nwhileInView={{ opacity: 1, y: 0 }}\nviewport={{ once: true }}\ntransition={{ duration: 0.6 }}`,
                    color: '#8B5CF6',
                  },
                  {
                    name: 'Slide Transition',
                    desc: 'Quiz question slide',
                    code: `enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 })\ncenter: { x: 0, opacity: 1 }\nexit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 })`,
                    color: '#14B8A6',
                  },
                  {
                    name: 'Tip Swap',
                    desc: 'Loading text fade',
                    code: `initial={{ opacity: 0, y: 8 }}\nanimate={{ opacity: 1, y: 0 }}\nexit={{ opacity: 0, y: -8 }}\ntransition={{ duration: 0.4 }}`,
                    color: '#60A5FA',
                  },
                  {
                    name: 'Mascot Bob',
                    desc: 'Gentle looping float',
                    code: `@keyframes mascot-bob {\n  0%,100% { transform: translateY(0) rotate(-1deg); }\n  50% { transform: translateY(-6px) rotate(1deg); }\n}`,
                    color: '#F5C518',
                  },
                  {
                    name: 'Float Particles',
                    desc: 'Hero bg particles',
                    code: `@keyframes float-up {\n  0% { opacity: 0; }\n  10% { opacity: 1; }\n  90% { opacity: 0.3; }\n  100% { transform: translateY(-110vh); }\n}`,
                    color: '#A78BFA',
                  },
                  {
                    name: 'Hover Lift',
                    desc: 'Card hover',
                    code: `whileHover={{ y: -4 }}\nwhileTap={{ scale: 0.97 }}`,
                    color: '#10B981',
                  },
                ].map((a) => (
                  <div
                    key={a.name}
                    className="p-4 rounded-xl"
                    style={{ background: `${a.color}08`, border: `1px solid ${a.color}18` }}
                  >
                    <div
                      style={{
                        color: a.color,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        marginBottom: 4,
                      }}
                    >
                      {a.name}
                    </div>
                    <div style={{ color: 'var(--pc-t3)', fontSize: '0.75rem', marginBottom: 8 }}>
                      {a.desc}
                    </div>
                    <pre
                      className="overflow-x-auto"
                      style={{
                        background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                        border: '1px solid var(--pc-bd1)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: '0.68rem',
                        color: 'var(--pc-t2)',
                        lineHeight: 1.7,
                        fontFamily: 'monospace',
                        whiteSpace: 'pre',
                      }}
                    >
                      {a.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Stagger delays live demo */}
            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Stagger Delay Demo — i × 0.1s
              </div>
              <div className="flex gap-3 flex-wrap mb-4">
                {[0, 0.1, 0.2, 0.3, 0.4].map((delay, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.5, delay }}
                    className="p-4 rounded-xl flex flex-col items-center gap-2"
                    style={{
                      background: isDark ? 'rgba(245,197,24,0.06)' : 'rgba(196,149,10,0.06)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(245,197,24,0.14)' : 'rgba(196,149,10,0.2)',
                      minWidth: 70,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{ background: `rgba(245,197,24,${0.1 + i * 0.06})` }}
                    />
                    <span
                      style={{
                        color: 'var(--pc-t3)',
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      {delay}s
                    </span>
                  </motion.div>
                ))}
              </div>
              <p style={{ color: 'var(--pc-t3)', fontSize: '0.75rem', lineHeight: 1.6 }}>
                Scroll back up to replay the stagger. Each card gets{' '}
                <code style={{ color: 'var(--pc-gold)', fontFamily: 'monospace' }}>
                  delay: i * 0.1
                </code>{' '}
                in its{' '}
                <code style={{ color: 'var(--pc-gold)', fontFamily: 'monospace' }}>transition</code>{' '}
                prop.
              </p>
            </div>

            <div className="p-6 rounded-2xl" style={cardStyle}>
              <div
                style={{
                  color: 'var(--pc-t3)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Duration Reference
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { dur: '0.3s', label: 'Micro', usage: 'Hover, quiz slides' },
                  { dur: '0.4s', label: 'Fast', usage: 'Tip swap, button tap' },
                  { dur: '0.5–0.6s', label: 'Standard', usage: 'Page enters' },
                  { dur: '0.7s', label: 'Slow', usage: 'Main card reveal' },
                  { dur: '0.8–1s', label: 'Ambient', usage: 'Background fades' },
                  { dur: '1.2s', label: 'Loop', usage: 'Popcorn orbit' },
                  { dur: '2–2.5s', label: 'Long loop', usage: 'Mascot bob' },
                  { dur: '200–300ms', label: 'CSS', usage: 'transition-all' },
                ].map((d) => (
                  <div
                    key={d.dur}
                    className="p-3 rounded-xl"
                    style={{
                      background: isDark ? 'rgba(245,197,24,0.04)' : 'rgba(196,149,10,0.05)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.15)',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--pc-gold)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                      }}
                    >
                      {d.dur}
                    </div>
                    <div style={{ color: 'var(--pc-t1)', fontSize: '0.78rem', marginTop: 2 }}>
                      {d.label}
                    </div>
                    <div
                      style={{
                        color: 'var(--pc-t4)',
                        fontSize: '0.68rem',
                        marginTop: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      {d.usage}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="p-5 rounded-2xl text-center"
            style={{
              background: isDark ? 'rgba(245,197,24,0.04)' : 'rgba(196,149,10,0.05)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.15)',
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles size={13} style={{ color: 'var(--pc-gold)' }} />
              <span style={{ color: 'var(--pc-gold)', fontWeight: 600, fontSize: '0.85rem' }}>
                PopChoice Design System v1.0
              </span>
            </div>
            <p style={{ color: 'var(--pc-t3)', fontSize: '0.78rem', lineHeight: 1.6 }}>
              Two themes: <strong style={{ color: 'var(--pc-t1)' }}>Dark Cinema</strong> (default) +{' '}
              <strong style={{ color: 'var(--pc-t1)' }}>Cinema Daylight</strong> (light). All colors
              via CSS custom properties. Fonts:{' '}
              <strong style={{ color: 'var(--pc-t2)' }}>Bebas Neue</strong> +{' '}
              <strong style={{ color: 'var(--pc-t2)' }}>DM Sans</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
