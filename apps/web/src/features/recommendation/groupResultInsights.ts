import {
  cleanString,
  cleanStringArray,
  cleanStringValues,
  groupPeople,
  hasFavoriteActor,
  intersectMoodPreferences,
  quizPeople,
  uniqueStrings,
} from './groupResultInsightInput';

export interface GroupResultInsights {
  participantNames: string[];
  participantProfiles: GroupParticipantProfile[];
  sharedMoods: string[];
  tonePreferences: string[];
  eraPreferences: string[];
  favoriteActors: string[];
}

export interface GroupParticipantProfile {
  name: string;
  favoriteMovie: string | null;
  moodPreferences: string[];
  tonePreference: string | null;
  eraPreference: string | null;
}

export function getQuizPeopleCount(quizData: unknown): number {
  return Array.isArray(quizData) ? Math.max(quizData.length, 1) : 1;
}

export function hasFavoriteActorSignal(quizData: unknown): boolean {
  return quizPeople(quizData).some(hasFavoriteActor);
}

export function buildGroupResultInsights(quizData: unknown): GroupResultInsights | null {
  const people = groupPeople(quizData);
  if (!people) return null;

  return {
    participantNames: people.map(
      (person, index) => cleanString(person.name) ?? `Person ${index + 1}`,
    ),
    participantProfiles: people.map((person, index) => ({
      name: cleanString(person.name) ?? `Person ${index + 1}`,
      favoriteMovie: cleanString(person.favoriteMovie),
      moodPreferences: cleanStringArray(person.moodPreference),
      tonePreference: cleanString(person.tonePreference),
      eraPreference: cleanString(person.newVsClassic),
    })),
    sharedMoods: uniqueStrings(intersectMoodPreferences(people)),
    tonePreferences: uniqueStrings(
      cleanStringValues(people.map((person) => person.tonePreference)),
    ),
    eraPreferences: uniqueStrings(cleanStringValues(people.map((person) => person.newVsClassic))),
    favoriteActors: uniqueStrings(cleanStringValues(people.map((person) => person.favoriteActor))),
  };
}
