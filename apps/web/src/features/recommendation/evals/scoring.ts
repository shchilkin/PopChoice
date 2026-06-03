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
import type { ApiResponse } from '../types';

const DEFAULT_MIN_PASSING_SCORE = 85;
const TOTAL_SCORE = 100;
const AUDIENCE_REPRESENTATION_TERMS: Record<RecommendationEvalAudience, string[]> = {
  family: ['family'],
  group: ['both', 'group'],
  solo: ['solo'],
};

function normalizeText(value: string): string {
  return value.toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
}

function normalizeTitle(value: string, year?: number): string {
  const normalized = normalizeText(value);
  return typeof year === 'number' ? `${normalized}|${year}` : normalized;
}

function collectResponseText(response: ApiResponse): string {
  const movieText =
    response.similarMovies
      ?.flatMap((movie) => [movie.name, movie.localizedName, movie.aiDescription])
      .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
      .join(' ') ?? '';
  return normalizeText([response.title, response.description, movieText].join(' '));
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
  const checks: RecommendationEvalCheck[] = [];
  const parsed = apiResponseSchema.safeParse(response);
  checks.push(
    buildCheck(
      'output-shape',
      'Output shape',
      20,
      parsed.success,
      parsed.success
        ? 'Response matches the ApiResponse schema.'
        : parsed.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; '),
    ),
  );

  const candidateTitles = new Set(fixture.candidates.map((movie) => normalizeTitle(movie.name)));
  const allowedMainTitles = new Set(
    fixture.expectations.allowedMainTitles.map((title) => normalizeTitle(title)),
  );
  const responseMovieTitles =
    response.similarMovies?.map((movie) => normalizeTitle(movie.name)) ?? [];
  const mainTitle = normalizeTitle(getMainRecommendationTitle(response));
  const unknownCandidateTitles = responseMovieTitles.filter((title) => !candidateTitles.has(title));
  const minSimilarMovies = fixture.expectations.minSimilarMovies ?? 1;
  const candidateValidityPassed =
    allowedMainTitles.has(mainTitle) &&
    candidateTitles.has(mainTitle) &&
    unknownCandidateTitles.length === 0 &&
    responseMovieTitles.length >= minSimilarMovies;
  checks.push(
    buildCheck(
      'candidate-validity',
      'Candidate validity',
      25,
      candidateValidityPassed,
      candidateValidityPassed
        ? 'Main pick and alternates come from the fixture candidate set.'
        : [
            allowedMainTitles.has(mainTitle) ? null : `main title "${mainTitle}" is not allowed`,
            candidateTitles.has(mainTitle) ? null : `main title "${mainTitle}" is not a candidate`,
            unknownCandidateTitles.length === 0
              ? null
              : `unknown candidates: ${unknownCandidateTitles.join(', ')}`,
            responseMovieTitles.length >= minSimilarMovies
              ? null
              : `expected at least ${minSimilarMovies} similar movies`,
          ]
            .filter((detail): detail is string => typeof detail === 'string')
            .join('; '),
    ),
  );

  const responseText = collectResponseText(response);
  const forbiddenTerms = fixture.expectations.forbiddenTerms ?? [];
  const foundForbiddenTerms = forbiddenTerms.filter((term) =>
    responseText.includes(normalizeText(term)),
  );
  checks.push(
    buildCheck(
      'safety-constraints',
      'Safety constraints',
      20,
      foundForbiddenTerms.length === 0,
      foundForbiddenTerms.length === 0
        ? 'No forbidden safety terms were found in the response.'
        : `Found forbidden terms: ${foundForbiddenTerms.join(', ')}`,
    ),
  );

  const forbiddenTitleKeys = new Set(
    [
      ...(fixture.expectations.forbiddenTitles ?? []).map((title) => normalizeTitle(title)),
      ...fixture.userMemories
        .filter((memory) => memory.kind !== 'liked')
        .map((memory) => normalizeTitle(memory.movieName, memory.movieYear)),
      ...fixture.userMemories
        .filter((memory) => memory.kind !== 'liked')
        .map((memory) => normalizeTitle(memory.movieName)),
    ].filter((title) => title.length > 0),
  );
  const repeatedTitles = [
    normalizeTitle(response.title),
    ...responseMovieTitles,
    ...(response.similarMovies?.map((movie) => normalizeTitle(movie.name, movie.year)) ?? []),
  ].filter((title) => forbiddenTitleKeys.has(title));
  checks.push(
    buildCheck(
      'repeat-avoidance',
      'Repeat avoidance',
      20,
      repeatedTitles.length === 0,
      repeatedTitles.length === 0
        ? 'Response avoids watched, rejected, and explicitly forbidden titles.'
        : `Repeated forbidden titles: ${Array.from(new Set(repeatedTitles)).join(', ')}`,
    ),
  );

  const minDescriptionCharacters = fixture.expectations.minDescriptionCharacters ?? 60;
  const requiredTerms = fixture.expectations.requiredExplanationTerms ?? [];
  const missingExplanationTerms = requiredTerms.filter(
    (term) => !responseText.includes(normalizeText(term)),
  );
  const explanationQualityPassed =
    response.description.trim().length >= minDescriptionCharacters &&
    missingExplanationTerms.length === 0;
  checks.push(
    buildCheck(
      'explanation-quality',
      'Explanation quality',
      15,
      explanationQualityPassed,
      explanationQualityPassed
        ? 'Explanation is specific enough for the fixture expectations.'
        : [
            response.description.trim().length >= minDescriptionCharacters
              ? null
              : `description is shorter than ${minDescriptionCharacters} characters`,
            missingExplanationTerms.length === 0
              ? null
              : `missing terms: ${missingExplanationTerms.join(', ')}`,
          ]
            .filter((detail): detail is string => typeof detail === 'string')
            .join('; '),
    ),
  );

  const audienceTerms = AUDIENCE_REPRESENTATION_TERMS[fixture.audience];
  checks.push(
    buildCheck(
      'scenario-audience-representation',
      'Scenario audience representation',
      0,
      textIncludesAnyTerm(responseText, audienceTerms),
      textIncludesAnyTerm(responseText, audienceTerms)
        ? `Response represents the ${fixture.audience} audience.`
        : `Expected response text to include one of: ${audienceTerms.join(', ')}`,
    ),
  );

  const depthResult = getScenarioDepthResult(fixture.depth, fixture, response, responseText);
  checks.push(
    buildCheck(
      'scenario-depth-representation',
      'Scenario depth representation',
      0,
      depthResult.passed,
      depthResult.details,
    ),
  );

  const sourceResult = getScenarioSourceStrategyResult(fixture.sourceStrategy, response);
  checks.push(
    buildCheck(
      'scenario-source-strategy-representation',
      'Scenario source strategy representation',
      0,
      sourceResult.passed,
      sourceResult.details,
    ),
  );

  const qualityThresholdResult = getQualityThresholdResult(fixture, response);
  checks.push(
    buildCheck(
      'scenario-quality-thresholds',
      'Scenario quality thresholds',
      0,
      qualityThresholdResult.passed,
      qualityThresholdResult.details,
    ),
  );

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
    score,
    sourceDistribution:
      response.candidateSourceDistribution ?? summarizeCandidateSources(response.similarMovies),
  };
}

function getScenarioDepthResult(
  depth: RecommendationEvalDepth,
  fixture: RecommendationEvalFixture,
  response: ApiResponse,
  responseText: string,
): { details: string; passed: boolean } {
  const minDescriptionCharacters = fixture.expectations.minDescriptionCharacters ?? 60;

  if (depth === 'focused') {
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

  if (depth === 'memory-aware') {
    const passed = responseText.includes('avoid');
    return {
      details: passed
        ? 'Memory-aware scenario explicitly acknowledges repeat avoidance.'
        : 'Expected memory-aware response text to mention avoiding repeat or rejected movies.',
      passed,
    };
  }

  const passed = responseText.includes('both');
  return {
    details: passed
      ? 'Compromise scenario explains the pick in terms of both viewers.'
      : 'Expected compromise response text to explain why the pick works for both viewers.',
    passed,
  };
}

function getScenarioSourceStrategyResult(
  sourceStrategy: RecommendationEvalSourceStrategy,
  response: ApiResponse,
): { details: string; passed: boolean } {
  const distribution =
    response.candidateSourceDistribution ?? summarizeCandidateSources(response.similarMovies);
  const curatedCount = distribution?.curated ?? 0;
  const localCacheCount = distribution?.['local-cache'] ?? 0;
  const tmdbCount = (distribution?.['tmdb-discover'] ?? 0) + (distribution?.['tmdb-search'] ?? 0);
  const totalCount = Object.values(distribution ?? {}).reduce((sum, count) => sum + count, 0);

  if (sourceStrategy === 'curated-showcase') {
    const passed =
      totalCount > 0 && curatedCount === totalCount && response.usedBroaderSearch !== true;
    return {
      details: passed
        ? 'Result stays within curated showcase candidates.'
        : 'Expected curated-only candidates without TMDB broadening.',
      passed,
    };
  }

  if (sourceStrategy === 'hybrid-fast') {
    const passed =
      localCacheCount + curatedCount > 0 && tmdbCount > 0 && response.usedBroaderSearch === true;
    return {
      details: passed
        ? 'Result mixes local/cache candidates with bounded TMDB fallback candidates.'
        : 'Expected a hybrid source mix with local/cache candidates and TMDB fallback candidates.',
      passed,
    };
  }

  const passed = tmdbCount > 0 && tmdbCount >= localCacheCount + curatedCount;
  return {
    details: passed
      ? 'Result prioritizes TMDB discovery/search candidates.'
      : 'Expected TMDB-first candidate distribution to dominate local/cache candidates.',
    passed,
  };
}

function getQualityThresholdResult(
  fixture: RecommendationEvalFixture,
  response: ApiResponse,
): { details: string; passed: boolean } {
  const distribution =
    response.candidateSourceDistribution ?? summarizeCandidateSources(response.similarMovies);
  const minSources = fixture.expectations.minCandidateSources ?? {};
  const missingSourceThresholds = Object.entries(minSources).flatMap(([source, minCount]) => {
    const actualCount = distribution?.[source as keyof typeof distribution] ?? 0;
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
