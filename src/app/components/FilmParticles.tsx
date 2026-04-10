'use client';

import { useState } from 'react';

import { palette } from '@/styles/designTokens';

interface ParticleConfig {
  x: number;
  delay: number;
  dur: number;
  size: number;
  opacity: number;
}

export default function FilmParticles() {
  const [particles] = useState<ParticleConfig[]>(() =>
    Array.from({ length: 14 }, () => ({
      x: Math.random() * 100,
      delay: Math.random() * 6,
      dur: 8 + Math.random() * 10,
      size: 4 + Math.random() * 6,
      opacity: 0.15 + Math.random() * 0.25,
    })),
  );

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
