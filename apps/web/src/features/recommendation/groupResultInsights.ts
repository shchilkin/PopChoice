type UnknownRecord = Record<string, unknown>;

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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter((item): item is string => item !== null);
}

function cleanStringValues(values: unknown[]): string[] {
  return values.map(cleanString).filter((item): item is string => item !== null);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function intersectMoodPreferences(people: UnknownRecord[]): string[] {
  const moodGroups = people.map((person) => cleanStringArray(person.moodPreference));
  if (moodGroups.some((moods) => moods.length === 0)) return [];

  const [firstGroup = []] = moodGroups;
  return firstGroup.filter((mood) =>
    moodGroups.every((moods) =>
      moods.some((candidate) => candidate.toLocaleLowerCase() === mood.toLocaleLowerCase()),
    ),
  );
}

export function buildGroupResultInsights(quizData: unknown): GroupResultInsights | null {
  if (!Array.isArray(quizData) || quizData.length < 2) return null;

  const people = quizData.filter(isRecord);
  if (people.length < 2) return null;

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
