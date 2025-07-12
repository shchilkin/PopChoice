'use client';
import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('questions');
  const tButtons = useTranslations('buttons');
  const tErrors = useTranslations('errors');

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
        const response = await axios.post(`/${locale}/api/movie-recommendation`, formData);
        // Store recommendation in localStorage
        localStorage.setItem('popchoice_recommendation', response.data.data);
        // Redirect to movie-suggestion page
        router.push(`/${locale}/movie-suggestion`);
      } catch (error) {
        alert(tErrors('fetchError'));
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
            label={t('favoriteMovie.label')}
            placeholder={t('favoriteMovie.placeholder')}
            value={formData.favoriteMovie}
            onChange={(value) => handleInputChange('favoriteMovie', value)}
            name="favoriteMovie"
          />

          <QuestionCard
            label={t('moodPreference.label')}
            placeholder={t('moodPreference.placeholder')}
            value={formData.moodPreference}
            onChange={(value) => handleInputChange('moodPreference', value)}
            name="moodPreference"
          />

          <QuestionCard
            label={t('tonePreference.label')}
            placeholder={t('tonePreference.placeholder')}
            value={formData.tonePreference}
            onChange={(value) => handleInputChange('tonePreference', value)}
            name="tonePreference"
          />
        </div>

        <Button disabled={!isFormValid || loading} onClick={handleSubmit}>
          {loading ? tButtons('finding') : tButtons('findMovie')}
        </Button>
      </section>
    </form>
  );
};
