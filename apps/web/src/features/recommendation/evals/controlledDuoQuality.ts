import { getRecommendation } from '../recommendation';
import { personFormDataSchema, recommendationResponseSchema } from '../types';

import type { EnhancedMovieMatch, PersonFormData } from '../types';

type ControlledDuoResponse = {
  description: string;
  title: string;
};

type ControlledDuoCandidate = EnhancedMovieMatch & {
  genres: string[];
  isBridgePick: boolean;
  profileSignals: {
    alex: string[];
    sam: string[];
  };
  sourceUrl: string;
};

export type ControlledDuoQualityCheck = {
  details: string;
  id: string;
  label: string;
  passed: boolean;
};

export type ControlledDuoQualityReport = {
  automatedChecksPassed: boolean | null;
  generatedAt: string;
  manualReviewQuestions: string[];
  mode: 'protocol' | 'live';
  protocolChecks: ControlledDuoQualityCheck[];
  providerCallCount: 0 | 1;
  response: ControlledDuoResponse | null;
  responseChecks: ControlledDuoQualityCheck[];
  reviewStatus: 'blocked-by-automated-checks' | 'not-run' | 'pending-owner-review';
  status:
    | 'automated-checks-failed'
    | 'awaiting-owner-review'
    | 'protocol-invalid'
    | 'protocol-ready';
};

type RecommendationProvider = (
  candidates: EnhancedMovieMatch[],
  people: PersonFormData[],
  locale: 'en',
) => Promise<ControlledDuoResponse>;

type ResponseScoringContext = {
  alexRepresented: boolean;
  description: string;
  missingNames: readonly string[];
  response: ControlledDuoResponse;
  responseShapeValid: boolean;
  samRepresented: boolean;
  selectedCandidate: ControlledDuoCandidate | undefined;
  selectedTitleIsBridge: boolean;
};

const maxRuntimeMinutes = 125;
const hardAvoidGenres = ['horror'];
const alexExplanationTerms = ['whimsical', 'romantic', 'playful', 'humane', 'charming'];
const samExplanationTerms = ['kinetic', 'energetic', 'stylish', 'bold', 'momentum', 'pace'];
const minDescriptionCharacters = 120;

const people: PersonFormData[] = [
  {
    favoriteMovie: 'Amélie',
    favoriteMovieWhy:
      'Whimsical, romantic, playful, and humane. Avoid horror and anything longer than 125 minutes tonight.',
    moodPreference: ['Whimsical', 'Romantic', 'Playful'],
    name: 'Alex',
    newVsClassic: 'Balanced',
    tonePreference: 'Warm and charming',
  },
  {
    favoriteMovie: 'Mad Max: Fury Road',
    favoriteMovieWhy:
      'Kinetic, stylish, energetic, and bold. Avoid horror and anything longer than 125 minutes tonight.',
    moodPreference: ['Energetic', 'Stylish', 'Adventurous'],
    name: 'Sam',
    newVsClassic: 'Balanced',
    tonePreference: 'Bold with momentum',
  },
];

function buildCandidate(input: {
  description: string;
  genres: string[];
  id: number;
  isBridgePick: boolean;
  name: string;
  profileSignals: ControlledDuoCandidate['profileSignals'];
  runtime: number;
  sourceUrl: string;
  year: number;
}): ControlledDuoCandidate {
  const profileFit = [...input.profileSignals.alex, ...input.profileSignals.sam].join(', ');

  return {
    age_rating: '',
    content: [
      `Title: ${input.name} (${input.year})`,
      `Runtime: ${input.runtime} minutes`,
      `Genres: ${input.genres.join(', ')}`,
      `Profile fit: ${profileFit}`,
      `Synopsis: ${input.description}`,
    ].join('\n'),
    description: input.description,
    duration: input.runtime,
    genres: input.genres,
    id: -input.id,
    isBridgePick: input.isBridgePick,
    metadataQualityFlags: [],
    metadataQualityScore: 100,
    name: input.name,
    profileSignals: input.profileSignals,
    score_rating: 0,
    similarity: 0,
    source: 'tmdb-discover',
    sourceUrl: input.sourceUrl,
    tmdbId: input.id,
    year: input.year,
  };
}

const candidates: ControlledDuoCandidate[] = [
  buildCandidate({
    description:
      'Lola races across Berlin to help her boyfriend, with the story replaying through alternate outcomes.',
    genres: ['Action', 'Drama', 'Thriller'],
    id: 104,
    isBridgePick: true,
    name: 'Run Lola Run',
    profileSignals: {
      alex: ['romantic urgency', 'playful structure'],
      sam: ['kinetic pacing', 'bold visual style'],
    },
    runtime: 81,
    sourceUrl: 'https://www.themoviedb.org/movie/104-lola-rennt',
    year: 1998,
  }),
  buildCandidate({
    description:
      'A musician fights through heightened comic-book set pieces while trying to build a relationship.',
    genres: ['Action', 'Comedy', 'Romance'],
    id: 22538,
    isBridgePick: true,
    name: 'Scott Pilgrim vs. the World',
    profileSignals: {
      alex: ['playful romance', 'comic charm'],
      sam: ['kinetic action', 'stylish editing'],
    },
    runtime: 112,
    sourceUrl: 'https://www.themoviedb.org/movie/22538-scott-pilgrim-vs-the-world',
    year: 2010,
  }),
  buildCandidate({
    description:
      'A getaway driver tries to leave crime behind, with action choreographed around music and a romantic escape plan.',
    genres: ['Action', 'Crime', 'Drama'],
    id: 339403,
    isBridgePick: true,
    name: 'Baby Driver',
    profileSignals: {
      alex: ['romantic escape', 'human connection'],
      sam: ['kinetic driving', 'stylish rhythm'],
    },
    runtime: 113,
    sourceUrl: 'https://www.themoviedb.org/movie/339403-baby-driver',
    year: 2017,
  }),
  buildCandidate({
    description:
      'A hotel concierge and his protégé move through a carefully composed comic caper in interwar Europe.',
    genres: ['Comedy', 'Drama'],
    id: 120467,
    isBridgePick: false,
    name: 'The Grand Budapest Hotel',
    profileSignals: {
      alex: ['whimsical comedy', 'humane friendship'],
      sam: ['stylish composition'],
    },
    runtime: 100,
    sourceUrl: 'https://www.themoviedb.org/movie/120467-the-grand-budapest-hotel',
    year: 2014,
  }),
];

export const controlledDuoQualityProtocol = {
  acceptance: {
    alexExplanationTerms,
    allowedMainTitles: candidates
      .filter((candidate) => candidate.isBridgePick)
      .map(({ name }) => name),
    minDescriptionCharacters,
    requiredParticipantNames: ['Alex', 'Sam'],
    samExplanationTerms,
  },
  candidates,
  constraints: {
    hardAvoidGenres,
    maxRuntimeMinutes,
  },
  id: 'duo-amelie-fury-road-bridge',
  people,
  purpose:
    'Test whether one bounded ranking response can represent two contrasting taste profiles without violating shared hard constraints.',
} as const;

const manualReviewQuestions = [
  'Does the selected film feel like a fair bridge rather than a win for only Alex or Sam?',
  'Does the explanation connect concrete qualities of the film to both profiles instead of listing prompt keywords?',
  'Would the owner accept this as a credible recommendation for the stated night?',
];

function normalize(value: string): string {
  return value.toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
}

function includesAnyTerm(text: string, terms: readonly string[]): boolean {
  const normalizedText = normalize(text);
  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function buildCheck(
  id: string,
  label: string,
  passed: boolean,
  details: string,
): ControlledDuoQualityCheck {
  return { details, id, label, passed };
}

export function validateControlledDuoQualityProtocol(): ControlledDuoQualityCheck[] {
  const parsedPeople = people.map((person) => personFormDataSchema.safeParse(person));
  const normalizedTitles = candidates.map((candidate) => normalize(candidate.name));
  const uniqueTitles = new Set(normalizedTitles);
  const invalidConstraintCandidates = candidates.filter(
    (candidate) =>
      candidate.duration > maxRuntimeMinutes ||
      candidate.genres.some((genre) =>
        hardAvoidGenres.some((hardAvoid) => normalize(genre) === normalize(hardAvoid)),
      ),
  );
  const bridgeCandidates = candidates.filter((candidate) => candidate.isBridgePick);
  const missingProfileSignals = bridgeCandidates.filter(
    (candidate) =>
      candidate.profileSignals.alex.length === 0 || candidate.profileSignals.sam.length === 0,
  );

  return [
    buildCheck(
      'valid-people',
      'Valid participant inputs',
      parsedPeople.every((result) => result.success),
      parsedPeople.every((result) => result.success)
        ? 'Both participant records match the production quiz input schema.'
        : 'At least one participant record does not match the production quiz input schema.',
    ),
    buildCheck(
      'unique-candidates',
      'Unique bounded candidates',
      uniqueTitles.size === candidates.length,
      uniqueTitles.size === candidates.length
        ? `${candidates.length} candidate titles are unique.`
        : 'The bounded candidate set contains duplicate titles.',
    ),
    buildCheck(
      'candidate-hard-constraints',
      'Candidate hard constraints',
      invalidConstraintCandidates.length === 0,
      invalidConstraintCandidates.length === 0
        ? `Every candidate avoids ${hardAvoidGenres.join(', ')} and is at most ${maxRuntimeMinutes} minutes.`
        : `Invalid candidates: ${invalidConstraintCandidates.map(({ name }) => name).join(', ')}`,
    ),
    buildCheck(
      'bridge-candidate-coverage',
      'Bridge candidate coverage',
      bridgeCandidates.length >= 3 && missingProfileSignals.length === 0,
      bridgeCandidates.length >= 3 && missingProfileSignals.length === 0
        ? `${bridgeCandidates.length} candidates are pre-declared as plausible bridges with signals for both profiles.`
        : 'The protocol needs at least three bridge candidates with signals for both profiles.',
    ),
  ];
}

export function scoreControlledDuoQualityResponse(
  response: ControlledDuoResponse,
): ControlledDuoQualityCheck[] {
  const context = buildResponseScoringContext(response);

  return [
    buildResponseShapeCheck(context),
    buildBoundedSelectionCheck(context),
    buildBridgeSelectionCheck(context),
    buildParticipantNamesCheck(context),
    buildProfileRepresentationCheck(context, 'alex'),
    buildProfileRepresentationCheck(context, 'sam'),
    buildSpecificExplanationCheck(context),
  ];
}

function buildResponseScoringContext(response: ControlledDuoResponse): ResponseScoringContext {
  const selectedCandidate = candidates.find(
    (candidate) => normalize(candidate.name) === normalize(response.title),
  );
  const selectedTitleIsBridge = controlledDuoQualityProtocol.acceptance.allowedMainTitles.some(
    (title) => normalize(title) === normalize(response.title),
  );
  const description = normalize(response.description);
  const missingNames = controlledDuoQualityProtocol.acceptance.requiredParticipantNames.filter(
    (name) => !description.includes(normalize(name)),
  );

  return {
    alexRepresented: includesAnyTerm(description, alexExplanationTerms),
    description,
    missingNames,
    response,
    responseShapeValid: recommendationResponseSchema.safeParse(response).success,
    samRepresented: includesAnyTerm(description, samExplanationTerms),
    selectedCandidate,
    selectedTitleIsBridge,
  };
}

function buildResponseShapeCheck(context: ResponseScoringContext): ControlledDuoQualityCheck {
  return buildCheck(
    'response-shape',
    'Response shape',
    context.responseShapeValid,
    context.responseShapeValid
      ? 'The provider response matches the production ranking response schema.'
      : 'The provider response does not match the production ranking response schema.',
  );
}

function buildBoundedSelectionCheck(context: ResponseScoringContext): ControlledDuoQualityCheck {
  return buildCheck(
    'bounded-selection',
    'Bounded selection',
    Boolean(context.selectedCandidate),
    context.selectedCandidate
      ? `Selected title "${context.selectedCandidate.name}" belongs to the fixed candidate set.`
      : `Selected title "${context.response.title}" is outside the fixed candidate set.`,
  );
}

function buildBridgeSelectionCheck(context: ResponseScoringContext): ControlledDuoQualityCheck {
  return buildCheck(
    'bridge-selection',
    'Bridge selection',
    context.selectedTitleIsBridge,
    context.selectedTitleIsBridge
      ? `Selected title "${context.response.title}" is a pre-declared bridge candidate.`
      : 'The selected title is not one of the pre-declared bridge candidates.',
  );
}

function buildParticipantNamesCheck(context: ResponseScoringContext): ControlledDuoQualityCheck {
  return buildCheck(
    'participant-names',
    'Participant names',
    context.missingNames.length === 0,
    context.missingNames.length === 0
      ? 'The explanation names both participants.'
      : `Missing participant names: ${context.missingNames.join(', ')}`,
  );
}

function buildProfileRepresentationCheck(
  context: ResponseScoringContext,
  profile: 'alex' | 'sam',
): ControlledDuoQualityCheck {
  const isAlex = profile === 'alex';
  const represented = isAlex ? context.alexRepresented : context.samRepresented;
  const terms = isAlex ? alexExplanationTerms : samExplanationTerms;
  const name = isAlex ? 'Alex' : 'Sam';

  return buildCheck(
    `${profile}-representation`,
    `${name} taste representation`,
    represented,
    represented
      ? `The explanation represents at least one ${name} taste signal.`
      : `Expected one of: ${terms.join(', ')}`,
  );
}

function buildSpecificExplanationCheck(context: ResponseScoringContext): ControlledDuoQualityCheck {
  const passed = context.response.description.trim().length >= minDescriptionCharacters;
  return buildCheck(
    'specific-explanation',
    'Specific explanation',
    passed,
    passed
      ? `Explanation is at least ${minDescriptionCharacters} characters.`
      : `Explanation is shorter than ${minDescriptionCharacters} characters.`,
  );
}

export function buildControlledDuoProtocolReport(
  generatedAt = new Date().toISOString(),
): ControlledDuoQualityReport {
  const protocolChecks = validateControlledDuoQualityProtocol();
  const protocolPassed = protocolChecks.every((check) => check.passed);

  return {
    automatedChecksPassed: null,
    generatedAt,
    manualReviewQuestions,
    mode: 'protocol',
    protocolChecks,
    providerCallCount: 0,
    response: null,
    responseChecks: [],
    reviewStatus: 'not-run',
    status: protocolPassed ? 'protocol-ready' : 'protocol-invalid',
  };
}

export async function runControlledDuoQualityEval(
  provider: RecommendationProvider = getRecommendation,
  generatedAt = new Date().toISOString(),
): Promise<ControlledDuoQualityReport> {
  const protocolChecks = validateControlledDuoQualityProtocol();
  if (protocolChecks.some((check) => !check.passed)) {
    return {
      automatedChecksPassed: null,
      generatedAt,
      manualReviewQuestions,
      mode: 'live',
      protocolChecks,
      providerCallCount: 0,
      response: null,
      responseChecks: [],
      reviewStatus: 'not-run',
      status: 'protocol-invalid',
    };
  }

  const response = await provider(candidates, people, 'en');
  const responseChecks = scoreControlledDuoQualityResponse(response);
  const automatedChecksPassed = responseChecks.every((check) => check.passed);

  return {
    automatedChecksPassed,
    generatedAt,
    manualReviewQuestions,
    mode: 'live',
    protocolChecks,
    providerCallCount: 1,
    response,
    responseChecks,
    reviewStatus: automatedChecksPassed ? 'pending-owner-review' : 'blocked-by-automated-checks',
    status: automatedChecksPassed ? 'awaiting-owner-review' : 'automated-checks-failed',
  };
}
