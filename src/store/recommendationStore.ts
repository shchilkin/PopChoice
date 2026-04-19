import { create } from 'zustand';

import type { ApiResponse, PersonFormData } from '@/app/api/movie-recommendation/types';

interface RecommendationState {
  quizData: PersonFormData[] | null;
  setQuizData: (data: PersonFormData[]) => void;
  recommendation: ApiResponse | null;
  setRecommendation: (data: ApiResponse) => void;
  clearState: () => void;
}

export const useRecommendationStore = create<RecommendationState>((set) => ({
  quizData: null,
  setQuizData: (data) => set({ quizData: data }),
  recommendation: null,
  setRecommendation: (data) => set({ recommendation: data }),
  clearState: () => set({ quizData: null, recommendation: null }),
}));
