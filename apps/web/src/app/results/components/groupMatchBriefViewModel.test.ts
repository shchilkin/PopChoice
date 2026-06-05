import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/locales/en';

import { buildGroupMatchBriefViewModel } from './groupMatchBriefViewModel';

import type { GroupResultInsights } from '@/features/recommendation/groupResultInsights';

const insights: GroupResultInsights = {
  participantNames: ['Ada', 'Grace'],
  participantProfiles: [
    {
      name: 'Ada',
      favoriteMovie: 'Arrival',
      moodPreferences: ['science fiction', 'drama'],
      tonePreference: 'light and fun',
      eraPreference: 'new releases',
    },
    {
      name: 'Grace',
      favoriteMovie: null,
      moodPreferences: [],
      tonePreference: null,
      eraPreference: null,
    },
  ],
  sharedMoods: ['science fiction'],
  tonePreferences: ['dark and intense', 'balanced'],
  eraPreferences: ['timeless classics'],
  favoriteActors: ['Sigourney Weaver', 'Oscar Isaac'],
};

describe('buildGroupMatchBriefViewModel', () => {
  it('localizes joined group signals and participant rows', () => {
    const view = buildGroupMatchBriefViewModel(insights, en, 'en');

    expect(view.peopleValue).toContain('2');
    expect(view.peopleValue).toContain('Ada');
    expect(view.sharedMoods).toBe(en.genres.scifi);
    expect(view.tones).toContain(en.tones.dark.label);
    expect(view.tones).toContain(en.tones.balanced.label);
    expect(view.eras).toBe(en.quiz.era.classic.title);
    expect(view.actorsText).toContain('Sigourney Weaver');
    expect(view.hasActors).toBe(true);
    expect(view.hasParticipantSignals).toBe(true);
    expect(view.participants[0]).toMatchObject({
      name: 'Ada',
      favoriteMovie: 'Arrival',
      moodValue: `${en.genres.scifi} & ${en.genres.drama}`,
      toneValue: en.tones.light.label,
      eraValue: en.quiz.era.new.title,
    });
  });

  it('uses translated fallbacks for missing optional group signals', () => {
    const view = buildGroupMatchBriefViewModel(
      {
        participantNames: ['Solo'],
        participantProfiles: [],
        sharedMoods: [],
        tonePreferences: [],
        eraPreferences: [],
        favoriteActors: [],
      },
      en,
      'en',
    );

    expect(view.sharedMoods).toBe(en.results.groupBriefNoSharedMoods);
    expect(view.tones).toBe(en.results.groupBriefMixedSignals);
    expect(view.eras).toBe(en.results.groupBriefMixedSignals);
    expect(view.actorsText).toBeNull();
    expect(view.hasActors).toBe(false);
    expect(view.hasParticipantSignals).toBe(false);
  });
});
