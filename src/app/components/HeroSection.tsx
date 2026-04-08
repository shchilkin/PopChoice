'use client';

import { Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Mascot } from '@/components/Mascot';
import { useLanguage } from '@/i18n';
import { usePCTheme } from '@/hooks/usePCTheme';
import { palette } from '@/styles/designTokens';

const CINEMA_BG =
  'https://images.unsplash.com/photo-1759230766134-e3ff1c27d20e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2luZW1hJTIwdGhlYXRlciUyMHNlYXRzJTIwZHJhbWF0aWN8ZW58MXx8fHwxNzc0ODk0MzUxfDA&ixlib=rb-4.1.0&q=80&w=1080';

interface ParticleConfig {
  x: number;
  delay: number;
  dur: number;
  size: number;
  opacity: number;
}

function FilmParticles() {
  const [particles, setParticles] = useState<ParticleConfig[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 14 }, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 6,
        dur: 8 + Math.random() * 10,
        size: 4 + Math.random() * 6,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: '-20px',
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? palette.gold : i % 3 === 1 ? palette.amber : palette.purple,
            opacity: p.opacity,
            animation: `float-up ${p.dur}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function HeroSection() {
  const router = useRouter();
  const { isDark } = usePCTheme();
  const { t } = useLanguage();

  const heroOverlay = isDark
    ? 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,197,24,0.06) 0%, transparent 70%), linear-gradient(180deg, #09090F 0%, rgba(9,9,15,0.4) 30%, rgba(9,9,15,0.6) 70%, #09090F 100%)'
    : 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,149,10,0.06) 0%, transparent 70%), linear-gradient(180deg, #F7F5EE 0%, rgba(247,245,238,0.35) 30%, rgba(247,245,238,0.55) 70%, #F7F5EE 100%)';

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-5 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={CINEMA_BG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          style={{ opacity: isDark ? 0.18 : 0.1 }}
          priority
        />
        <div className="absolute inset-0" style={{ background: heroOverlay }} />
      </div>

      <FilmParticles />

      {/* Film grain texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: isDark ? 0.03 : 0.015,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs uppercase tracking-widest"
          style={{
            background: 'var(--pc-gold-subtle)',
            border: '1px solid',
            borderColor: 'var(--pc-gold-bd-subtle)',
            color: 'var(--pc-gold)',
          }}
        >
          <Sparkles size={11} />
          {t.hero.badge}
        </motion.div>

        {/* Mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <Mascot width={130} height={130} />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-3 tracking-tight"
        >
          <span
            className="pc-gradient-text"
            style={{
              fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
              fontSize: 'clamp(3.5rem, 10vw, 6rem)',
              lineHeight: 1,
              letterSpacing: '0.04em',
            }}
          >
            PopChoice
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-10 max-w-lg"
          style={{ color: 'var(--pc-t2)', fontSize: '1.1rem', lineHeight: 1.7 }}
        >
          {t.hero.descriptionPre}{' '}
          <span style={{ color: 'var(--pc-gold)' }}>{t.hero.perfectMovie}</span>{' '}
          {t.hero.descriptionPost}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={() => router.push('/quiz')}
            className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 active:scale-95"
            style={{
              background: 'var(--pc-cta)',
              color: 'var(--pc-cta-text)',
              fontSize: '1.05rem',
              boxShadow: 'var(--pc-cta-shadow)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--pc-cta-shadow-hover)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--pc-cta-shadow)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <Play size={18} className="fill-current" />
            <span style={{ fontWeight: 700 }}>{t.hero.findMyMovie}</span>
          </button>

          <button
            onClick={() => router.push('/about')}
            className="px-6 py-4 rounded-2xl text-sm transition-all duration-200"
            style={{
              color: 'var(--pc-t2)',
              border: '1px solid var(--pc-bd2)',
              background: 'var(--pc-ghost)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--pc-t1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--pc-bd4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--pc-t2)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--pc-bd2)';
            }}
          >
            {t.hero.howItWorks}
          </button>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 text-xs"
          style={{ color: 'var(--pc-t4)' }}
        >
          {t.hero.noSignup}
        </motion.p>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{ color: 'var(--pc-t4)' }}
      >
        <div style={{ animation: 'bounce-soft 2s ease-in-out infinite' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 14l-5-5h10l-5 5z" />
          </svg>
        </div>
        <style>{`@keyframes bounce-soft { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }`}</style>
      </motion.div>
    </section>
  );
}
