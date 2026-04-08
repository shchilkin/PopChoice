'use client';

import { Play, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

import { Mascot } from '@/components/Mascot';
import { usePCTheme } from '@/hooks/usePCTheme';

const CINEMA_BG =
  'https://images.unsplash.com/photo-1759230766134-e3ff1c27d20e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2luZW1hJTIwdGhlYXRlciUyMHNlYXRzJTIwZHJhbWF0aWN8ZW58MXx8fHwxNzc0ODk0MzUxfDA&ixlib=rb-4.1.0&q=80&w=1080';

const POPCORN_IMG =
  'https://images.unsplash.com/photo-1770597105062-648a2fbfa052?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3Bjb3JuJTIwYnVja2V0JTIwbW92aWUlMjBuaWdodHxlbnwxfHx8fDE3NzQ4OTQzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered',
    desc: 'Vector search finds films that truly match your vibe',
    color: '#F5C518',
  },
  {
    icon: Play,
    title: '4 Quick Questions',
    desc: 'No endless forms — just a 60-second taste quiz',
    color: '#FF9F1C',
  },
  {
    icon: Users,
    title: 'Group Mode',
    desc: 'Find a film everyone at movie night will enjoy',
    color: '#8B5CF6',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    desc: 'Get 6 curated recommendations in seconds',
    color: '#14B8A6',
  },
];

function FilmParticles() {
  const particles = Array.from({ length: 14 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_, i) => {
        const x = Math.random() * 100;
        const delay = Math.random() * 6;
        const dur = 8 + Math.random() * 10;
        const size = 4 + Math.random() * 6;
        const opacity = 0.15 + Math.random() * 0.25;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              bottom: '-20px',
              width: size,
              height: size,
              background: i % 3 === 0 ? '#F5C518' : i % 3 === 1 ? '#FF9F1C' : '#8B5CF6',
              opacity,
              animation: `float-up ${dur}s ${delay}s linear infinite`,
            }}
          />
        );
      })}
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

export default function LandingPage() {
  const router = useRouter();
  const { isDark } = usePCTheme();

  const heroOverlay = isDark
    ? 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,197,24,0.06) 0%, transparent 70%), linear-gradient(180deg, #09090F 0%, rgba(9,9,15,0.4) 30%, rgba(9,9,15,0.6) 70%, #09090F 100%)'
    : 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,149,10,0.06) 0%, transparent 70%), linear-gradient(180deg, #F7F5EE 0%, rgba(247,245,238,0.35) 30%, rgba(247,245,238,0.55) 70%, #F7F5EE 100%)';

  const sectionFadeGrad = isDark
    ? 'linear-gradient(180deg, #09090F 0%, transparent 30%, transparent 70%, #09090F 100%)'
    : 'linear-gradient(180deg, #F7F5EE 0%, transparent 30%, transparent 70%, #F7F5EE 100%)';

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', 'Inter', sans-serif" }}>
      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-5 overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CINEMA_BG}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: isDark ? 0.18 : 0.1 }}
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
              background: isDark ? 'rgba(245,197,24,0.12)' : 'rgba(196,149,10,0.1)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(245,197,24,0.25)' : 'rgba(196,149,10,0.3)',
              color: 'var(--pc-gold)',
            }}
          >
            <Sparkles size={11} />
            AI-Powered Movie Finder
          </motion.div>

          {/* Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              type: 'spring',
              stiffness: 200,
            }}
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
            Stop endlessly scrolling. Answer 4 quick questions and let AI find the{' '}
            <span style={{ color: 'var(--pc-gold)' }}>perfect movie</span> for your mood, your
            night, your vibe.
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
                color: '#09090F',
                fontSize: '1.05rem',
                boxShadow: 'var(--pc-cta-shadow)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  'var(--pc-cta-shadow-hover)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--pc-cta-shadow)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <Play size={18} className="fill-current" />
              <span style={{ fontWeight: 700 }}>Find My Movie</span>
            </button>

            <button
              onClick={() => router.push('/about')}
              className="px-6 py-4 rounded-2xl text-sm transition-all duration-200"
              style={{
                color: 'var(--pc-t2)',
                border: '1px solid var(--pc-bd2)',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
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
              How it works
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
            ✨ No sign-up required · Takes ~60 seconds · Works on mobile
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

      {/* Features section */}
      <section className="px-5 py-20 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2
            className="mb-3"
            style={{
              fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              letterSpacing: '0.05em',
              color: 'var(--pc-t1)',
            }}
          >
            Movie night, sorted.
          </h2>
          <p style={{ color: 'var(--pc-t2)', fontSize: '1rem' }}>
            No algorithms, no endless scrolling — just perfect picks.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl flex flex-col gap-4"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd1)',
                transition: 'background 0.3s, border-color 0.3s',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${f.color}18`, color: f.color }}
              >
                <f.icon size={20} />
              </div>
              <div>
                <h3
                  className="mb-1"
                  style={{
                    color: 'var(--pc-t1)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    color: 'var(--pc-t3)',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Movie night visual */}
      <section className="relative overflow-hidden py-20 px-5">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={POPCORN_IMG}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: isDark ? 0.12 : 0.07 }}
          />
          <div className="absolute inset-0" style={{ background: sectionFadeGrad }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center max-w-xl mx-auto"
        >
          <div
            className="text-5xl mb-6"
            style={{ animation: 'mascot-bob 2.5s ease-in-out infinite' }}
          >
            🎬
          </div>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              letterSpacing: '0.04em',
              color: 'var(--pc-t1)',
            }}
          >
            Your next favorite film is one quiz away
          </h2>
          <p className="mb-8" style={{ color: 'var(--pc-t2)', lineHeight: 1.7 }}>
            Whether it&apos;s a cozy solo night or a rowdy group screening, PopChoice reads the room
            and delivers a pick everyone will love.
          </p>
          <button
            onClick={() => router.push('/quiz')}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl transition-all duration-200 active:scale-95"
            style={{
              background: 'var(--pc-cta)',
              color: '#09090F',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            <Play size={16} className="fill-current" />
            Start the Quiz
          </button>
        </motion.div>
        <style>{`@keyframes mascot-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
      </section>
    </div>
  );
}
