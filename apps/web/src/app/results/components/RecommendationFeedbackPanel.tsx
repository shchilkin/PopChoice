'use client';

import { Check, Eye, Frown, Lightbulb, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';

export type FeedbackKind =
  | 'useful'
  | 'already_watched'
  | 'wrong_mood'
  | 'too_obvious'
  | 'too_obscure'
  | 'close';

export type FeedbackState = 'idle' | 'saving' | 'saved' | 'error';

type FeedbackOption = {
  kind: FeedbackKind;
  label: string;
  icon: typeof Check;
};

export function RecommendationFeedbackPanel({
  feedbackState,
  isSharedResult,
  onFeedback,
  recommendationSlug,
  selectedFeedback,
  viewerCanRate,
}: {
  feedbackState: FeedbackState;
  isSharedResult: boolean;
  onFeedback: (kind: FeedbackKind) => Promise<void>;
  recommendationSlug?: string;
  selectedFeedback: FeedbackKind | null;
  viewerCanRate: boolean;
}) {
  const { t } = useLanguage();
  const feedbackOptions: FeedbackOption[] = [
    { kind: 'useful', label: t.results.feedbackUseful, icon: Check },
    { kind: 'already_watched', label: t.results.feedbackSeen, icon: Eye },
    { kind: 'wrong_mood', label: t.results.feedbackWrongMood, icon: Frown },
    { kind: 'too_obvious', label: t.results.feedbackTooObvious, icon: Lightbulb },
    { kind: 'too_obscure', label: t.results.feedbackTooObscure, icon: Sparkles },
    { kind: 'close', label: t.results.feedbackClose, icon: RotateCcw },
  ];

  if (!viewerCanRate) {
    if (!isSharedResult) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-10 rounded-2xl px-4 py-4 text-center"
        style={{
          background: 'var(--pc-ghost)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t4)',
          fontSize: '0.78rem',
        }}
      >
        {t.results.sharedFeedbackHint}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mb-10 rounded-2xl px-4 py-4"
      style={{
        background: 'var(--pc-ghost)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p
            className="uppercase tracking-widest"
            style={{ color: 'var(--pc-gold-text)', fontSize: '0.68rem' }}
          >
            {t.results.feedbackPrompt}
          </p>
          <p className="mt-1" style={{ color: 'var(--pc-t4)', fontSize: '0.78rem' }}>
            {feedbackState === 'saved'
              ? t.results.feedbackThanks
              : feedbackState === 'error'
                ? t.results.feedbackError
                : t.results.feedbackHint}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {feedbackOptions.map(({ kind, label, icon: Icon }) => {
            const isSelected = selectedFeedback === kind;
            const isBusy = feedbackState === 'saving' && isSelected;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => void onFeedback(kind)}
                disabled={feedbackState === 'saving' || !recommendationSlug}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95"
                style={{
                  background: isSelected ? 'var(--pc-gold-subtle)' : 'transparent',
                  border: '1px solid var(--pc-bd2)',
                  color: isSelected ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: feedbackState === 'saving' || !recommendationSlug ? 'wait' : 'pointer',
                }}
              >
                {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
