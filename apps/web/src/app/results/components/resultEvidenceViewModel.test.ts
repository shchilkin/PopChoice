import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/locales/en';

import { buildResultEvidenceViewModel } from './resultEvidenceViewModel';

import type { RecommendationResultSignals } from '@/lib/db/recommendations';
import type { MovieRecommendation } from '@/utils/client';

const movie: MovieRecommendation = {
  age_rating: 'PG-13',
  description: 'Because it fits.',
  duration: 116,
  fromTMDB: false,
  id: 1,
  isMainRecommendation: true,
  name: 'Arrival',
  score_rating: 8.5,
  similarity: 0.91,
  year: 2016,
};

const resultSignals: RecommendationResultSignals = {
  actorSignals: ['Amy Adams'],
  avoidSignals: ['horror', 'long runtime', 'too obvious', 'already-seen movies'],
  eraSignals: ['Both new and classic'],
  hasReferenceMovie: true,
  moodSignals: ['Drama', 'Science Fiction'],
  toneSignals: ['Serious and thought-provoking'],
};

describe('buildResultEvidenceViewModel', () => {
  it('turns quiz and movie metadata into fit and considered signals', () => {
    const view = buildResultEvidenceViewModel({
      copy: en.results,
      isGroupResult: false,
      movie,
      resultSignals,
      usedBroaderSearch: false,
    });

    expect(view.fitSignals).toEqual(
      expect.arrayContaining([
        { label: en.results.evidenceMoodLabel, value: 'Drama, Science Fiction' },
        { label: en.results.evidenceToneLabel, value: 'Serious and thought-provoking' },
        { label: en.results.evidenceReferenceLabel, value: en.results.evidenceReferenceValue },
      ]),
    );
    expect(view.consideredSignals).toEqual(
      expect.arrayContaining([
        {
          label: en.results.evidenceAvoidLabel,
          value: 'horror, long runtime, too obvious, already-seen picks',
        },
        {
          label: en.results.evidenceRuntimeLabel,
          value: '116 min, kept easy to start',
        },
        {
          label: en.results.evidenceSourceLabel,
          value: en.results.evidenceSourceLocalValue,
        },
      ]),
    );
  });

  it('marks group recommendations and broader search', () => {
    const view = buildResultEvidenceViewModel({
      copy: en.results,
      isGroupResult: true,
      movie: { ...movie, duration: 141, fromTMDB: true },
      resultSignals: { ...resultSignals, avoidSignals: [] },
      usedBroaderSearch: true,
    });

    expect(view.fitSignals).toContainEqual({
      label: en.results.evidenceGroupLabel,
      value: en.results.evidenceGroupValue,
    });
    expect(view.consideredSignals).toContainEqual({
      label: en.results.evidenceSourceLabel,
      value: en.results.evidenceSourceTmdbValue,
    });
    expect(view.consideredSignals).toContainEqual({
      label: en.results.evidenceRuntimeLabel,
      value: '141 min, checked against the rest of the match',
    });
  });
});
