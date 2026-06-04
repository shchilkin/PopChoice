import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDiscoveryPayload,
  runSync,
  selectCandidatesWithValidYears,
  selectMoviesToProcess,
  toDiscoveryPartialRecord,
} from './sync.js';

import type { Config } from './config.js';
import type { MovieRecord } from './database.js';
import type { TMDBCatalogMetadata, TMDBMovie, TMDBMovieDetails } from './tmdb.js';

const mocks = vi.hoisted(() => ({
  createEmbeddings: vi.fn(),
  extractCatalogMetadata: vi.fn(),
  extractUSCertification: vi.fn(),
  fetchFromSources: vi.fn(),
  fetchMovieDetails: vi.fn(),
  filterNewMovies: vi.fn(),
  getMovieCount: vi.fn(),
  insertMovies: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  movieToEmbeddingText: vi.fn(),
  upsertMovieCatalogMetadata: vi.fn(),
}));

vi.mock('./database.js', () => ({
  filterNewMovies: mocks.filterNewMovies,
  getMovieCount: mocks.getMovieCount,
  insertMovies: mocks.insertMovies,
  upsertMovieCatalogMetadata: mocks.upsertMovieCatalogMetadata,
}));

vi.mock('./embeddings.js', () => ({
  createEmbeddings: mocks.createEmbeddings,
}));

vi.mock('./logger.js', () => ({
  logger: mocks.logger,
}));

vi.mock('./tmdb.js', () => ({
  extractCatalogMetadata: mocks.extractCatalogMetadata,
  extractUSCertification: mocks.extractUSCertification,
  fetchFromSources: mocks.fetchFromSources,
  fetchMovieDetails: mocks.fetchMovieDetails,
  movieToEmbeddingText: mocks.movieToEmbeddingText,
}));

const makeConfig = (overrides: Partial<Config> = {}): Config => ({
  databaseUrl: 'postgresql://localhost/test',
  dryRun: false,
  language: 'en-US',
  maxMoviesPerRun: 50,
  maxPagesPerSource: 1,
  minVoteAverage: 6.5,
  minVoteCount: 500,
  openaiApiKey: 'openai-key',
  schedule: '0 0 * * 0',
  sources: ['popular'],
  tmdbApiKey: 'tmdb-key',
  ...overrides,
});

const makeMovie = (overrides: Partial<TMDBMovie> = {}): TMDBMovie => ({
  adult: false,
  backdrop_path: null,
  genre_ids: [28],
  id: 1,
  original_language: 'en',
  overview: 'A strong movie overview with enough detail to pass the quality filter.',
  popularity: 42,
  poster_path: '/poster.jpg',
  release_date: '2024-01-15',
  title: 'Discovery Movie',
  vote_average: 7.4,
  vote_count: 900,
  ...overrides,
});

const makeDetails = (overrides: Partial<TMDBMovieDetails> = {}): TMDBMovieDetails => ({
  credits: { cast: [], crew: [] },
  genres: [],
  id: 1,
  keywords: { keywords: [] },
  overview: 'Detailed overview.',
  poster_path: '/localized.jpg',
  release_date: '2024-01-15',
  release_dates: { results: [] },
  runtime: 121,
  title: 'Localized Discovery Movie',
  vote_average: 7.8,
  vote_count: 1200,
  ...overrides,
});

const makeCatalogMetadata = (): TMDBCatalogMetadata => ({
  genres: [],
  keywords: [],
  people: [],
  snapshot: {
    cast: [],
    directors: [],
    genres: [],
    id: 1,
    keywords: [],
    poster_path: '/localized.jpg',
    release_date: '2024-01-15',
    runtime: 121,
    title: 'Localized Discovery Movie',
    vote_average: 7.8,
  },
});

describe('movie discovery sync helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractCatalogMetadata.mockReturnValue(null);
    mocks.extractUSCertification.mockReturnValue('NR');
    mocks.movieToEmbeddingText.mockReturnValue('details embedding text');
  });

  it('keeps only candidates with finite post-1800 release years', () => {
    const movies = [
      makeMovie({ id: 1, release_date: '2024-01-15' }),
      makeMovie({ id: 2, release_date: '' }),
      makeMovie({ id: 3, release_date: '1799-01-01' }),
      makeMovie({ id: 4, release_date: 'not-a-date' }),
    ];

    const result = selectCandidatesWithValidYears(movies);

    expect(result.validYearCandidates.map((movie) => movie.id)).toEqual([1]);
    expect(result.skipped).toBe(3);
  });

  it('builds dedupe partial records with placeholder fields before detail lookup', () => {
    const record = toDiscoveryPartialRecord(
      makeMovie({ overview: '', release_date: '2020-12-30', title: 'Sparse Movie' }),
    );

    expect(record).toMatchObject({
      age_rating: 'NR',
      description: 'No description available.',
      duration: 0,
      embedding: [],
      name: 'Sparse Movie',
      year: 2020,
    });
  });

  it('caps new indices and preserves source movie order', () => {
    const movies = [makeMovie({ id: 1 }), makeMovie({ id: 2 }), makeMovie({ id: 3 })];

    const result = selectMoviesToProcess(movies, [2, 0, 1], 2);

    expect(result.cappedIndices).toEqual([2, 0]);
    expect(result.moviesToProcess.map((movie) => movie.id)).toEqual([3, 1]);
  });

  it('builds records, embeddings, and catalog metadata with detail fallbacks', () => {
    const metadata = makeCatalogMetadata();
    mocks.extractUSCertification.mockReturnValueOnce('PG-13');
    mocks.extractCatalogMetadata.mockReturnValueOnce(metadata);
    mocks.movieToEmbeddingText.mockReturnValueOnce('details text');

    const movies = [
      makeMovie({ id: 1, title: 'Detailed Movie' }),
      makeMovie({ id: 2, overview: '', poster_path: null, title: 'Fallback Movie' }),
    ];
    const result = buildDiscoveryPayload(movies, [makeDetails(), null]);

    expect(result.partialRecords).toEqual([
      expect.objectContaining({
        age_rating: 'PG-13',
        duration: 121,
        localized_name: 'Localized Discovery Movie',
        poster_url: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        tmdb_id: 1,
      }),
      expect.objectContaining({
        age_rating: 'NR',
        description: 'No description available.',
        duration: 0,
        localized_name: null,
        poster_url: null,
        tmdb_id: 2,
      }),
    ]);
    expect(result.embeddingTexts[0]).toBe('details text');
    expect(result.embeddingTexts[1]).toContain('Fallback Movie (2024)');
    expect(result.embeddingTexts[1]).toContain('Duration: unknown');
    expect(result.catalogMetadataByTmdbId.get(1)).toBe(metadata);
    expect(result.catalogMetadataByTmdbId.has(2)).toBe(false);
  });
});

describe('runSync orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createEmbeddings.mockResolvedValue([[0.1], [0.2]]);
    mocks.extractCatalogMetadata.mockReturnValue(null);
    mocks.extractUSCertification.mockReturnValue('NR');
    mocks.fetchMovieDetails.mockResolvedValue(makeDetails());
    mocks.filterNewMovies.mockResolvedValue([0, 1]);
    mocks.getMovieCount.mockResolvedValue(10);
    mocks.insertMovies.mockResolvedValue({ errors: 0, insertedMovies: [], success: 0 });
    mocks.movieToEmbeddingText.mockReturnValue('details embedding text');
  });

  it('stops before detail lookup, embeddings, and inserts during dry run', async () => {
    mocks.fetchFromSources.mockResolvedValue([
      makeMovie({ id: 1, title: 'Fresh One' }),
      makeMovie({ id: 2, release_date: '' }),
      makeMovie({ id: 3, title: 'Fresh Two' }),
    ]);

    await runSync(makeConfig({ dryRun: true, maxMoviesPerRun: 1 }));

    expect(mocks.filterNewMovies).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Fresh One', year: 2024 }),
      expect.objectContaining({ name: 'Fresh Two', year: 2024 }),
    ]);
    expect(mocks.fetchMovieDetails).not.toHaveBeenCalled();
    expect(mocks.createEmbeddings).not.toHaveBeenCalled();
    expect(mocks.insertMovies).not.toHaveBeenCalled();
    expect(mocks.upsertMovieCatalogMetadata).not.toHaveBeenCalled();
  });

  it('inserts records and upserts metadata only for inserted movies with fetched details', async () => {
    const metadata = makeCatalogMetadata();
    mocks.fetchFromSources.mockResolvedValue([
      makeMovie({ id: 1, title: 'Detailed Movie' }),
      makeMovie({ id: 2, title: 'Fallback Movie' }),
    ]);
    mocks.fetchMovieDetails
      .mockResolvedValueOnce(makeDetails())
      .mockRejectedValueOnce(new Error('TMDB unavailable'));
    mocks.extractCatalogMetadata.mockReturnValueOnce(metadata);
    mocks.extractUSCertification.mockReturnValueOnce('PG-13');
    mocks.insertMovies.mockResolvedValue({
      errors: 0,
      insertedMovies: [
        { id: '101', tmdb_id: 1 },
        { id: '102', tmdb_id: 2 },
      ],
      success: 2,
    });

    await runSync(makeConfig({ maxMoviesPerRun: 2 }));

    expect(mocks.createEmbeddings).toHaveBeenCalledWith('openai-key', [
      'details embedding text',
      expect.stringContaining('Fallback Movie (2024)'),
    ]);
    const insertedRecords = mocks.insertMovies.mock.calls[0][0] as MovieRecord[];
    expect(insertedRecords).toEqual([
      expect.objectContaining({ embedding: [0.1], name: 'Detailed Movie', tmdb_id: 1 }),
      expect.objectContaining({ embedding: [0.2], name: 'Fallback Movie', tmdb_id: 2 }),
    ]);
    expect(mocks.upsertMovieCatalogMetadata).toHaveBeenCalledTimes(1);
    expect(mocks.upsertMovieCatalogMetadata).toHaveBeenCalledWith({
      genres: metadata.genres,
      keywords: metadata.keywords,
      movieId: '101',
      people: metadata.people,
      source: 'tmdb',
      tmdbMetadata: metadata.snapshot,
    });
  });
});
