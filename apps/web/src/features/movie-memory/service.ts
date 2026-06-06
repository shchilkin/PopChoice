import {
  deleteUserMovieMemory,
  getUserMovieMemoryPage,
  searchMovieCatalogForMemory,
  type UserMovieMemoryPage,
} from '@/lib/db/recommendations';

import type { MovieMemoryCandidate } from './types';

export { loadMovieMemoryCandidatesForUser } from './candidates';
export { parseMovieMemoryLocale } from './locale';
export { addMovieMemoryBatchForUser, addMovieMemoryItemForUser } from './mutations';
export {
  addMovieMemoryBatchSchema,
  addMovieMemorySchema,
  deleteMovieMemorySchema,
  listMovieMemorySchema,
  searchMovieMemorySchema,
} from './schemas';
export { CANDIDATE_LIMIT } from './types';

export type { MovieMemoryCandidate } from './types';

export function getMovieMemoryPageForUser(
  userId: string,
  pagination: { offset: number; limit: number },
): Promise<UserMovieMemoryPage> {
  return getUserMovieMemoryPage(userId, pagination);
}

export function searchMovieMemoryCatalog(query: string): Promise<MovieMemoryCandidate[]> {
  return searchMovieCatalogForMemory(query);
}

export function deleteMovieMemoryForUser(userId: string, movieKey: string): Promise<boolean> {
  return deleteUserMovieMemory(userId, movieKey);
}
