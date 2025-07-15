'use client';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Button } from '../../Button/Button';
import { QuestionCard } from '../QuestionCard';

import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';

export interface FormData {
  favoriteMovie: string;
  newVsClassic: string;
  moodPreference: string;
  tonePreference: string;
}

export const QuestionsForm = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    favoriteMovie: '',
    newVsClassic: '',
    moodPreference: '',
    tonePreference: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFormValid =
    formData.favoriteMovie.trim() !== '' &&
    formData.newVsClassic.trim() !== '' &&
    formData.moodPreference.trim() !== '' &&
    formData.tonePreference.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && !loading) {
      setLoading(true);
      try {
        const response = await axios.post('/api/movie-recommendation', formData);
        // TODO: validate data
        // Store recommendation in localStorage
        localStorage.setItem('popchoice_recommendation', JSON.stringify(response.data));
        router.push('/movie-suggestion');
      } catch (error) {
        alert('Error fetching recommendation');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <form
      id="movie-question-form"
      data-testid="movie-question-form"
      className="max-w-md mx-auto w-full"
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
          />
          <MultipleChoiceQuestion
            question="Are you in the mood for something new or a classic?"
            options={['New', 'Classic']}
            selectedValue={formData.newVsClassic}
            onChange={(value: string) => handleInputChange('newVsClassic', value)}
            name="newVsClassic"
          />
          <MultipleChoiceQuestion
            question="What are you in the mood for?"
            options={['Fun', 'Serious', 'Inspiring', 'Scary']}
            selectedValue={formData.moodPreference}
            onChange={(value: string) => handleInputChange('moodPreference', value)}
            name="moodPreference"
          />

          <QuestionCard
            label="Which famous film person would you love to be stranded on an island with and why?"
            placeholder="Tom Hanks because he is really funny and can do the voice of Woody"
            value={formData.tonePreference}
            onChange={(value: string) => handleInputChange('tonePreference', value)}
            name="tonePreference"
          />
        </div>

        <Button disabled={!isFormValid || loading} onClick={handleSubmit}>
          {loading ? 'Finding...' : 'Find Me a Movie'}
        </Button>
      </section>
    </form>
  );
};
