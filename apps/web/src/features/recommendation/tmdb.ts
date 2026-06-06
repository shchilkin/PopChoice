export { MAX_TOTAL_MOVIES } from './config';
export { parseTMDBReleaseYear } from '@/lib/tmdb';

export { buildTMDBDiscoverQueryShape, fetchTMDBDiscoverMovies } from './tmdb/discover';
export { enrichTMDBMatchesWithDetails } from './tmdb/enrichment';
export { scoreAndConvertTMDBMovies } from './tmdb/scoring';
export { seedMovies, seedMoviesInBackground } from './tmdb/seeding';
export { deserializeTMDBEmbeddings, serializeTMDBEmbeddings } from './tmdb/serialization';

export type { TMDBDiscoverMovie } from './tmdb/types';
export type { SerializableTMDBEmbeddings } from './tmdb/serialization';
