import { summarizeCandidateSources } from '../candidateSources';
import { apiResponseSchema } from '../types';

import type {
  RecommendationEvalAudience,
  RecommendationEvalCheck,
  RecommendationEvalDepth,
  RecommendationEvalFixture,
  RecommendationEvalReport,
  RecommendationEvalResult,
  RecommendationEvalRunMode,
  RecommendationEvalSourceStrategy,
} from './types';
import type { ApiResponse, CandidateSourceDistribution } from '../types';

const DEFAULT_MIN_PASSING_SCORE = 85;
const TOTAL_SCORE = 100;
const AUDIENCE_REPRESENTATION_TERMS: Record<RecommendationEvalAudience, string[]> = {
  family: ['family'],
  group: ['both', 'group'],
  solo: ['solo'],
};

type ScenarioResult = { details: string; passed: boolean };

type ScoringContext = {
  fixture: RecommendationEvalFixture;
  mainTitle: string;
  response: ApiResponse;
  responseCandidateText: string;
  responseMovieTitles: string[];
  responseText: string;
  sourceDistribution: CandidateSourceDistribution;
};

type SourceCounts = {
  curatedCount: number;
  localCacheCount: number;
  tmdbCount: number;
  totalCount: number;
};

type CandidateValidityState = {
  mainTitle: string;
  mainTitleAllowed: boolean;
  mainTitleIsCandidate: boolean;
  minSimilarMovies: number;
  responseMovieTitles: string[];
  unknownCandidateTitles: string[];
};

type CandidateSourceKey = keyof NonNullable<CandidateSourceDistribution>;

function normalizeText(value: string): string {
  return value.toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
}

function normalizeTitle(value: string, year?: number): string {
  const normalized = normalizeText(value);
  return typeof year === 'number' ? `${normalized}|${year}` : normalized;
}

function collectResponseText(response: ApiResponse): string {
  return normalizeText(
    [response.title, response.description, collectResponseCandidateText(response)].join(' '),
  );
}

function collectResponseCandidateText(response: ApiResponse): string {
  const movieText =
    response.similarMovies
      ?.flatMap((movie) => [movie.name, movie.localizedName, movie.aiDescription])
      .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
      .join(' ') ?? '';
  return normalizeText([response.title, movieText].join(' '));
}

function textIncludesAnyTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function getMainRecommendationTitle(response: ApiResponse): string {
  return (
    response.similarMovies?.find((movie) => movie.isMainRecommendation)?.name ?? response.title
  );
}

function buildCheck(
  id: string,
  label: string,
  maxScore: number,
  passed: boolean,
  details: string,
): RecommendationEvalCheck {
  return {
    details,
    id,
    label,
    maxScore,
    passed,
    score: passed ? maxScore : 0,
  };
}

export function scoreRecommendationEvalFixture(
  fixture: RecommendationEvalFixture,
  response: ApiResponse,
  mode: RecommendationEvalRunMode = 'mock',
): RecommendationEvalResult {
  const context = buildScoringContext(fixture, response);
  const checks = buildRecommendationEvalChecks(context);
  const score = checks.reduce((sum, check) => sum + check.score, 0);
  const minPassingScore = fixture.expectations.minPassingScore ?? DEFAULT_MIN_PASSING_SCORE;

  return {
    checks,
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    maxScore: TOTAL_SCORE,
    minPassingScore,
    mode,
    passed: score >= minPassingScore && checks.every((check) => check.passed),
    response,
    score,
    sourceDistribution: context.sourceDistribution,
  };
}

function buildScoringContext(
  fixture: RecommendationEvalFixture,
  response: ApiResponse,
): ScoringContext {
  return {
    fixture,
    mainTitle: normalizeTitle(getMainRecommendationTitle(response)),
    response,
    responseCandidateText: collectResponseCandidateText(response),
    responseMovieTitles: response.similarMovies?.map((movie) => normalizeTitle(movie.name)) ?? [],
    responseText: collectResponseText(response),
    sourceDistribution: getResponseSourceDistribution(response),
  };
}

function getResponseSourceDistribution(response: ApiResponse): CandidateSourceDistribution {
  return response.candidateSourceDistribution ?? summarizeCandidateSources(response.similarMovies);
}

function buildRecommendationEvalChecks(context: ScoringContext): RecommendationEvalCheck[] {
  return [
    buildOutputShapeCheck(context.response),
    buildCandidateValidityCheck(context),
    buildSafetyConstraintsCheck(context),
    buildRepeatAvoidanceCheck(context),
    buildExplanationQualityCheck(context),
    buildScenarioAudienceCheck(context),
    buildScenarioDepthCheck(context),
    buildScenarioSourceStrategyCheck(context),
    buildQualityThresholdCheck(context),
    buildTasteControlHardAvoidsCheck(context),
    buildTasteControlDiscoveryCheck(context),
    buildTasteControlOptionalReferenceCheck(context),
    buildTasteControlFeedbackMemoryCheck(context),
  ];
}

function buildOutputShapeCheck(response: ApiResponse): RecommendationEvalCheck {
  const parsed = apiResponseSchema.safeParse(response);

  return buildCheck(
    'output-shape',
    'Output shape',
    20,
    parsed.success,
    parsed.success
      ? 'Response matches the ApiResponse schema.'
      : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
  );
}

function buildCandidateValidityCheck({
  fixture,
  mainTitle,
  responseMovieTitles,
}: ScoringContext): RecommendationEvalCheck {
  const state = getCandidateValidityState({ fixture, mainTitle, responseMovieTitles });
  const passed = isCandidateValidityPassed(state);

  return buildCheck(
    'candidate-validity',
    'Candidate validity',
    25,
    passed,
    passed
      ? 'Main pick and alternates come from the fixture candidate set.'
      : getCandidateValidityFailureDetails(state),
  );
}

function getCandidateValidityState({
  fixture,
  mainTitle,
  responseMovieTitles,
}: {
  fixture: RecommendationEvalFixture;
  mainTitle: string;
  responseMovieTitles: string[];
}): CandidateValidityState {
  const candidateTitles = new Set(fixture.candidates.map((movie) => normalizeTitle(movie.name)));
  const allowedMainTitles = new Set(
    fixture.expectations.allowedMainTitles.map((title) => normalizeTitle(title)),
  );

  return {
    mainTitle,
    mainTitleAllowed: allowedMainTitles.has(mainTitle),
    mainTitleIsCandidate: candidateTitles.has(mainTitle),
    minSimilarMovies: fixture.expectations.minSimilarMovies ?? 1,
    responseMovieTitles,
    unknownCandidateTitles: responseMovieTitles.filter((title) => !candidateTitles.has(title)),
  };
}

function isCandidateValidityPassed(state: CandidateValidityState): boolean {
  return (
    state.mainTitleAllowed &&
    state.mainTitleIsCandidate &&
    state.unknownCandidateTitles.length === 0 &&
    state.responseMovieTitles.length >= state.minSimilarMovies
  );
}

function getCandidateValidityFailureDetails(state: CandidateValidityState): string {
  const details: string[] = [];

  if (!state.mainTitleAllowed) details.push(`main title "${state.mainTitle}" is not allowed`);
  if (!state.mainTitleIsCandidate) {
    details.push(`main title "${state.mainTitle}" is not a candidate`);
  }
  if (state.unknownCandidateTitles.length > 0) {
    details.push(`unknown candidates: ${state.unknownCandidateTitles.join(', ')}`);
  }
  if (state.responseMovieTitles.length < state.minSimilarMovies) {
    details.push(`expected at least ${state.minSimilarMovies} similar movies`);
  }

  return details.join('; ');
}

function buildSafetyConstraintsCheck({
  fixture,
  responseText,
}: ScoringContext): RecommendationEvalCheck {
  const forbiddenTerms = fixture.expectations.forbiddenTerms ?? [];
  const foundForbiddenTerms = forbiddenTerms.filter((term) =>
    responseText.includes(normalizeText(term)),
  );

  return buildCheck(
    'safety-constraints',
    'Safety constraints',
    20,
    foundForbiddenTerms.length === 0,
    foundForbiddenTerms.length === 0
      ? 'No forbidden safety terms were found in the response.'
      : `Found forbidden terms: ${foundForbiddenTerms.join(', ')}`,
  );
}

function buildRepeatAvoidanceCheck({
  fixture,
  response,
  responseMovieTitles,
}: ScoringContext): RecommendationEvalCheck {
  const forbiddenTitleKeys = getForbiddenTitleKeys(fixture);
  const repeatedTitles = [
    normalizeTitle(response.title),
    ...responseMovieTitles,
    ...(response.similarMovies?.map((movie) => normalizeTitle(movie.name, movie.year)) ?? []),
  ].filter((title) => forbiddenTitleKeys.has(title));

  return buildCheck(
    'repeat-avoidance',
    'Repeat avoidance',
    20,
    repeatedTitles.length === 0,
    repeatedTitles.length === 0
      ? 'Response avoids watched, rejected, and explicitly forbidden titles.'
      : `Repeated forbidden titles: ${Array.from(new Set(repeatedTitles)).join(', ')}`,
  );
}

function getForbiddenTitleKeys(fixture: RecommendationEvalFixture): Set<string> {
  const nonLikedMemories = fixture.userMemories.filter((memory) => memory.kind !== 'liked');
  const forbiddenTitles = [
    ...(fixture.expectations.forbiddenTitles ?? []).map((title) => normalizeTitle(title)),
    ...nonLikedMemories.map((memory) => normalizeTitle(memory.movieName, memory.movieYear)),
    ...nonLikedMemories.map((memory) => normalizeTitle(memory.movieName)),
  ].filter((title) => title.length > 0);

  return new Set(forbiddenTitles);
}

function buildExplanationQualityCheck({
  fixture,
  response,
  responseText,
}: ScoringContext): RecommendationEvalCheck {
  const minDescriptionCharacters = fixture.expectations.minDescriptionCharacters ?? 60;
  const requiredTerms = fixture.expectations.requiredExplanationTerms ?? [];
  const missingExplanationTerms = requiredTerms.filter(
    (term) => !responseText.includes(normalizeText(term)),
  );
  const explanationQualityPassed =
    response.description.trim().length >= minDescriptionCharacters &&
    missingExplanationTerms.length === 0;

  return buildCheck(
    'explanation-quality',
    'Explanation quality',
    15,
    explanationQualityPassed,
    explanationQualityPassed
      ? 'Explanation is specific enough for the fixture expectations.'
      : joinFailureDetails([
          response.description.trim().length >= minDescriptionCharacters
            ? null
            : `description is shorter than ${minDescriptionCharacters} characters`,
          missingExplanationTerms.length === 0
            ? null
            : `missing terms: ${missingExplanationTerms.join(', ')}`,
        ]),
  );
}

function buildScenarioAudienceCheck({
  fixture,
  responseText,
}: ScoringContext): RecommendationEvalCheck {
  const audienceTerms = AUDIENCE_REPRESENTATION_TERMS[fixture.audience];
  const passed = textIncludesAnyTerm(responseText, audienceTerms);

  return buildCheck(
    'scenario-audience-representation',
    'Scenario audience representation',
    0,
    passed,
    passed
      ? `Response represents the ${fixture.audience} audience.`
      : `Expected response text to include one of: ${audienceTerms.join(', ')}`,
  );
}

function buildScenarioDepthCheck(context: ScoringContext): RecommendationEvalCheck {
  const depthResult = getScenarioDepthResult(context);

  return buildCheck(
    'scenario-depth-representation',
    'Scenario depth representation',
    0,
    depthResult.passed,
    depthResult.details,
  );
}

function buildScenarioSourceStrategyCheck(context: ScoringContext): RecommendationEvalCheck {
  const sourceResult = getScenarioSourceStrategyResult(context);

  return buildCheck(
    'scenario-source-strategy-representation',
    'Scenario source strategy representation',
    0,
    sourceResult.passed,
    sourceResult.details,
  );
}

function buildQualityThresholdCheck(context: ScoringContext): RecommendationEvalCheck {
  const qualityThresholdResult = getQualityThresholdResult(context);

  return buildCheck(
    'scenario-quality-thresholds',
    'Scenario quality thresholds',
    0,
    qualityThresholdResult.passed,
    qualityThresholdResult.details,
  );
}

function joinFailureDetails(details: Array<string | null>): string {
  return details.filter((detail): detail is string => typeof detail === 'string').join('; ');
}

const DEPTH_RESULT_BUILDERS: Record<
  RecommendationEvalDepth,
  (context: ScoringContext) => ScenarioResult
> = {
  compromise: getCompromiseDepthResult,
  focused: getFocusedDepthResult,
  'memory-aware': getMemoryAwareDepthResult,
};

function getScenarioDepthResult(context: ScoringContext): ScenarioResult {
  return DEPTH_RESULT_BUILDERS[context.fixture.depth](context);
}

function getFocusedDepthResult({ fixture, response }: ScoringContext): ScenarioResult {
  const minDescriptionCharacters = fixture.expectations.minDescriptionCharacters ?? 60;
  const minSimilarMovies = fixture.expectations.minSimilarMovies ?? 1;
  const passed =
    response.description.trim().length >= minDescriptionCharacters &&
    (response.similarMovies?.length ?? 0) >= minSimilarMovies;

  return {
    details: passed
      ? 'Focused scenario includes a concise rationale and enough ranked candidates.'
      : `Expected description of at least ${minDescriptionCharacters} characters and ${minSimilarMovies} similar movies.`,
    passed,
  };
}

function getMemoryAwareDepthResult({ responseText }: ScoringContext): ScenarioResult {
  const passed = responseText.includes('avoid');

  return {
    details: passed
      ? 'Memory-aware scenario explicitly acknowledges repeat avoidance.'
      : 'Expected memory-aware response text to mention avoiding repeat or rejected movies.',
    passed,
  };
}

function getCompromiseDepthResult({ responseText }: ScoringContext): ScenarioResult {
  const passed = responseText.includes('both');

  return {
    details: passed
      ? 'Compromise scenario explains the pick in terms of both viewers.'
      : 'Expected compromise response text to explain why the pick works for both viewers.',
    passed,
  };
}

const SOURCE_STRATEGY_RESULT_BUILDERS: Record<
  RecommendationEvalSourceStrategy,
  (context: ScoringContext, counts: SourceCounts) => ScenarioResult
> = {
  'curated-showcase': getCuratedShowcaseSourceResult,
  'hybrid-fast': getHybridFastSourceResult,
  'tmdb-first': getTMDBFirstSourceResult,
};

function getScenarioSourceStrategyResult(context: ScoringContext): ScenarioResult {
  return SOURCE_STRATEGY_RESULT_BUILDERS[context.fixture.sourceStrategy](
    context,
    getSourceCounts(context.sourceDistribution),
  );
}

function getSourceCounts(distribution: CandidateSourceDistribution): SourceCounts {
  const curatedCount = getSourceCount(distribution, 'curated');
  const localCacheCount = getSourceCount(distribution, 'local-cache');
  const tmdbCount =
    getSourceCount(distribution, 'tmdb-discover') + getSourceCount(distribution, 'tmdb-search');

  return {
    curatedCount,
    localCacheCount,
    tmdbCount,
    totalCount: Object.values(distribution ?? {}).reduce((sum, count) => sum + count, 0),
  };
}

function getSourceCount(
  distribution: CandidateSourceDistribution,
  source: CandidateSourceKey,
): number {
  return distribution?.[source] ?? 0;
}

function getCuratedShowcaseSourceResult(
  { response }: ScoringContext,
  { curatedCount, totalCount }: SourceCounts,
): ScenarioResult {
  const passed =
    totalCount > 0 && curatedCount === totalCount && response.usedBroaderSearch !== true;

  return {
    details: passed
      ? 'Result stays within curated showcase candidates.'
      : 'Expected curated-only candidates without TMDB broadening.',
    passed,
  };
}

function getHybridFastSourceResult(
  { response }: ScoringContext,
  { curatedCount, localCacheCount, tmdbCount }: SourceCounts,
): ScenarioResult {
  const passed =
    localCacheCount + curatedCount > 0 && tmdbCount > 0 && response.usedBroaderSearch === true;

  return {
    details: passed
      ? 'Result mixes local/cache candidates with bounded TMDB fallback candidates.'
      : 'Expected a hybrid source mix with local/cache candidates and TMDB fallback candidates.',
    passed,
  };
}

function getTMDBFirstSourceResult(
  _context: ScoringContext,
  { curatedCount, localCacheCount, tmdbCount }: SourceCounts,
): ScenarioResult {
  const passed = tmdbCount > 0 && tmdbCount >= localCacheCount + curatedCount;

  return {
    details: passed
      ? 'Result prioritizes TMDB discovery/search candidates.'
      : 'Expected TMDB-first candidate distribution to dominate local/cache candidates.',
    passed,
  };
}

function getQualityThresholdResult({
  fixture,
  response,
  sourceDistribution,
}: ScoringContext): ScenarioResult {
  const minSources = fixture.expectations.minCandidateSources ?? {};
  const missingSourceThresholds = Object.entries(minSources).flatMap(([source, minCount]) => {
    const actualCount = sourceDistribution?.[source as keyof typeof sourceDistribution] ?? 0;
    return actualCount >= minCount
      ? []
      : [`${source}: expected at least ${minCount}, got ${actualCount}`];
  });

  const minMetadataComplete = fixture.expectations.minMetadataCompleteCandidates ?? 0;
  const metadataCompleteCount =
    response.similarMovies?.filter(
      (movie) =>
        movie.name.trim().length > 0 &&
        movie.year > 0 &&
        movie.duration > 0 &&
        movie.score_rating > 0 &&
        movie.age_rating.trim().length > 0 &&
        typeof movie.metadataQualityScore === 'number' &&
        movie.metadataQualityScore >= 70,
    ).length ?? 0;
  const metadataPassed = metadataCompleteCount >= minMetadataComplete;

  const passed = missingSourceThresholds.length === 0 && metadataPassed;
  return {
    details: passed
      ? 'Candidate source and metadata thresholds are satisfied.'
      : [
          ...missingSourceThresholds,
          metadataPassed
            ? null
            : `metadata-complete candidates: expected at least ${minMetadataComplete}, got ${metadataCompleteCount}`,
        ]
          .filter((detail): detail is string => typeof detail === 'string')
          .join('; '),
    passed,
  };
}

function buildTasteControlHardAvoidsCheck({
  fixture,
  response,
  responseCandidateText,
}: ScoringContext): RecommendationEvalCheck {
  const tasteControl = fixture.expectations.tasteControl;
  const hardAvoidTerms = tasteControl?.hardAvoidTerms ?? [];
  const maxRuntimeMinutes = tasteControl?.maxRuntimeMinutes;
  const foundHardAvoidTerms = getFoundHardAvoidTerms(hardAvoidTerms, responseCandidateText);
  const overRuntimeMovies = getOverRuntimeMovies(response, maxRuntimeMinutes);
  const passed = foundHardAvoidTerms.length === 0 && overRuntimeMovies.length === 0;

  return buildCheck(
    'taste-control-hard-avoids',
    'Taste control: hard avoids',
    0,
    passed,
    getHardAvoidDetails({
      foundHardAvoidTerms,
      hardAvoidTerms,
      maxRuntimeMinutes,
      overRuntimeMovies,
      passed,
    }),
  );
}

function getFoundHardAvoidTerms(hardAvoidTerms: string[], responseCandidateText: string): string[] {
  return hardAvoidTerms.filter((term) => responseCandidateText.includes(normalizeText(term)));
}

function getOverRuntimeMovies(
  response: ApiResponse,
  maxRuntimeMinutes: number | undefined,
): string[] {
  if (typeof maxRuntimeMinutes !== 'number') return [];

  return (
    response.similarMovies
      ?.filter((movie) => movie.duration > maxRuntimeMinutes)
      .map((movie) => `${movie.name} (${movie.duration}m)`) ?? []
  );
}

function getHardAvoidDetails({
  foundHardAvoidTerms,
  hardAvoidTerms,
  maxRuntimeMinutes,
  overRuntimeMovies,
  passed,
}: {
  foundHardAvoidTerms: string[];
  hardAvoidTerms: string[];
  maxRuntimeMinutes: number | undefined;
  overRuntimeMovies: string[];
  passed: boolean;
}): string {
  if (!passed) {
    return joinFailureDetails([
      foundHardAvoidTerms.length === 0
        ? null
        : `candidate text includes hard avoids: ${foundHardAvoidTerms.join(', ')}`,
      overRuntimeMovies.length === 0
        ? null
        : `runtime over ${maxRuntimeMinutes}m: ${overRuntimeMovies.join(', ')}`,
    ]);
  }

  return hardAvoidTerms.length > 0 || typeof maxRuntimeMinutes === 'number'
    ? 'Recommended candidates respect explicit hard avoids and runtime constraints.'
    : 'No explicit taste-control hard avoids configured for this fixture.';
}

function buildTasteControlDiscoveryCheck({
  fixture,
  responseText,
}: ScoringContext): RecommendationEvalCheck {
  const appetite = fixture.expectations.tasteControl?.discoveryAppetite;
  const passed = !appetite || responseText.includes(normalizeText(appetite));

  return buildCheck(
    'taste-control-discovery-appetite',
    'Taste control: discovery appetite',
    0,
    passed,
    passed
      ? appetite
        ? `Response represents the ${appetite} discovery appetite.`
        : 'No discovery appetite expectation configured for this fixture.'
      : `Expected response text to represent discovery appetite: ${appetite}.`,
  );
}

function buildTasteControlOptionalReferenceCheck({
  fixture,
  responseText,
}: ScoringContext): RecommendationEvalCheck {
  const expectsOptionalReference =
    fixture.expectations.tasteControl?.optionalReferenceMovie === true;
  const allReferenceMoviesBlank = fixture.people.every(
    (person) => person.favoriteMovie.trim().length === 0,
  );
  const mentionsMissingReference =
    responseText.includes('favorite movie') || responseText.includes('reference movie');
  const passed =
    !expectsOptionalReference || (allReferenceMoviesBlank && !mentionsMissingReference);

  return buildCheck(
    'taste-control-optional-reference',
    'Taste control: optional reference movie',
    0,
    passed,
    passed
      ? expectsOptionalReference
        ? 'Fixture runs with no reference movie and the response does not ask for one.'
        : 'No optional-reference expectation configured for this fixture.'
      : joinFailureDetails([
          allReferenceMoviesBlank ? null : 'expected all favoriteMovie fields to be blank',
          mentionsMissingReference ? 'response still leans on a missing reference movie' : null,
        ]),
  );
}

function buildTasteControlFeedbackMemoryCheck({
  fixture,
  responseText,
}: ScoringContext): RecommendationEvalCheck {
  const expectedKinds = fixture.expectations.tasteControl?.feedbackMemoryKinds ?? [];
  const actualKinds = new Set(fixture.userMemories.map((memory) => memory.kind));
  const missingKinds = expectedKinds.filter((kind) => !actualKinds.has(kind));
  const responseMentionsAvoidance = responseText.includes('avoid');
  const passed =
    missingKinds.length === 0 && (expectedKinds.length === 0 || responseMentionsAvoidance);

  return buildCheck(
    'taste-control-feedback-memory',
    'Taste control: feedback memory',
    0,
    passed,
    passed
      ? expectedKinds.length > 0
        ? `Fixture covers feedback memory kinds: ${expectedKinds.join(', ')}.`
        : 'No feedback-memory expectation configured for this fixture.'
      : joinFailureDetails([
          missingKinds.length === 0
            ? null
            : `missing feedback memory kinds: ${missingKinds.join(', ')}`,
          responseMentionsAvoidance
            ? null
            : 'expected response text to mention avoiding feedback-memory repeats',
        ]),
  );
}

export function buildRecommendationEvalReport(
  results: RecommendationEvalResult[],
  mode: RecommendationEvalRunMode,
  generatedAt = new Date().toISOString(),
): RecommendationEvalReport {
  const failed = results.filter((result) => !result.passed).length;
  const sourceDistribution = summarizeEvalSourceDistribution(results);

  return {
    generatedAt,
    maxScore: TOTAL_SCORE,
    minPassingScore: DEFAULT_MIN_PASSING_SCORE,
    mode,
    passed: failed === 0,
    results,
    sourceDistribution,
    summary: {
      failed,
      fixtureCount: results.length,
      passed: results.length - failed,
    },
  };
}

function summarizeEvalSourceDistribution(
  results: RecommendationEvalResult[],
): RecommendationEvalReport['sourceDistribution'] {
  const distribution: NonNullable<RecommendationEvalReport['sourceDistribution']> = {};

  for (const result of results) {
    for (const [source, count] of Object.entries(result.sourceDistribution ?? {})) {
      const candidateSource = source as keyof typeof distribution;
      distribution[candidateSource] = (distribution[candidateSource] ?? 0) + count;
    }
  }

  return distribution;
}
