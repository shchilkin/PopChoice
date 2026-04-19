/**
 * Client-side movie enhancement utilities
 * These functions work in the browser and provide better movie search/poster experiences
 */

import { getCsrfToken } from '@/lib/csrfClient';

export interface MovieRecommendation {
  id: number;
  name: string;
  year: number;
  similarity: number;
  age_rating?: string;
  duration?: number;
  score_rating?: number;
  posterURL?: string;
  description?: string;
  localizedName?: string;
  isMainRecommendation?: boolean;
  /** True for movies sourced from the TMDB fallback (negative IDs). */
  fromTMDB?: boolean;
}

/**
 * Batch enhance multiple movies with posters by calling the secure backend API
 */
export async function enhanceMoviesWithPosters(
  movies: MovieRecommendation[],
): Promise<MovieRecommendation[]> {
  try {
    const response = await fetch('/api/enhance-movies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({ movies }),
    });

    if (!response.ok) {
      console.warn('Failed to enhance movies via backend API:', response.status);
      return movies;
    }

    const data = await response.json();
    return data.enhancedMovies || movies;
  } catch (error) {
    console.warn('Error calling enhance-movies API:', error);
    return movies;
  }
}
