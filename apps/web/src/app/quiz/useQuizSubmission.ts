'use client';

import { useCallback, useEffect, useRef } from 'react';

import { getCsrfToken } from '@/lib/csrfClient';

import { toApiFormat, toFastPickApiFormat } from './constants';

import type { PersonAnswers } from './types';

type ExperienceMode = 'fast-pick' | 'normal-match';

type SubmissionArgs = {
  experienceMode: ExperienceMode;
  isFastFlow: boolean;
  mode: 'solo' | 'group';
  onFailure: () => void;
  onSuccess: (id: string) => void;
  people: PersonAnswers[];
  resetSubmitting: () => void;
  youLabel: string;
};

function resolveSubmissionPeople({
  mode,
  people,
  youLabel,
}: {
  mode: 'solo' | 'group';
  people: PersonAnswers[];
  youLabel: string;
}) {
  if (mode !== 'solo') return people;

  return people.map((person, index) => (index === 0 ? { ...person, name: youLabel } : person));
}

function toRecommendationRequestBody({
  experienceMode,
  isFastFlow,
  mode,
  people,
  youLabel,
}: {
  experienceMode: ExperienceMode;
  isFastFlow: boolean;
  mode: 'solo' | 'group';
  people: PersonAnswers[];
  youLabel: string;
}) {
  const resolved = resolveSubmissionPeople({ mode, people, youLabel });
  const apiData = resolved.map((person) =>
    isFastFlow ? toFastPickApiFormat(person) : toApiFormat(person),
  );
  const dataToSend = apiData.length === 1 ? apiData[0] : apiData;

  if (experienceMode === 'fast-pick') {
    return { experienceMode, people: dataToSend };
  }

  return dataToSend;
}

async function postRecommendation(requestBody: unknown) {
  return fetch('/api/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
    },
    body: JSON.stringify(requestBody),
  });
}

async function handleSubmissionResponse({
  onFailure,
  onSuccess,
  resetSubmitting,
  res,
}: {
  onFailure: () => void;
  onSuccess: (id: string) => void;
  resetSubmitting: () => void;
  res: Response;
}) {
  if (!res.ok) {
    resetSubmitting();
    onFailure();
    return;
  }

  const { id } = (await res.json()) as { id: string };
  resetSubmitting();
  onSuccess(id);
}

async function submitQuizRecommendation({
  experienceMode,
  isFastFlow,
  mode,
  onFailure,
  onSuccess,
  people,
  resetSubmitting,
  youLabel,
}: SubmissionArgs) {
  const requestBody = toRecommendationRequestBody({
    experienceMode,
    isFastFlow,
    mode,
    people,
    youLabel,
  });

  try {
    const res = await postRecommendation(requestBody);
    await handleSubmissionResponse({ onFailure, onSuccess, resetSubmitting, res });
  } catch {
    resetSubmitting();
    onFailure();
  }
}

export function useQuizSubmission({
  experienceMode,
  isFastFlow,
  isSubmitting,
  mode,
  onFailure,
  onSuccess,
  people,
  youLabel,
}: {
  experienceMode: ExperienceMode;
  isFastFlow: boolean;
  isSubmitting: boolean;
  mode: 'solo' | 'group';
  onFailure: () => void;
  onSuccess: (id: string) => void;
  people: PersonAnswers[];
  youLabel: string;
}) {
  const submittingRef = useRef(false);
  const resetSubmitting = useCallback(() => {
    submittingRef.current = false;
  }, []);

  useEffect(() => {
    if (!isSubmitting) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    void submitQuizRecommendation({
      experienceMode,
      isFastFlow,
      mode,
      onFailure,
      onSuccess,
      people,
      resetSubmitting,
      youLabel,
    });
  }, [
    experienceMode,
    isFastFlow,
    isSubmitting,
    mode,
    onFailure,
    onSuccess,
    people,
    resetSubmitting,
    youLabel,
  ]);
}
