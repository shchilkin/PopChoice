import type { ApiResponse, CandidateSource, PersonFormData } from '../types';
import type {
  RecommendationEvalAudience,
  RecommendationEvalCandidate,
  RecommendationEvalDepth,
  RecommendationEvalFixture,
  RecommendationEvalMemory,
  RecommendationEvalSourceStrategy,
} from './types';

export const recommendationEvalAudiences = [
  'solo',
  'family',
  'group',
] as const satisfies readonly RecommendationEvalAudience[];
export const recommendationEvalDepths = [
  'focused',
  'memory-aware',
  'compromise',
] as const satisfies readonly RecommendationEvalDepth[];
export const recommendationEvalSourceStrategies = [
  'curated-showcase',
  'hybrid-fast',
  'tmdb-first',
] as const satisfies readonly RecommendationEvalSourceStrategy[];

export const recommendationEvalScenarioMatrix = recommendationEvalAudiences.flatMap((audience) =>
  recommendationEvalDepths.flatMap((depth) =>
    recommendationEvalSourceStrategies.map((sourceStrategy) => ({
      audience,
      depth,
      sourceStrategy,
    })),
  ),
);

const candidateCatalog: RecommendationEvalCandidate[] = [
  { name: 'PopChoice E2E Space Opera', year: 2024 },
  { name: 'PopChoice E2E Family Adventure', year: 2018 },
  { name: 'PopChoice E2E Classic Drama', year: 1998 },
  { name: 'PopChoice E2E Cozy Mystery', year: 2021 },
  { name: 'PopChoice E2E Ensemble Comedy', year: 2020 },
  { name: 'PopChoice E2E Grounded Thriller', year: 2016 },
  { name: 'PopChoice E2E Neon Frontier', year: 2025 },
  { name: 'PopChoice E2E Haunted Starship', year: 2022 },
  { name: 'PopChoice E2E Left-Field Comedy', year: 2023 },
  { name: 'PopChoice E2E Familiar Romcom', year: 2019 },
  { name: 'PopChoice E2E Short Group Mystery', year: 2021 },
  { name: 'PopChoice E2E Three-Hour Epic', year: 2009 },
  { name: 'PopChoice E2E Oddball Heist', year: 2024 },
  { name: 'PopChoice E2E Gore Carnival', year: 2020 },
];

const movieDetailsByName: Record<
  string,
  {
    age_rating: string;
    aiDescription: string;
    duration: number;
    score_rating: number;
    tmdbId: number;
  }
> = {
  'PopChoice E2E Classic Drama': {
    age_rating: 'PG-13',
    aiDescription: 'A patient character drama for viewers who want emotional depth.',
    duration: 126,
    score_rating: 9.1,
    tmdbId: 900003,
  },
  'PopChoice E2E Cozy Mystery': {
    age_rating: 'PG',
    aiDescription: 'A gentle mystery with soft humor and enough plot to stay engaging.',
    duration: 108,
    score_rating: 7.8,
    tmdbId: 900005,
  },
  'PopChoice E2E Ensemble Comedy': {
    age_rating: 'PG-13',
    aiDescription: 'A bridge pick with playful character beats and energetic pacing.',
    duration: 115,
    score_rating: 8.3,
    tmdbId: 900006,
  },
  'PopChoice E2E Family Adventure': {
    age_rating: 'G',
    aiDescription: 'A warm family pick with gentle jokes and adventure momentum.',
    duration: 101,
    score_rating: 8.1,
    tmdbId: 900004,
  },
  'PopChoice E2E Grounded Thriller': {
    age_rating: 'PG-13',
    aiDescription: 'A precise thriller with grounded stakes and clean momentum.',
    duration: 112,
    score_rating: 7.9,
    tmdbId: 900007,
  },
  'PopChoice E2E Familiar Romcom': {
    age_rating: 'PG-13',
    aiDescription: 'An obvious, familiar date-night romcom with a very safe shape.',
    duration: 104,
    score_rating: 7.1,
    tmdbId: 900011,
  },
  'PopChoice E2E Gore Carnival': {
    age_rating: 'R',
    aiDescription: 'A gruesome gore spectacle built around shock scenes and splatter.',
    duration: 111,
    score_rating: 7.2,
    tmdbId: 900015,
  },
  'PopChoice E2E Haunted Starship': {
    age_rating: 'R',
    aiDescription: 'A horror-leaning space thriller with haunted corridors and jump scares.',
    duration: 116,
    score_rating: 7.4,
    tmdbId: 900009,
  },
  'PopChoice E2E Left-Field Comedy': {
    age_rating: 'PG-13',
    aiDescription: 'A funny, offbeat date-night comedy with playful surprise.',
    duration: 99,
    score_rating: 8.0,
    tmdbId: 900010,
  },
  'PopChoice E2E Neon Frontier': {
    age_rating: 'PG-13',
    aiDescription: 'A dark sci-fi frontier story with kinetic ideas and clean tension.',
    duration: 119,
    score_rating: 8.5,
    tmdbId: 900008,
  },
  'PopChoice E2E Oddball Heist': {
    age_rating: 'PG-13',
    aiDescription: 'A surprising heist movie with strange comedy and nimble pacing.',
    duration: 102,
    score_rating: 8.2,
    tmdbId: 900014,
  },
  'PopChoice E2E Space Opera': {
    age_rating: 'PG-13',
    aiDescription:
      'A sci-fi adventure pick for viewers who want sleek action and thoughtful spectacle.',
    duration: 142,
    score_rating: 8.7,
    tmdbId: 900001,
  },
  'PopChoice E2E Short Group Mystery': {
    age_rating: 'PG',
    aiDescription: 'A compact group mystery with clean stakes and quick social momentum.',
    duration: 96,
    score_rating: 7.9,
    tmdbId: 900012,
  },
  'PopChoice E2E Three-Hour Epic': {
    age_rating: 'PG-13',
    aiDescription: 'A long runtime three-hour epic with sweeping battles and heavy pacing.',
    duration: 188,
    score_rating: 8.4,
    tmdbId: 900013,
  },
};

const mainTitleByDepth: Record<RecommendationEvalDepth, string> = {
  compromise: 'PopChoice E2E Ensemble Comedy',
  focused: 'PopChoice E2E Space Opera',
  'memory-aware': 'PopChoice E2E Family Adventure',
};

const alternateTitlesByDepth: Record<RecommendationEvalDepth, string[]> = {
  compromise: ['PopChoice E2E Family Adventure', 'PopChoice E2E Space Opera'],
  focused: ['PopChoice E2E Grounded Thriller', 'PopChoice E2E Classic Drama'],
  'memory-aware': ['PopChoice E2E Cozy Mystery', 'PopChoice E2E Ensemble Comedy'],
};

function hasMemoryRequirement(depth: RecommendationEvalDepth): boolean {
  return depth === 'memory-aware';
}

function hasCompromiseRequirement(depth: RecommendationEvalDepth): boolean {
  return depth === 'compromise';
}

function getPeople(audience: RecommendationEvalAudience): PersonFormData[] {
  if (audience === 'solo') {
    return [
      {
        favoriteMovie: 'The Matrix',
        favoriteMovieWhy: 'I like smart genre movies that balance ideas and momentum.',
        moodPreference: ['Sci-Fi', 'Adventurous'],
        name: 'Riley',
        newVsClassic: 'Balanced',
        tonePreference: 'Smart and exciting',
      },
    ];
  }

  if (audience === 'family') {
    return [
      {
        favoriteMovie: 'Paddington 2',
        favoriteMovieWhy: 'Warm, funny, and easy for different ages to enjoy together.',
        moodPreference: ['Funny', 'Heartwarming'],
        name: 'Family',
        newVsClassic: 'New',
        tonePreference: 'Light',
      },
    ];
  }

  return [
    {
      favoriteMovie: 'Amelie',
      favoriteMovieWhy: 'Playful, humane, and visually charming.',
      moodPreference: ['Whimsical', 'Romantic'],
      name: 'Alex',
      newVsClassic: 'Balanced',
      tonePreference: 'Playful',
    },
    {
      favoriteMovie: 'Mad Max: Fury Road',
      favoriteMovieWhy: 'Kinetic and stylish without too much exposition.',
      moodPreference: ['Energetic', 'Stylish'],
      name: 'Sam',
      newVsClassic: 'Balanced',
      tonePreference: 'Bold',
    },
  ];
}

function getMemories(depth: RecommendationEvalDepth): RecommendationEvalMemory[] {
  if (!hasMemoryRequirement(depth)) return [];

  return [
    { kind: 'watched', movieName: 'PopChoice E2E Classic Drama', movieYear: 1998 },
    { kind: 'not_interested', movieName: 'PopChoice E2E Grounded Thriller', movieYear: 2016 },
  ];
}

function getRequiredExplanationTerms(
  audience: RecommendationEvalAudience,
  depth: RecommendationEvalDepth,
): string[] {
  const terms: string[] = [audience];
  if (hasMemoryRequirement(depth)) terms.push('avoid');
  if (hasCompromiseRequirement(depth)) terms.push('both');
  return terms;
}

function getDescription(
  audience: RecommendationEvalAudience,
  depth: RecommendationEvalDepth,
  sourceStrategy: RecommendationEvalSourceStrategy,
): string {
  const audienceText = {
    family: 'for the family',
    group: 'for the group',
    solo: 'for the solo viewer',
  }[audience];
  const sourceText = {
    'curated-showcase': 'using curated showcase candidates only',
    'hybrid-fast': 'mixing local cache candidates with bounded TMDB discovery fallbacks',
    'tmdb-first': 'starting from TMDB discovery and search candidates',
  }[sourceStrategy];
  const memoryText = hasMemoryRequirement(depth)
    ? ' It explicitly avoids watched or rejected titles from memory.'
    : '';
  const compromiseText = hasCompromiseRequirement(depth)
    ? ' It explains how both preference sets are represented without letting one side dominate.'
    : '';

  return `A ${depth} ${sourceStrategy} recommendation ${audienceText} ${sourceText}.${memoryText}${compromiseText}`;
}

function getMockSource(
  sourceStrategy: RecommendationEvalSourceStrategy,
  index: number,
): CandidateSource {
  if (sourceStrategy === 'curated-showcase') return 'curated';
  if (sourceStrategy === 'tmdb-first') return index % 2 === 0 ? 'tmdb-discover' : 'tmdb-search';
  return index === 0 ? 'local-cache' : 'tmdb-discover';
}

function toSimilarMovie(
  name: string,
  index: number,
  sourceStrategy: RecommendationEvalSourceStrategy,
  isMainRecommendation = false,
) {
  const candidate = candidateCatalog.find((movie) => movie.name === name);
  const details = movieDetailsByName[name];
  if (!candidate || !details) {
    throw new Error(`Missing deterministic eval movie fixture for "${name}".`);
  }
  const source = getMockSource(sourceStrategy, index);
  const fromTMDB = source === 'tmdb-discover' || source === 'tmdb-search';

  return {
    id: fromTMDB ? -details.tmdbId : index + 1,
    name,
    similarity: Number((0.96 - index * 0.06).toFixed(2)),
    year: candidate.year,
    ...details,
    fromTMDB,
    metadataQualityFlags: [],
    metadataQualityScore: 100,
    source,
    ...(isMainRecommendation ? { isMainRecommendation } : {}),
  };
}

function getMockSourceDistribution(
  sourceStrategy: RecommendationEvalSourceStrategy,
  movieCount: number,
): NonNullable<ApiResponse['candidateSourceDistribution']> {
  const distribution: NonNullable<ApiResponse['candidateSourceDistribution']> = {};
  for (let index = 0; index < movieCount; index += 1) {
    const source = getMockSource(sourceStrategy, index);
    distribution[source] = (distribution[source] ?? 0) + 1;
  }
  return distribution;
}

function getCandidates(names: string[]): RecommendationEvalCandidate[] {
  return names.map((name) => {
    const candidate = candidateCatalog.find((movie) => movie.name === name);
    if (!candidate) throw new Error(`Missing deterministic eval candidate "${name}".`);
    return candidate;
  });
}

function getTasteControlResponse({
  description,
  sourceStrategy,
  titles,
}: {
  description: string;
  sourceStrategy: RecommendationEvalSourceStrategy;
  titles: string[];
}): ApiResponse {
  return {
    dbMovieCount: candidateCatalog.length,
    description,
    similarMovies: titles.map((title, index) =>
      toSimilarMovie(title, index, sourceStrategy, index === 0),
    ),
    candidateSourceDistribution: getMockSourceDistribution(sourceStrategy, titles.length),
    sourceStrategy,
    title: titles[0] ?? '',
    usedBroaderSearch: sourceStrategy !== 'curated-showcase',
  };
}

function getMinCandidateSources(
  sourceStrategy: RecommendationEvalSourceStrategy,
): NonNullable<RecommendationEvalFixture['expectations']['minCandidateSources']> {
  if (sourceStrategy === 'curated-showcase') return { curated: 3 };
  if (sourceStrategy === 'hybrid-fast') return { 'local-cache': 1, 'tmdb-discover': 1 };
  return { 'tmdb-discover': 1, 'tmdb-search': 1 };
}

function getMockResponse(
  audience: RecommendationEvalAudience,
  depth: RecommendationEvalDepth,
  sourceStrategy: RecommendationEvalSourceStrategy,
): ApiResponse {
  const mainTitle = mainTitleByDepth[depth];
  const memoryTitles = new Set(getMemories(depth).map((memory) => memory.movieName));
  const alternateTitles = alternateTitlesByDepth[depth]
    .filter((title) => !memoryTitles.has(title))
    .concat(candidateCatalog.map((movie) => movie.name).filter((title) => title !== mainTitle))
    .filter((title, index, titles) => !memoryTitles.has(title) && titles.indexOf(title) === index)
    .slice(0, 2);
  const similarMovieTitles = [mainTitle, ...alternateTitles];

  return {
    dbMovieCount: candidateCatalog.length,
    description: getDescription(audience, depth, sourceStrategy),
    similarMovies: similarMovieTitles.map((title, index) =>
      toSimilarMovie(title, index, sourceStrategy, index === 0),
    ),
    candidateSourceDistribution: getMockSourceDistribution(
      sourceStrategy,
      similarMovieTitles.length,
    ),
    sourceStrategy,
    title: mainTitle,
    usedBroaderSearch: sourceStrategy !== 'curated-showcase',
  };
}

export const recommendationEvalTasteControlFixtures: RecommendationEvalFixture[] = [
  {
    audience: 'solo',
    candidates: getCandidates([
      'PopChoice E2E Neon Frontier',
      'PopChoice E2E Haunted Starship',
      'PopChoice E2E Space Opera',
      'PopChoice E2E Grounded Thriller',
    ]),
    depth: 'focused',
    description: 'Dark sci-fi but no horror, with no required reference movie.',
    expectations: {
      allowedMainTitles: ['PopChoice E2E Neon Frontier'],
      forbiddenTitles: ['PopChoice E2E Haunted Starship'],
      forbiddenTerms: ['sexual minors', 'self-harm instructions'],
      minCandidateSources: { 'tmdb-discover': 1, 'tmdb-search': 1 },
      minDescriptionCharacters: 80,
      minMetadataCompleteCandidates: 3,
      minPassingScore: 90,
      minSimilarMovies: 3,
      requiredExplanationTerms: ['solo', 'sci-fi', 'avoid', 'horror', 'balanced'],
      tasteControl: {
        discoveryAppetite: 'balanced',
        hardAvoidTerms: ['horror', 'haunted'],
        optionalReferenceMovie: true,
      },
    },
    id: 'taste-dark-sci-fi-no-horror',
    locale: 'en' as const,
    mockResponse: getTasteControlResponse({
      description:
        'For the solo viewer, Neon Frontier keeps dark sci-fi momentum, avoids horror, and stays balanced instead of becoming a bleak shock pick.',
      sourceStrategy: 'tmdb-first',
      titles: [
        'PopChoice E2E Neon Frontier',
        'PopChoice E2E Space Opera',
        'PopChoice E2E Grounded Thriller',
      ],
    }),
    name: 'taste control / dark sci-fi / no horror',
    people: [
      {
        favoriteMovie: '',
        favoriteMovieWhy: 'Dark sci-fi mood. Avoid: horror. Discovery appetite: balanced.',
        moodPreference: ['Sci-Fi', 'Adventurous'],
        name: 'Riley',
        newVsClassic: 'Balanced',
        tonePreference: 'Tense but not scary',
      },
    ],
    sourceStrategy: 'tmdb-first',
    userMemories: [],
  },
  {
    audience: 'solo',
    candidates: getCandidates([
      'PopChoice E2E Left-Field Comedy',
      'PopChoice E2E Familiar Romcom',
      'PopChoice E2E Ensemble Comedy',
      'PopChoice E2E Cozy Mystery',
    ]),
    depth: 'focused',
    description: 'Funny date night that should not collapse to an obvious romcom.',
    expectations: {
      allowedMainTitles: ['PopChoice E2E Left-Field Comedy'],
      forbiddenTitles: ['PopChoice E2E Familiar Romcom'],
      forbiddenTerms: ['sexual minors', 'self-harm instructions'],
      minCandidateSources: { 'local-cache': 1, 'tmdb-discover': 1 },
      minDescriptionCharacters: 80,
      minMetadataCompleteCandidates: 3,
      minPassingScore: 90,
      minSimilarMovies: 3,
      requiredExplanationTerms: ['solo', 'funny', 'date-night', 'avoid', 'obvious'],
      tasteControl: {
        discoveryAppetite: 'surprising',
        hardAvoidTerms: ['obvious'],
      },
    },
    id: 'taste-funny-date-night-not-obvious',
    locale: 'en' as const,
    mockResponse: getTasteControlResponse({
      description:
        'For the solo date-night brief, Left-Field Comedy keeps things funny and surprising while avoiding the obvious comfort-romcom lane.',
      sourceStrategy: 'hybrid-fast',
      titles: [
        'PopChoice E2E Left-Field Comedy',
        'PopChoice E2E Ensemble Comedy',
        'PopChoice E2E Cozy Mystery',
      ],
    }),
    name: 'taste control / funny date night / not obvious',
    people: [
      {
        favoriteMovie: 'Palm Springs',
        favoriteMovieWhy:
          'Funny date-night energy. Avoid: too obvious. Discovery appetite: surprising.',
        moodPreference: ['Funny', 'Romantic'],
        name: 'Riley',
        newVsClassic: 'New',
        tonePreference: 'Playful',
      },
    ],
    sourceStrategy: 'hybrid-fast',
    userMemories: [],
  },
  {
    audience: 'group',
    candidates: getCandidates([
      'PopChoice E2E Short Group Mystery',
      'PopChoice E2E Three-Hour Epic',
      'PopChoice E2E Ensemble Comedy',
      'PopChoice E2E Family Adventure',
    ]),
    depth: 'compromise',
    description: 'Group pick with a hard no on long runtime.',
    expectations: {
      allowedMainTitles: ['PopChoice E2E Short Group Mystery'],
      forbiddenTitles: ['PopChoice E2E Three-Hour Epic'],
      forbiddenTerms: ['sexual minors', 'self-harm instructions'],
      minCandidateSources: { curated: 3 },
      minDescriptionCharacters: 80,
      minMetadataCompleteCandidates: 3,
      minPassingScore: 90,
      minSimilarMovies: 3,
      requiredExplanationTerms: ['group', 'both', 'avoid', 'long runtime'],
      tasteControl: {
        hardAvoidTerms: ['long runtime', 'three-hour'],
        maxRuntimeMinutes: 125,
      },
    },
    id: 'taste-group-no-long-runtime',
    locale: 'en',
    mockResponse: getTasteControlResponse({
      description:
        'For the group, Short Group Mystery gives both sides quick social momentum and avoids long runtime fatigue.',
      sourceStrategy: 'curated-showcase',
      titles: [
        'PopChoice E2E Short Group Mystery',
        'PopChoice E2E Ensemble Comedy',
        'PopChoice E2E Family Adventure',
      ],
    }),
    name: 'taste control / group / no long runtime',
    people: [
      {
        favoriteMovie: 'Knives Out',
        favoriteMovieWhy: 'Group mystery night. Avoid: long runtime.',
        moodPreference: ['Mystery', 'Funny'],
        name: 'Alex',
        newVsClassic: 'Balanced',
        tonePreference: 'Social',
      },
      {
        favoriteMovie: 'Game Night',
        favoriteMovieWhy: 'Keep it quick and energetic.',
        moodPreference: ['Funny', 'Energetic'],
        name: 'Sam',
        newVsClassic: 'Balanced',
        tonePreference: 'Fast',
      },
    ],
    sourceStrategy: 'curated-showcase',
    userMemories: [],
  },
  {
    audience: 'solo',
    candidates: getCandidates([
      'PopChoice E2E Oddball Heist',
      'PopChoice E2E Gore Carnival',
      'PopChoice E2E Left-Field Comedy',
      'PopChoice E2E Cozy Mystery',
    ]),
    depth: 'focused',
    description: 'Surprise me, but no gore.',
    expectations: {
      allowedMainTitles: ['PopChoice E2E Oddball Heist'],
      forbiddenTitles: ['PopChoice E2E Gore Carnival'],
      forbiddenTerms: ['sexual minors', 'self-harm instructions'],
      minCandidateSources: { 'tmdb-discover': 1, 'tmdb-search': 1 },
      minDescriptionCharacters: 80,
      minMetadataCompleteCandidates: 3,
      minPassingScore: 90,
      minSimilarMovies: 3,
      requiredExplanationTerms: ['solo', 'surprising', 'avoid', 'gore'],
      tasteControl: {
        discoveryAppetite: 'surprising',
        hardAvoidTerms: ['gore', 'gruesome'],
      },
    },
    id: 'taste-surprise-no-gore',
    locale: 'en',
    mockResponse: getTasteControlResponse({
      description:
        'For the solo viewer, Oddball Heist is surprising and strange while explicitly avoiding gore or gruesome shock value.',
      sourceStrategy: 'tmdb-first',
      titles: [
        'PopChoice E2E Oddball Heist',
        'PopChoice E2E Left-Field Comedy',
        'PopChoice E2E Cozy Mystery',
      ],
    }),
    name: 'taste control / surprise me / no gore',
    people: [
      {
        favoriteMovie: '',
        favoriteMovieWhy: 'Surprise me. Avoid: gore. Discovery appetite: surprising.',
        moodPreference: ['Funny', 'Adventurous'],
        name: 'Riley',
        newVsClassic: 'New',
        tonePreference: 'Odd but friendly',
      },
    ],
    sourceStrategy: 'tmdb-first',
    userMemories: [],
  },
  {
    audience: 'solo',
    candidates: getCandidates([
      'PopChoice E2E Cozy Mystery',
      'PopChoice E2E Familiar Romcom',
      'PopChoice E2E Three-Hour Epic',
      'PopChoice E2E Gore Carnival',
      'PopChoice E2E Ensemble Comedy',
      'PopChoice E2E Family Adventure',
    ]),
    depth: 'memory-aware',
    description: 'Feedback-derived memory should block watched, wrong-mood, and rejected titles.',
    expectations: {
      allowedMainTitles: ['PopChoice E2E Cozy Mystery'],
      forbiddenTitles: [
        'PopChoice E2E Familiar Romcom',
        'PopChoice E2E Three-Hour Epic',
        'PopChoice E2E Gore Carnival',
      ],
      forbiddenTerms: ['sexual minors', 'self-harm instructions'],
      minCandidateSources: { 'local-cache': 1, 'tmdb-discover': 1 },
      minDescriptionCharacters: 80,
      minMetadataCompleteCandidates: 3,
      minPassingScore: 90,
      minSimilarMovies: 3,
      requiredExplanationTerms: ['solo', 'avoid', 'watched', 'wrong mood'],
      tasteControl: {
        feedbackMemoryKinds: ['watched', 'wrong_mood', 'not_interested'],
      },
    },
    id: 'taste-feedback-memory-repeat-avoidance',
    locale: 'en',
    mockResponse: getTasteControlResponse({
      description:
        'For the solo viewer, Cozy Mystery respects feedback memory: it avoids watched titles, wrong mood signals, and rejected picks.',
      sourceStrategy: 'hybrid-fast',
      titles: [
        'PopChoice E2E Cozy Mystery',
        'PopChoice E2E Ensemble Comedy',
        'PopChoice E2E Family Adventure',
      ],
    }),
    name: 'taste control / feedback memory / repeat avoidance',
    people: [
      {
        favoriteMovie: '',
        favoriteMovieWhy: 'Need a softer reset after recent misses.',
        moodPreference: ['Mystery', 'Heartwarming'],
        name: 'Riley',
        newVsClassic: 'Balanced',
        tonePreference: 'Gentle',
      },
    ],
    sourceStrategy: 'hybrid-fast',
    userMemories: [
      { kind: 'watched', movieName: 'PopChoice E2E Familiar Romcom', movieYear: 2019 },
      { kind: 'wrong_mood', movieName: 'PopChoice E2E Three-Hour Epic', movieYear: 2009 },
      { kind: 'not_interested', movieName: 'PopChoice E2E Gore Carnival', movieYear: 2020 },
    ],
  },
];

export const recommendationEvalFixtures: RecommendationEvalFixture[] = [
  ...recommendationEvalScenarioMatrix.map(({ audience, depth, sourceStrategy }) => ({
    audience,
    candidates: candidateCatalog,
    depth,
    description: getDescription(audience, depth, sourceStrategy),
    expectations: {
      allowedMainTitles: [mainTitleByDepth[depth]],
      forbiddenTerms: ['sexual minors', 'self-harm instructions', 'bleak violence'],
      minCandidateSources: getMinCandidateSources(sourceStrategy),
      minDescriptionCharacters: 80,
      minMetadataCompleteCandidates: 3,
      minPassingScore: 90,
      minSimilarMovies: 3,
      requiredExplanationTerms: getRequiredExplanationTerms(audience, depth),
    },
    id: `${audience}-${depth}-${sourceStrategy}`,
    locale: 'en' as const,
    mockResponse: getMockResponse(audience, depth, sourceStrategy),
    name: `${audience} / ${depth} / ${sourceStrategy}`,
    people: getPeople(audience),
    sourceStrategy,
    userMemories: getMemories(depth),
  })),
  ...recommendationEvalTasteControlFixtures,
];
