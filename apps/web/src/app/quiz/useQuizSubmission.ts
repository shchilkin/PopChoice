'use client';

import { useEffect, useRef } from 'react';

import { getCsrfToken } from '@/lib/csrfClient';

import { toApiFormat, toFastPickApiFormat } from './constants';

import type { PersonAnswers } from './types';

type ExperienceMode = 'fast-pick' | 'normal-match';

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

  useEffect(() => {
    if (!isSubmitting) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    async function submit() {
      const resolved =
        mode === 'solo'
          ? people.map((person, index) => (index === 0 ? { ...person, name: youLabel } : person))
          : people;
      const apiData = resolved.map((person) =>
        isFastFlow ? toFastPickApiFormat(person) : toApiFormat(person),
      );
      const dataToSend = apiData.length === 1 ? apiData[0] : apiData;
      const requestBody =
        experienceMode === 'fast-pick' ? { experienceMode, people: dataToSend } : dataToSend;

      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          submittingRef.current = false;
          onFailure();
          return;
        }

        const { id } = (await res.json()) as { id: string };
        submittingRef.current = false;
        onSuccess(id);
      } catch {
        submittingRef.current = false;
        onFailure();
      }
    }

    void submit();
  }, [experienceMode, isFastFlow, isSubmitting, mode, onFailure, onSuccess, people, youLabel]);
}
