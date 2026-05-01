// Main utils exports - organized by functionality

// Shared types (central type definitions)
export * from './types';

// Schemas (validation schemas)
export * from './schemas';

// Data processing and parsing (re-export specific functions to avoid type conflicts)
export {
  cleanMovieName,
  convertTextToMovieObjects,
  extractYearFromTitleLine,
  getMovieFileStats,
  getMovieStats,
  parseMovieNameAndYear,
  processMoviesFile,
  splitMovieDocument,
} from './data';

// AI and machine learning (re-export specific functions)
export { createEmbeddingsForChunks, createEmbeddingsWithProgress } from './ai/embeddings';

// Database operations (re-export specific functions)
export {
  batchInsertMovies,
  batchInsertMoviesWithDuplicateCheck,
  insertMovies,
} from './database/operations';

export { filterExistingMovies, getMovieCount, movieExists } from './database/validation';

// UI utilities
export { getPersonColors } from './ui/colors';

// Movie utilities
export * from './movies';
