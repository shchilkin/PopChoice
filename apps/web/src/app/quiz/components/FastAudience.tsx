'use client';

import { ArrowLeft, SlidersHorizontal, User, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { AudienceChoiceButton } from './AudienceChoiceButton';

interface FastAudienceProps {
  flow: 'fast' | 'normal';
  onBack: () => void;
  onStartSolo: () => void;
  onStartDuo: () => void;
  onStartGroup: () => void;
}

export function FastAudience({
  flow,
  onBack,
  onStartSolo,
  onStartDuo,
  onStartGroup,
}: FastAudienceProps) {
  const { t } = useLanguage();
  const copy = flow === 'fast' ? t.quiz.fastAudience : t.quiz.normalAudience;
  const iconBackground = flow === 'fast' ? 'rgba(245,197,24,0.15)' : `${palette.teal}26`;
  const iconColor = flow === 'fast' ? 'var(--pc-gold-text)' : palette.teal;
  const HeaderIcon = flow === 'fast' ? Zap : SlidersHorizontal;

  return (
    <div className="flex min-h-[80vh] flex-1 flex-col items-center justify-center px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all duration-200"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t3)',
          }}
        >
          <ArrowLeft size={15} />
          {t.quiz.fastAudience.back}
        </button>

        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: iconBackground,
              color: iconColor,
            }}
          >
            <HeaderIcon size={26} />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '2rem',
              letterSpacing: '0.05em',
              color: 'var(--pc-t1)',
            }}
          >
            {copy.title}
          </h2>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.9rem', marginTop: 6 }}>{copy.subtitle}</p>
        </div>

        <div className="flex flex-col gap-4">
          <AudienceChoiceButton
            onClick={onStartSolo}
            icon={User}
            iconBackground="rgba(245,197,24,0.15)"
            iconColor="var(--pc-gold-text)"
            hoverBorderColor="var(--pc-gold-bd-strong)"
            title={copy.soloTitle}
            description={copy.soloDesc}
          />

          <AudienceChoiceButton
            onClick={onStartDuo}
            icon={Users}
            iconBackground={`${palette.teal}26`}
            iconColor={palette.teal}
            hoverBorderColor={`${palette.teal}66`}
            title={copy.duoTitle}
            description={copy.duoDesc}
          />

          <AudienceChoiceButton
            onClick={onStartGroup}
            icon={Users}
            iconBackground={`${palette.purple}26`}
            iconColor={palette.purple}
            hoverBorderColor={`${palette.purple}66`}
            title={copy.groupTitle}
            description={copy.groupDesc}
          />
        </div>
      </motion.div>
    </div>
  );
}
