import { describe, expect, it } from 'vitest';

import {
  collectTMDBSearchResults,
  decideTMDBSearchMatch,
  normalizeTMDBTitle,
  rankTMDBSearchCandidates,
  resolveTMDBSearchMatch,
  scoreTMDBTitleMatch,
} from './tmdbSearchMatching.js';

describe('TMDB search matching', () => {
  it('normalizes punctuation, articles, accents, ampersands, and spacing', () => {
    expect(normalizeTMDBTitle('  The Am\u00e9lie & Friends: Part II  ')).toBe(
      'amelie and friends part ii',
    );
  });

  it('scores exact normalized title and original title matches', () => {
    expect(scoreTMDBTitleMatch({ title: 'The Matrix' }, 'Matrix')).toBe(0.75);
    expect(scoreTMDBTitleMatch({ title: 'Solaris', original_title: 'Solyaris' }, 'Solyaris')).toBe(
      0.75,
    );
  });

  it('scores strong multi-token fuzzy title matches without accepting broad one-word titles', () => {
    expect(
      scoreTMDBTitleMatch(
        { title: 'Ivan Vasilyevich Changes His Profession' },
        'Ivan Vasilyevich Changes Profession',
      ),
    ).toBe(0.68);
    expect(scoreTMDBTitleMatch({ title: 'Other Movie' }, 'Movie')).toBe(0);
  });

  it('deduplicates year-scoped and broad TMDB search results by id', async () => {
    const results = await collectTMDBSearchResults({
      title: 'Movie',
      year: 2024,
      search: async (_title, year) =>
        year === 2024
          ? [{ id: 1, title: 'Movie' }]
          : [
              { id: 1, title: 'Movie duplicate' },
              { id: 2, title: 'Movie broad' },
            ],
    });

    expect(results).toEqual([
      { id: 1, title: 'Movie duplicate' },
      { id: 2, title: 'Movie broad' },
    ]);
  });

  it('ranks positive-confidence candidates and decides match status', () => {
    const candidates = rankTMDBSearchCandidates(
      [
        { id: 1, confidence: 0 },
        { id: 2, confidence: 0.95 },
        { id: 3, confidence: 0.7 },
      ],
      (candidate) => candidate,
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual([2, 3]);
    expect(
      decideTMDBSearchMatch(candidates, {
        matchThreshold: 0.9,
        ambiguousRunnerUpThreshold: 0.82,
        ambiguousScoreGap: 0.08,
      }),
    ).toEqual({ status: 'matched', best: { id: 2, confidence: 0.95 } });
  });

  it('returns ambiguous and not_found decisions for weak top candidates', () => {
    expect(
      decideTMDBSearchMatch([{ confidence: 0.9 }, { confidence: 0.85 }], {
        matchThreshold: 0.9,
        ambiguousRunnerUpThreshold: 0.82,
        ambiguousScoreGap: 0.08,
      }).status,
    ).toBe('ambiguous');

    expect(
      decideTMDBSearchMatch([{ confidence: 0.7 }], {
        matchThreshold: 0.9,
        ambiguousRunnerUpThreshold: 0.82,
        ambiguousScoreGap: 0.08,
      }).status,
    ).toBe('not_found');
  });

  it('resolves a complete search match from raw results', async () => {
    const match = await resolveTMDBSearchMatch({
      title: 'Movie',
      year: 2024,
      search: async () => [
        { id: 1, title: 'Movie', release_date: '2024-01-01' },
        { id: 2, title: 'Other', release_date: '2024-01-01' },
      ],
      toCandidate: (result) => ({
        id: result.id,
        confidence: scoreTMDBTitleMatch(result, 'Movie') + 0.25,
      }),
      matchThreshold: 0.9,
      ambiguousRunnerUpThreshold: 0.82,
      ambiguousScoreGap: 0.08,
    });

    expect(match).toEqual({
      status: 'matched',
      best: { id: 1, confidence: 1 },
      candidates: [
        { id: 1, confidence: 1 },
        { id: 2, confidence: 0.25 },
      ],
    });
  });
});
