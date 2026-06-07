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

type ResultsCopy = ReturnType<typeof useLanguage>['t']['results'];

function getFeedbackOptions(results: ResultsCopy): FeedbackOption[] {
  return [
    { kind: 'useful', label: results.feedbackUseful, icon: Check },
    { kind: 'already_watched', label: results.feedbackSeen, icon: Eye },
    { kind: 'wrong_mood', label: results.feedbackWrongMood, icon: Frown },
    { kind: 'too_obvious', label: results.feedbackTooObvious, icon: Lightbulb },
    { kind: 'too_obscure', label: results.feedbackTooObscure, icon: Sparkles },
    { kind: 'close', label: results.feedbackClose, icon: RotateCcw },
  ];
}

function FeedbackStatusText({
  feedbackState,
  results,
}: {
  feedbackState: FeedbackState;
  results: ResultsCopy;
}) {
  if (feedbackState === 'saved') return results.feedbackThanks;
  if (feedbackState === 'error') return results.feedbackError;
  return results.feedbackHint;
}

function SharedFeedbackHint({
  isSharedResult,
  results,
}: {
  isSharedResult: boolean;
  results: ResultsCopy;
}) {
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
      {results.sharedFeedbackHint}
    </motion.div>
  );
}

function isFeedbackOptionBusy(feedbackState: FeedbackState, isSelected: boolean) {
  return feedbackState === 'saving' && isSelected;
}

function isFeedbackOptionDisabled(feedbackState: FeedbackState, recommendationSlug?: string) {
  if (feedbackState === 'saving') return true;
  return !recommendationSlug;
}

function getFeedbackButtonStyle({
  disabled,
  isSelected,
}: {
  disabled: boolean;
  isSelected: boolean;
}) {
  const baseStyle = isSelected
    ? {
        background: 'var(--pc-gold-subtle)',
        color: 'var(--pc-gold-text)',
      }
    : {
        background: 'transparent',
        color: 'var(--pc-t3)',
      };

  return {
    ...baseStyle,
    border: '1px solid var(--pc-bd2)',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: disabled ? 'wait' : 'pointer',
  };
}

function FeedbackOptionIcon({ Icon, isBusy }: { Icon: FeedbackOption['icon']; isBusy: boolean }) {
  if (isBusy) return <Loader2 size={12} className="animate-spin" />;
  return <Icon size={12} />;
}

function FeedbackOptionButton({
  feedbackState,
  option,
  onFeedback,
  recommendationSlug,
  selectedFeedback,
}: {
  feedbackState: FeedbackState;
  option: FeedbackOption;
  onFeedback: (kind: FeedbackKind) => Promise<void>;
  recommendationSlug?: string;
  selectedFeedback: FeedbackKind | null;
}) {
  const { icon: Icon, kind, label } = option;
  const isSelected = selectedFeedback === kind;
  const isBusy = isFeedbackOptionBusy(feedbackState, isSelected);
  const disabled = isFeedbackOptionDisabled(feedbackState, recommendationSlug);

  return (
    <button
      type="button"
      onClick={() => void onFeedback(kind)}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={getFeedbackButtonStyle({ disabled, isSelected })}
    >
      <FeedbackOptionIcon Icon={Icon} isBusy={isBusy} />
      {label}
    </button>
  );
}

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
  const feedbackOptions = getFeedbackOptions(t.results);

  if (!viewerCanRate) {
    return <SharedFeedbackHint isSharedResult={isSharedResult} results={t.results} />;
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
            <FeedbackStatusText feedbackState={feedbackState} results={t.results} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {feedbackOptions.map((option) => (
            <FeedbackOptionButton
              key={option.kind}
              feedbackState={feedbackState}
              option={option}
              onFeedback={onFeedback}
              recommendationSlug={recommendationSlug}
              selectedFeedback={selectedFeedback}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
