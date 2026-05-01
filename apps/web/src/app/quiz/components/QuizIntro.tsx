'use client';

import { ChevronRight, User, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { Mascot } from '@/components/Mascot';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

interface QuizIntroProps {
  onStartSolo: () => void;
  onStartGroup: () => void;
}

export function QuizIntro({ onStartSolo, onStartGroup }: QuizIntroProps) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Mascot width={64} height={64} />
          <h1
            className="mb-2"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '2.2rem',
              letterSpacing: '0.05em',
              color: 'var(--pc-t1)',
            }}
          >
            {t.quiz.intro.title}
          </h1>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>{t.quiz.intro.subtitle}</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Solo */}
          <button
            onClick={onStartSolo}
            className="group flex items-center gap-5 p-5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'var(--pc-surface)',
              border: '1px solid var(--pc-bd2)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-gold-bd-strong)';
              (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd2)';
              (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface)';
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(245,197,24,0.15)',
                color: 'var(--pc-gold-text)',
              }}
            >
              <User size={22} />
            </div>
            <div>
              <div
                style={{
                  color: 'var(--pc-t1)',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                {t.quiz.intro.soloTitle}
              </div>
              <div style={{ color: 'var(--pc-t4)', fontSize: '0.85rem' }}>
                {t.quiz.intro.soloDesc}
              </div>
            </div>
            <ChevronRight
              size={18}
              className="ml-auto shrink-0"
              style={{ color: 'var(--pc-t4)' }}
            />
          </button>

          {/* Group */}
          <button
            onClick={onStartGroup}
            className="group flex items-center gap-5 p-5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'var(--pc-surface)',
              border: '1px solid var(--pc-bd2)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${palette.purple}66`;
              (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd2)';
              (e.currentTarget as HTMLElement).style.background = 'var(--pc-surface)';
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${palette.purple}26`, color: palette.purple }}
            >
              <Users size={22} />
            </div>
            <div>
              <div style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '1rem' }}>
                {t.quiz.intro.groupTitle}
              </div>
              <div style={{ color: 'var(--pc-t4)', fontSize: '0.85rem' }}>
                {t.quiz.intro.groupDesc}
              </div>
            </div>
            <ChevronRight
              size={18}
              className="ml-auto shrink-0"
              style={{ color: 'var(--pc-t4)' }}
            />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
