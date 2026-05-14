export const RECOMMENDATION_STAGES = [
  'queued',
  'preparing',
  'embedding',
  'local-search',
  'tmdb-search',
  'ai-ranking',
  'posters',
  'descriptions',
  'complete',
  'failed',
] as const;

export type RecommendationStage = (typeof RECOMMENDATION_STAGES)[number];

export const RECOMMENDATION_PROGRESS_STAGES = RECOMMENDATION_STAGES.filter(
  (stage): stage is Exclude<RecommendationStage, 'failed'> => stage !== 'failed',
);

export function getRecommendationStageProgress(
  stage: RecommendationStage | null | undefined,
): number {
  if (!stage) return 0;
  if (stage === 'failed' || stage === 'complete') return 100;

  const index = RECOMMENDATION_PROGRESS_STAGES.indexOf(stage);
  if (index < 0) return 0;

  return Math.round(((index + 1) / RECOMMENDATION_PROGRESS_STAGES.length) * 100);
}
