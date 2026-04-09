'use client';

import { Play } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { usePCTheme } from '@/hooks/usePCTheme';

const POPCORN_IMG =
  'https://images.unsplash.com/photo-1770597105062-648a2fbfa052?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3Bjb3JuJTIwYnVja2V0JTIwbW92aWUlMjBuaWdodHxlbnwxfHx8fDE3NzQ4OTQzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080';

export function CtaSection() {
  const router = useRouter();
  const { isDark } = usePCTheme();

  const sectionFadeGrad =
    'linear-gradient(180deg, var(--pc-bg) 0%, transparent 30%, transparent 70%, var(--pc-bg) 100%)';

  return (
    <section className="relative overflow-hidden py-20 px-5">
      <div className="absolute inset-0">
        <Image
          src={POPCORN_IMG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
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
            color: 'var(--pc-cta-text)',
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
  );
}
