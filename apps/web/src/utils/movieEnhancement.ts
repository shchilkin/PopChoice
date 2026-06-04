/**
 * Client-side movie enhancement utilities
 * These functions work in the browser and provide better movie search/poster experiences
 */

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
