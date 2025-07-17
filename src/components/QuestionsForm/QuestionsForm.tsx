'use client';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import React, { useCallback, useMemo, useState } from 'react';

import { Button } from '../Button/Button';

import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { QuestionCard } from './QuestionCard';

export interface FormData {
  favoriteMovie: string;
  newVsClassic: string;
  moodPreference: string[]; // Changed to array for multi-select
  tonePreference: string;
}

interface QuestionsFormProps {
  personIndex?: number;
  onComplete?: () => void;
  isCompleted?: boolean;
  allCompleted?: boolean;
  totalPeople?: number;
}

// Validation helper
const validatePersonData = (data: Partial<FormData>): boolean => {
  return (
    Boolean(data.favoriteMovie?.trim()) &&
    Boolean(data.newVsClassic?.trim()) &&
    (Array.isArray(data.moodPreference)
      ? data.moodPreference.length > 0
      : Boolean(data.moodPreference)) &&
    Boolean(data.tonePreference?.trim())
  );
};

// Storage helpers
const getPersonStorageKey = (personIndex: number): string => `popchoice_person_${personIndex}_data`;

const getStoredPersonData = (personIndex: number): FormData | null => {
  if (typeof window === 'undefined') return null;

  const savedData = localStorage.getItem(getPersonStorageKey(personIndex));
  return savedData ? JSON.parse(savedData) : null;
};

const savePersonData = (personIndex: number, data: FormData): void => {
  localStorage.setItem(getPersonStorageKey(personIndex), JSON.stringify(data));
};

const clearAllPersonData = (totalPeople: number): void => {
  for (let i = 0; i < totalPeople; i++) {
    localStorage.removeItem(getPersonStorageKey(i));
  }
  localStorage.removeItem('popchoice_peopleAndTimeData');
};

export const QuestionsForm = ({
  personIndex = 0,
  onComplete,
  isCompleted = false,
  allCompleted = false,
  totalPeople = 1,
}: QuestionsFormProps) => {
  const router = useRouter();

  // Initialize form data
  const [formData, setFormData] = useState<FormData>(() => {
    const storedData = getStoredPersonData(personIndex);
    return (
      storedData || {
        favoriteMovie: '',
        newVsClassic: '',
        moodPreference: [],
        tonePreference: '',
      }
    );
  });

  const [loading, setLoading] = useState(false);

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      formData.favoriteMovie.trim() !== '' &&
      formData.newVsClassic.trim() !== '' &&
      formData.moodPreference.length > 0 &&
      formData.tonePreference.trim() !== ''
    );
  }, [formData]);

  // Handle input changes
  const handleInputChange = useCallback(
    (name: string, value: string | string[]) => {
      const newFormData = { ...formData, [name]: value };
      setFormData(newFormData);
      savePersonData(personIndex, newFormData);
    },
    [formData, personIndex],
  );

  // Check if all people have completed their forms
  const checkAllPeopleCompleted = useCallback((): boolean => {
    for (let i = 0; i < totalPeople; i++) {
      const personData = getStoredPersonData(i);
      if (!personData || !validatePersonData(personData)) {
        return false;
      }
    }
    return true;
  }, [totalPeople]);

  // Collect all people's data
  const collectAllPeopleData = useCallback((): FormData[] => {
    const allData: FormData[] = [];
    for (let i = 0; i < totalPeople; i++) {
      const personData = getStoredPersonData(i);
      if (personData) {
        allData.push(personData);
      }
    }
    return allData;
  }, [totalPeople]);

  // Determine if we can show final submit button
  const canSubmitFinal = useMemo(() => {
    return allCompleted || totalPeople === 1 || checkAllPeopleCompleted();
  }, [allCompleted, totalPeople, checkAllPeopleCompleted]);

  // Determine if this is the last person in sequence
  const isLastPerson = personIndex === totalPeople - 1;

  // Handle saving current person's data
  const handleSave = useCallback(() => {
    if (!isFormValid) return;

    // Mark this person as completed
    onComplete?.();
  }, [isFormValid, onComplete]);

  // Handle final submission
  const handleFinalSubmit = useCallback(async () => {
    if (loading) return;

    // Check if all people have completed their forms
    const canProceed = allCompleted || totalPeople === 1 || checkAllPeopleCompleted();

    if (!canProceed) {
      alert(
        'Please make sure all people have completed their movie preferences before finding a movie.',
      );
      return;
    }

    setLoading(true);
    try {
      // Collect all people's data for the API call
      const allPeopleData = collectAllPeopleData();

      // Send all people's data to the API (not just the first person)
      const dataToSend = allPeopleData.length > 0 ? allPeopleData : [formData];

      const response = await axios.post('/api/movie-recommendation', dataToSend);
      localStorage.setItem('popchoice_recommendation', JSON.stringify(response.data));

      // Clear all data after successful submission
      clearAllPersonData(totalPeople);

      router.push('/movie-suggestion');
    } catch (error) {
      alert('Error fetching recommendation');
      // TODO: Implement better error handling
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    allCompleted,
    totalPeople,
    checkAllPeopleCompleted,
    collectAllPeopleData,
    formData,
    router,
    setLoading,
  ]);

  // Handle form submission (prevent default)
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Form submission is handled by specific button clicks
  }, []);

  return (
    <>
      <form
        id="movie-question-form"
        data-testid="movie-question-form"
        className="max-w-md mx-auto w-full pb-4"
        onSubmit={handleSubmit}
      >
        <section className="flex flex-col items-center w-full gap-6">
          <div className="flex flex-col gap-6 w-full">
            <QuestionCard
              label="What's your favorite movie and why?"
              placeholder="Share your thoughts on your favorite movie, including its plot, characters, and what makes it special to you."
              value={formData.favoriteMovie}
              onChange={(value: string) => handleInputChange('favoriteMovie', value)}
              name="favoriteMovie"
              maxLength={300}
            />
            <MultipleChoiceQuestion
              question="Are you in the mood for something new or a classic?"
              options={['New', 'Classic']}
              selectedValue={formData.newVsClassic}
              onChange={(value: string | string[]) => handleInputChange('newVsClassic', value)}
              name="newVsClassic"
            />
            <MultipleChoiceQuestion
              question="What are you in the mood for?"
              options={['Fun', 'Serious', 'Inspiring', 'Scary']}
              selectedValue={formData.moodPreference}
              onChange={(value: string | string[]) => handleInputChange('moodPreference', value)}
              name="moodPreference"
              multiSelect={true}
            />

            <QuestionCard
              label="Which famous film person would you love to be stranded on an island with and why?"
              placeholder="Tom Hanks because he is really funny and can do the voice of Woody"
              value={formData.tonePreference}
              onChange={(value: string) => handleInputChange('tonePreference', value)}
              name="tonePreference"
              maxLength={300}
              helperText="(auto-suggest)"
            />
          </div>
        </section>
      </form>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg">
        <div className="max-w-md mx-auto">
          {totalPeople === 1 ? (
            // Single person - simple submit button
            <Button
              disabled={!isFormValid || loading}
              onClick={handleFinalSubmit}
              className="w-full"
            >
              {loading ? 'Finding...' : 'Find Me a Movie'}
            </Button>
          ) : (
            // Multiple people - separate buttons for save and submit
            <div className="flex flex-col gap-3">
              {/* Save current person button */}
              {!isCompleted && (
                <Button
                  disabled={!isFormValid}
                  onClick={handleSave}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white"
                >
                  {isLastPerson
                    ? 'Complete Final Person'
                    : `Save & Continue to Person ${personIndex + 2}`}
                </Button>
              )}

              {/* Final submit button - only show when all people completed */}
              {canSubmitFinal && (
                <Button
                  disabled={loading}
                  onClick={handleFinalSubmit}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  {loading ? 'Finding...' : 'Find Our Movie'}
                </Button>
              )}

              {/* Update button for completed person */}
              {isCompleted && !canSubmitFinal && (
                <Button
                  disabled={!isFormValid}
                  onClick={handleSave}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Update Preferences
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
