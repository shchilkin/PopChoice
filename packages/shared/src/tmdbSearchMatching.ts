export type TMDBTitleMatchCandidate = {
  title: string;
  original_title?: string | null;
};

export type TMDBScoredSearchCandidate = {
  confidence: number;
};

export type TMDBSearchMatchDecision<TCandidate extends TMDBScoredSearchCandidate> =
  | {
      status: 'matched' | 'ambiguous';
      best: TCandidate;
    }
  | {
      status: 'not_found';
      best: TCandidate | null;
    };

export type TMDBSearchMatchResult<TCandidate extends TMDBScoredSearchCandidate> =
  | {
      status: 'matched';
      best: TCandidate;
      candidates: TCandidate[];
    }
  | {
      status: 'ambiguous' | 'not_found';
      candidates: TCandidate[];
    };

const EXACT_TITLE_MATCH_SCORE = 0.75;
const FUZZY_TITLE_MATCH_SCORE = 0.68;
const STRONG_TOKEN_SIMILARITY = 0.82;

export function normalizeTMDBTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ');
}

export function scoreTMDBTitleMatch(
  candidate: TMDBTitleMatchCandidate,
  targetTitle: string,
): number {
  const target = normalizeTMDBTitle(targetTitle);
  const title = normalizeTMDBTitle(candidate.title);
  const originalTitle = candidate.original_title
    ? normalizeTMDBTitle(candidate.original_title)
    : '';

  if (!target || (!title && !originalTitle)) return 0;
  if (target === title || target === originalTitle) return EXACT_TITLE_MATCH_SCORE;
  if (isStrongFuzzyTitleMatch(target, title) || isStrongFuzzyTitleMatch(target, originalTitle)) {
    return FUZZY_TITLE_MATCH_SCORE;
  }
  return 0;
}

function titleTokens(title: string): string[] {
  return title.split(' ').filter(Boolean);
}

function tokenDiceScore(left: string, right: string): number {
  const leftTokens = new Set(titleTokens(left));
  const rightTokens = new Set(titleTokens(right));
  if (leftTokens.size < 2 || rightTokens.size < 2) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

function isStrongFuzzyTitleMatch(target: string, candidate: string): boolean {
  if (!candidate) return false;
  return tokenDiceScore(target, candidate) >= STRONG_TOKEN_SIMILARITY;
}

export async function collectTMDBSearchResults<TResult extends { id: number }>(input: {
  title: string;
  year: number;
  search: (title: string, year: number | null) => Promise<TResult[]>;
}): Promise<TResult[]> {
  const collected = new Map<number, TResult>();

  if (input.year > 0) {
    const scopedResults = await input.search(input.title, input.year);
    for (const result of scopedResults) collected.set(result.id, result);
  }

  const broadResults = await input.search(input.title, null);
  for (const result of broadResults) collected.set(result.id, result);

  return Array.from(collected.values());
}

export function rankTMDBSearchCandidates<TResult, TCandidate extends TMDBScoredSearchCandidate>(
  results: TResult[],
  toCandidate: (result: TResult) => TCandidate,
): TCandidate[] {
  return results
    .map(toCandidate)
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

export function decideTMDBSearchMatch<TCandidate extends TMDBScoredSearchCandidate>(
  candidates: readonly TCandidate[],
  options: {
    matchThreshold: number;
    ambiguousRunnerUpThreshold: number;
    ambiguousScoreGap: number;
  },
): TMDBSearchMatchDecision<TCandidate> {
  const best = candidates[0];
  if (!best) return { status: 'not_found', best: null };

  const runnerUp = candidates[1];
  const isAmbiguous =
    runnerUp &&
    runnerUp.confidence >= options.ambiguousRunnerUpThreshold &&
    best.confidence - runnerUp.confidence <= options.ambiguousScoreGap;

  if (isAmbiguous) return { status: 'ambiguous', best };
  if (best.confidence < options.matchThreshold) return { status: 'not_found', best };
  return { status: 'matched', best };
}

export async function resolveTMDBSearchMatch<
  TResult extends { id: number },
  TCandidate extends TMDBScoredSearchCandidate,
>(input: {
  title: string;
  year: number;
  search: (title: string, year: number | null) => Promise<TResult[]>;
  toCandidate: (result: TResult) => TCandidate;
  matchThreshold: number;
  ambiguousRunnerUpThreshold: number;
  ambiguousScoreGap: number;
}): Promise<TMDBSearchMatchResult<TCandidate>> {
  const searchResults = await collectTMDBSearchResults({
    title: input.title,
    year: input.year,
    search: input.search,
  });
  const candidates = rankTMDBSearchCandidates(searchResults, input.toCandidate);
  const decision = decideTMDBSearchMatch(candidates, {
    matchThreshold: input.matchThreshold,
    ambiguousRunnerUpThreshold: input.ambiguousRunnerUpThreshold,
    ambiguousScoreGap: input.ambiguousScoreGap,
  });

  if (decision.status === 'matched') {
    return { status: 'matched', best: decision.best, candidates };
  }

  return { status: decision.status, candidates };
}
