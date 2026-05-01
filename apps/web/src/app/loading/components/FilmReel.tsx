'use client';

import { motion } from 'motion/react';

const KERNEL_COUNT = 8;

function PopcornKernel({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * 360;
  const radius = 52;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  const delay = (index / total) * 1.2;

  return (
    <motion.div
      className="absolute"
      style={{
        left: '50%',
        top: '50%',
        marginLeft: x - 10,
        marginTop: y - 10,
        width: 20,
        height: 20,
      }}
      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.2, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="10" cy="10" rx="9" ry="7" fill="#F5C518" opacity="0.9" />
        <ellipse cx="7" cy="7" rx="5" ry="4" fill="#FFF0A0" opacity="0.8" />
        <ellipse cx="13" cy="12" rx="4" ry="3" fill="#FFD700" opacity="0.6" />
      </svg>
    </motion.div>
  );
}

export function FilmReel() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: '3px solid rgba(245,197,24,0.15)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{ border: '2px solid rgba(245,197,24,0.1)' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      {Array.from({ length: KERNEL_COUNT }).map((_, i) => (
        <PopcornKernel key={i} index={i} total={KERNEL_COUNT} />
      ))}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: '2.2rem' }}
      >
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          🎬
        </motion.span>
      </div>
    </div>
  );
}
