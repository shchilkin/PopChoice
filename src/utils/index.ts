// Main utils exports - organized by functionality

// Shared types (central type definitions)
export * from './types';

// Schemas (validation schemas)
export * from './schemas';

// Data processing and parsing (re-export specific functions to avoid type conflicts)
export {
  ageRatings,
  cleanMovieName,
  convertTextToMovieObjects,
  extractYearFromTitleLine,
  movieSchema,
  parseMovieNameAndYear,
  processMoviesFile,
} from './data/movieParser';

export { getMovieFileStats, splitMovieDocument } from './data/movieSplitter';

export { getMovieStats } from './data/movieAnalyzer';

// AI and machine learning (re-export specific functions)
export { createEmbeddingsForChunks, createEmbeddingsWithProgress } from './ai/embeddings';

// Database operations (re-export specific functions)
export {
  batchInsertMovies,
  batchInsertMoviesWithDuplicateCheck,
  insertMoviesIntoSupabase,
} from './database/operations';

export { filterExistingMovies, getMovieCount, movieExists } from './database/validation';

// UI utilities
export { getPersonColors } from './ui/colors';
