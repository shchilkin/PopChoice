'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionCard } from './QuestionCard';
import { Button } from '../Button/Button';
import axios from 'axios';

export interface FormData {
  favoriteMovie: string;
  moodPreference: string;
  tonePreference: string;
}

export const QuestionsForm = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    favoriteMovie: '',
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
    formData.moodPreference.trim() !== '' &&
    formData.tonePreference.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && !loading) {
      setLoading(true);
      try {
        const response = await axios.post('/api/movie-recommendation', formData);
        // Store recommendation in localStorage
        localStorage.setItem('popchoice_recommendation', response.data.data);
        // Redirect to movie-suggestion page
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
    <form className="max-w-md mx-auto w-full" onSubmit={handleSubmit}>
      <section className="flex flex-col items-center w-full gap-6">
        <div className="flex flex-col gap-6 w-full">
          <QuestionCard
            label="What's your favorite movie and why?"
            placeholder="Share your thoughts on your favorite movie, including its plot, characters, and what makes it special to you."
            value={formData.favoriteMovie}
            onChange={(value) => handleInputChange('favoriteMovie', value)}
            name="favoriteMovie"
          />

          <QuestionCard
            label="Are you in the mood for something new or a classic?"
            placeholder="Let us know if you prefer to watch a new release or revisit a classic film. Share your reasons!"
            value={formData.moodPreference}
            onChange={(value) => handleInputChange('moodPreference', value)}
            name="moodPreference"
          />

          <QuestionCard
            label="Do you wanna have fun or do you want something serious?"
            placeholder="Share your thoughts on the tone you're looking for in a movie."
            value={formData.tonePreference}
            onChange={(value) => handleInputChange('tonePreference', value)}
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
