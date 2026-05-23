import { apiResponseSchema } from '../types';

import type {
  RecommendationEvalCheck,
  RecommendationEvalFixture,
  RecommendationEvalReport,
  RecommendationEvalResult,
  RecommendationEvalRunMode,
} from './types';
import type { ApiResponse } from '../types';

const DEFAULT_MIN_PASSING_SCORE = 85;
const TOTAL_SCORE = 100;

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
  };
}

export function buildRecommendationEvalReport(
  results: RecommendationEvalResult[],
  mode: RecommendationEvalRunMode,
  generatedAt = new Date().toISOString(),
): RecommendationEvalReport {
  const failed = results.filter((result) => !result.passed).length;

  return {
    generatedAt,
    maxScore: TOTAL_SCORE,
    minPassingScore: DEFAULT_MIN_PASSING_SCORE,
    mode,
    passed: failed === 0,
    results,
    summary: {
      failed,
      fixtureCount: results.length,
      passed: results.length - failed,
    },
  };
}
