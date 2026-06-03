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
  'PopChoice E2E Space Opera': {
    age_rating: 'PG-13',
    aiDescription:
      'A sci-fi adventure pick for viewers who want sleek action and thoughtful spectacle.',
    duration: 142,
    score_rating: 8.7,
    tmdbId: 900001,
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

export const recommendationEvalFixtures: RecommendationEvalFixture[] =
  recommendationEvalScenarioMatrix.map(({ audience, depth, sourceStrategy }) => ({
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
    locale: 'en',
    mockResponse: getMockResponse(audience, depth, sourceStrategy),
    name: `${audience} / ${depth} / ${sourceStrategy}`,
    people: getPeople(audience),
    sourceStrategy,
    userMemories: getMemories(depth),
  }));
