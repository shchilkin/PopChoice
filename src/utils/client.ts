// Client-safe utils exports - only utilities that work in the browser

// Shared types (central type definitions)
export * from './types';

// Schemas (validation schemas)
export * from './schemas';

// Data processing and parsing (client-safe functions only)
export { cleanMovieName } from './data/cleanMovieName';
export { convertTextToMovieObjects } from './data/convertTextToMovieObjects';
export { extractYearFromTitleLine } from './data/extractYearFromTitleLine';
export { parseMovieNameAndYear } from './data/parseMovieNameAndYear';

// AI and machine learning (client-safe functions)
// Note: Embedding creation requires server-side API calls

// UI utilities
export { getPersonColors } from './ui/colors';

// Movie utilities (client-safe)
export * from './movies';
