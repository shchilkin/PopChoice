import type { RecommendationResultSignals } from '@/lib/db/recommendations';
import type { Translations } from '@/i18n/locales/en';
import type { MovieRecommendation } from '@/utils/client';

type ResultsCopy = Translations['results'];

export type ResultEvidenceItem = {
  label: string;
  value: string;
};

export type ResultEvidenceViewModel = {
  consideredSignals: ResultEvidenceItem[];
  fitSignals: ResultEvidenceItem[];
};

const AVOID_SIGNAL_KEYS = {
  gore: ['gore'],
  horror: ['horror'],
  long: ['long runtime', 'too long', 'long'],
  repeat: ['already-seen', 'already seen', 'seen movies', 'repeat'],
  slow: ['slow pacing', 'slow'],
  subtitles: ['subtitles', 'subtitle'],
} as const;

function firstValues(values: string[] | undefined, count = 2): string {
  return (values ?? []).slice(0, count).join(', ');
}

function hasAvoidSignal(signals: string[], needles: readonly string[]): boolean {
  return signals.some((signal) => {
    const normalized = signal.toLocaleLowerCase();
    return needles.some((needle) => normalized.includes(needle));
  });
}

function getAvoidSignalLabels(signals: string[], copy: ResultsCopy): string[] {
  const options = [
    { keys: AVOID_SIGNAL_KEYS.horror, label: copy.evidenceAvoidHorror },
    { keys: AVOID_SIGNAL_KEYS.gore, label: copy.evidenceAvoidGore },
    { keys: AVOID_SIGNAL_KEYS.slow, label: copy.evidenceAvoidSlow },
    { keys: AVOID_SIGNAL_KEYS.long, label: copy.evidenceAvoidLong },
    { keys: AVOID_SIGNAL_KEYS.subtitles, label: copy.evidenceAvoidSubtitles },
    { keys: AVOID_SIGNAL_KEYS.repeat, label: copy.evidenceAvoidRepeat },
  ];

  return options
    .filter((option) => hasAvoidSignal(signals, option.keys))
    .map((option) => option.label);
}

function addSignal(items: ResultEvidenceItem[], label: string, value: string | undefined) {
  if (!value) return;
  items.push({ label, value });
}

function buildFitSignals({
  copy,
  isGroupResult,
  movie,
  resultSignals,
}: {
  copy: ResultsCopy;
  isGroupResult: boolean;
  movie: MovieRecommendation;
  resultSignals?: RecommendationResultSignals;
}): ResultEvidenceItem[] {
  const fitSignals: ResultEvidenceItem[] = [];

  addSignal(fitSignals, copy.evidenceMoodLabel, firstValues(resultSignals?.moodSignals));
  addSignal(fitSignals, copy.evidenceToneLabel, firstValues(resultSignals?.toneSignals));
  addSignal(fitSignals, copy.evidenceEraLabel, firstValues(resultSignals?.eraSignals));
  addSignal(fitSignals, copy.evidenceActorLabel, firstValues(resultSignals?.actorSignals, 1));
  addSignal(
    fitSignals,
    copy.evidenceReferenceLabel,
    resultSignals?.hasReferenceMovie ? copy.evidenceReferenceValue : undefined,
  );

  fitSignals.push({
    label: copy.evidenceMatchLabel,
    value: copy.evidenceMatchValue.replace(
      '{pct}',
      new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(movie.similarity * 100),
    ),
  });

  if (isGroupResult) {
    fitSignals.push({ label: copy.evidenceGroupLabel, value: copy.evidenceGroupValue });
  }

  const visibleSignals = fitSignals.slice(0, 5);
  const groupSignal = fitSignals.find((item) => item.label === copy.evidenceGroupLabel);
  if (groupSignal && !visibleSignals.includes(groupSignal)) {
    visibleSignals[visibleSignals.length - 1] = groupSignal;
  }

  return visibleSignals;
}

function getRuntimeSignal(
  movie: MovieRecommendation,
  copy: ResultsCopy,
): ResultEvidenceItem | null {
  if (!movie.duration || movie.duration <= 0) return null;
  const value =
    movie.duration <= 125 ? copy.evidenceRuntimeShortValue : copy.evidenceRuntimeCheckedValue;

  return {
    label: copy.evidenceRuntimeLabel,
    value: value.replace('{minutes}', String(movie.duration)),
  };
}

function buildConsideredSignals({
  copy,
  movie,
  resultSignals,
  usedBroaderSearch,
}: {
  copy: ResultsCopy;
  movie: MovieRecommendation;
  resultSignals?: RecommendationResultSignals;
  usedBroaderSearch: boolean;
}): ResultEvidenceItem[] {
  const consideredSignals: ResultEvidenceItem[] = [];
  const avoidLabels = getAvoidSignalLabels(resultSignals?.avoidSignals ?? [], copy);

  addSignal(
    consideredSignals,
    copy.evidenceAvoidLabel,
    avoidLabels.length > 0 ? avoidLabels.join(', ') : undefined,
  );

  const runtimeSignal = getRuntimeSignal(movie, copy);
  if (runtimeSignal) consideredSignals.push(runtimeSignal);

  addSignal(consideredSignals, copy.evidenceRatingLabel, movie.age_rating);

  consideredSignals.push({
    label: copy.evidenceRepeatLabel,
    value: copy.evidenceRepeatValue,
  });

  consideredSignals.push({
    label: copy.evidenceSourceLabel,
    value: usedBroaderSearch ? copy.evidenceSourceTmdbValue : copy.evidenceSourceLocalValue,
  });

  return consideredSignals.slice(0, 5);
}

export function buildResultEvidenceViewModel({
  copy,
  isGroupResult,
  movie,
  resultSignals,
  usedBroaderSearch,
}: {
  copy: ResultsCopy;
  isGroupResult: boolean;
  movie: MovieRecommendation;
  resultSignals?: RecommendationResultSignals;
  usedBroaderSearch: boolean;
}): ResultEvidenceViewModel {
  return {
    consideredSignals: buildConsideredSignals({
      copy,
      movie,
      resultSignals,
      usedBroaderSearch,
    }),
    fitSignals: buildFitSignals({ copy, isGroupResult, movie, resultSignals }),
  };
}
