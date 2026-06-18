'use client';

import { Ban, Check, Eye, Frown, Loader2, Radar, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';

export type FeedbackKind =
  | 'useful'
  | 'already_watched'
  | 'not_for_me'
  | 'wrong_mood'
  | 'too_obvious'
  | 'too_obscure'
  | 'close';

export type FeedbackState = 'idle' | 'saving' | 'saved' | 'error';
export type FeedbackFollowUpKind = 'more_like_this' | 'try_another';
export type FeedbackFollowUpState = 'idle' | 'requesting' | 'requested' | 'unavailable';

type FeedbackOption = {
  kind: FeedbackKind;
  label: string;
  icon: typeof Check;
};

type FeedbackFollowUpOption = {
  kind: FeedbackFollowUpKind;
  label: string;
  icon: typeof Check;
};

type ResultsCopy = ReturnType<typeof useLanguage>['t']['results'];

function getFeedbackOptions(results: ResultsCopy): FeedbackOption[] {
  return [
    { kind: 'useful', label: results.feedbackUseful, icon: Check },
    { kind: 'already_watched', label: results.feedbackSeen, icon: Eye },
    { kind: 'not_for_me', label: results.feedbackNotForMe, icon: Ban },
    { kind: 'wrong_mood', label: results.feedbackWrongMood, icon: Frown },
    { kind: 'too_obvious', label: results.feedbackTooObvious, icon: Radar },
    { kind: 'close', label: results.feedbackClose, icon: Sparkles },
  ];
}

function getFollowUpOptions(results: ResultsCopy): FeedbackFollowUpOption[] {
  return [
    { kind: 'more_like_this', label: results.feedbackMoreLikeThis, icon: Sparkles },
    { kind: 'try_another', label: results.feedbackTryAnother, icon: RefreshCw },
  ];
}

function FeedbackStatusText({
  feedbackState,
  followUpState,
  results,
}: {
  feedbackState: FeedbackState;
  followUpState: FeedbackFollowUpState;
  results: ResultsCopy;
}) {
  const followUpStatusText: Partial<Record<FeedbackFollowUpState, string>> = {
    requested: results.feedbackFollowUpQueued,
    unavailable: results.feedbackFollowUpUnavailable,
  };
  const feedbackStatusText: Record<FeedbackState, string> = {
    error: results.feedbackError,
    idle: results.feedbackHint,
    saved: results.feedbackThanks,
    saving: results.feedbackHint,
  };

  return followUpStatusText[followUpState] ?? feedbackStatusText[feedbackState];
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

function isFeedbackOptionDisabled({
  feedbackState,
  followUpState,
  recommendationSlug,
}: {
  feedbackState: FeedbackState;
  followUpState: FeedbackFollowUpState;
  recommendationSlug?: string;
}) {
  if (feedbackState === 'saving' || followUpState === 'requesting') return true;
  return !recommendationSlug;
}

function isFollowUpOptionDisabled({
  canRequestFollowUp,
  feedbackState,
  followUpState,
  recommendationSlug,
}: {
  canRequestFollowUp: boolean;
  feedbackState: FeedbackState;
  followUpState: FeedbackFollowUpState;
  recommendationSlug?: string;
}) {
  if (!recommendationSlug) return true;
  if (!canRequestFollowUp) return true;
  if (feedbackState === 'saving') return true;
  return followUpState === 'requesting';
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
        background: 'var(--pc-chip-selected-bg)',
        color: 'var(--pc-chip-selected-text)',
        borderColor: 'var(--pc-chip-selected-bd)',
      }
    : {
        background: 'var(--pc-chip-bg)',
        color: 'var(--pc-chip-text)',
        borderColor: 'var(--pc-chip-bd)',
      };

  return {
    ...baseStyle,
    border: `1px solid ${baseStyle.borderColor}`,
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getFollowUpButtonStyle({ disabled }: { disabled: boolean }) {
  return {
    background: disabled ? 'var(--pc-chip-bg)' : 'var(--pc-chip-selected-bg)',
    border: disabled ? '1px solid var(--pc-chip-bd)' : '1px solid var(--pc-chip-selected-bd)',
    color: disabled ? 'var(--pc-t4)' : 'var(--pc-chip-selected-text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.74rem',
    fontWeight: 700,
  };
}

function FeedbackOptionIcon({ Icon, isBusy }: { Icon: FeedbackOption['icon']; isBusy: boolean }) {
  if (isBusy) return <Loader2 size={12} className="animate-spin" />;
  return <Icon size={12} />;
}

function FeedbackOptionButton({
  feedbackState,
  followUpState,
  option,
  onFeedback,
  recommendationSlug,
  selectedFeedback,
}: {
  feedbackState: FeedbackState;
  followUpState: FeedbackFollowUpState;
  option: FeedbackOption;
  onFeedback: (kind: FeedbackKind) => Promise<void>;
  recommendationSlug?: string;
  selectedFeedback: FeedbackKind | null;
}) {
  const { icon: Icon, kind, label } = option;
  const isSelected = selectedFeedback === kind;
  const isBusy = isFeedbackOptionBusy(feedbackState, isSelected);
  const disabled = isFeedbackOptionDisabled({ feedbackState, followUpState, recommendationSlug });

  return (
    <button
      type="button"
      onClick={() => void onFeedback(kind)}
      disabled={disabled}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors duration-200 active:scale-95 disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={getFeedbackButtonStyle({ disabled, isSelected })}
    >
      <FeedbackOptionIcon Icon={Icon} isBusy={isBusy} />
      {label}
    </button>
  );
}

function FeedbackFollowUpButton({
  activeFollowUp,
  canRequestFollowUp,
  feedbackState,
  followUpState,
  onFollowUp,
  option,
  recommendationSlug,
}: {
  activeFollowUp: FeedbackFollowUpKind | null;
  canRequestFollowUp: boolean;
  feedbackState: FeedbackState;
  followUpState: FeedbackFollowUpState;
  onFollowUp: (kind: FeedbackFollowUpKind) => Promise<void>;
  option: FeedbackFollowUpOption;
  recommendationSlug?: string;
}) {
  const { icon: Icon, kind, label } = option;
  const isBusy = followUpState === 'requesting' && activeFollowUp === kind;
  const disabled = isFollowUpOptionDisabled({
    canRequestFollowUp,
    feedbackState,
    followUpState,
    recommendationSlug,
  });

  return (
    <button
      type="button"
      onClick={() => void onFollowUp(kind)}
      disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 py-2 transition-colors duration-200 active:scale-95 disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={getFollowUpButtonStyle({ disabled })}
    >
      {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  );
}

export function RecommendationFeedbackPanel({
  activeFollowUp,
  canRequestFollowUp,
  feedbackState,
  followUpState,
  isSharedResult,
  onFeedback,
  onFollowUp,
  recommendationSlug,
  selectedFeedback,
  viewerCanRate,
}: {
  activeFollowUp: FeedbackFollowUpKind | null;
  canRequestFollowUp: boolean;
  feedbackState: FeedbackState;
  followUpState: FeedbackFollowUpState;
  isSharedResult: boolean;
  onFeedback: (kind: FeedbackKind) => Promise<void>;
  onFollowUp: (kind: FeedbackFollowUpKind) => Promise<void>;
  recommendationSlug?: string;
  selectedFeedback: FeedbackKind | null;
  viewerCanRate: boolean;
}) {
  const { t } = useLanguage();
  const feedbackOptions = getFeedbackOptions(t.results);
  const followUpOptions = getFollowUpOptions(t.results);

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
      <div className="flex flex-col gap-4">
        <div>
          <p
            className="uppercase tracking-widest"
            style={{ color: 'var(--pc-gold-text)', fontSize: '0.68rem' }}
          >
            {t.results.feedbackPrompt}
          </p>
          <p className="mt-1" style={{ color: 'var(--pc-t4)', fontSize: '0.78rem' }}>
            <FeedbackStatusText
              feedbackState={feedbackState}
              followUpState={followUpState}
              results={t.results}
            />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {feedbackOptions.map((option) => (
            <FeedbackOptionButton
              key={option.kind}
              feedbackState={feedbackState}
              followUpState={followUpState}
              option={option}
              onFeedback={onFeedback}
              recommendationSlug={recommendationSlug}
              selectedFeedback={selectedFeedback}
            />
          ))}
        </div>
        <div
          className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: 'var(--pc-bd2)' }}
        >
          <div>
            <p
              className="uppercase tracking-widest"
              style={{ color: 'var(--pc-t3)', fontSize: '0.66rem' }}
            >
              {t.results.feedbackActionTitle}
            </p>
            <p className="mt-1" style={{ color: 'var(--pc-t4)', fontSize: '0.76rem' }}>
              {t.results.feedbackActionHint}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {followUpOptions.map((option) => (
              <FeedbackFollowUpButton
                key={option.kind}
                activeFollowUp={activeFollowUp}
                canRequestFollowUp={canRequestFollowUp}
                feedbackState={feedbackState}
                followUpState={followUpState}
                onFollowUp={onFollowUp}
                option={option}
                recommendationSlug={recommendationSlug}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
