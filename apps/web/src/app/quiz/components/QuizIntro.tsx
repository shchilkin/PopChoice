'use client';

import { User, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { Mascot } from '@/components/Mascot';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { AudienceChoiceButton } from './AudienceChoiceButton';

interface QuizIntroProps {
  onStartFastPick: () => void;
  onStartSolo: () => void;
  onStartDuo: () => void;
  onStartGroup: () => void;
}

export function QuizIntro({
  onStartFastPick,
  onStartSolo,
  onStartDuo,
  onStartGroup,
}: QuizIntroProps) {
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
          <AudienceChoiceButton
            onClick={onStartFastPick}
            icon={Zap}
            iconBackground="rgba(245,197,24,0.15)"
            iconColor="var(--pc-gold-text)"
            hoverBorderColor="var(--pc-gold-bd-strong)"
            title={t.quiz.intro.fastPickTitle}
            description={t.quiz.intro.fastPickDesc}
          />

          <AudienceChoiceButton
            onClick={onStartSolo}
            icon={User}
            iconBackground="rgba(245,197,24,0.15)"
            iconColor="var(--pc-gold-text)"
            hoverBorderColor="var(--pc-gold-bd-strong)"
            title={t.quiz.intro.soloTitle}
            description={t.quiz.intro.soloDesc}
          />

          <AudienceChoiceButton
            onClick={onStartDuo}
            icon={Users}
            iconBackground={`${palette.teal}26`}
            iconColor={palette.teal}
            hoverBorderColor={`${palette.teal}66`}
            title={t.quiz.intro.duoTitle}
            description={t.quiz.intro.duoDesc}
          />

          <AudienceChoiceButton
            onClick={onStartGroup}
            icon={Users}
            iconBackground={`${palette.purple}26`}
            iconColor={palette.purple}
            hoverBorderColor={`${palette.purple}66`}
            title={t.quiz.intro.groupTitle}
            description={t.quiz.intro.groupDesc}
          />
        </div>
      </motion.div>
    </div>
  );
}
