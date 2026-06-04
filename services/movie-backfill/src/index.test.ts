import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkTableExists,
  ensureCatalogMetadataSchema,
  ensureTMDBMatchReviewSchema,
  getIncompleteMovies,
  recordTMDBMatchReview,
  updateMovie,
  upsertMovieCatalogMetadata,
} from './database.js';
import { createEmbeddings } from './embeddings.js';
import { preparePendingUpdate, processMovieBatch, runBackfill } from './index.js';
import {
  extractUSCertification,
  extractCatalogMetadata,
  fetchMovieDetails,
  getPosterUrl,
  movieToEmbeddingText,
  searchMovieMatch,
} from './tmdb.js';

import type { IncompleteMovie } from './database.js';
import type { PendingUpdate } from './index.js';

vi.mock('./database.js', () => ({
  checkTableExists: vi.fn(),
  closeDatabase: vi.fn(),
  ensureCatalogMetadataSchema: vi.fn(),
  ensureTMDBMatchReviewSchema: vi.fn(),
  getIncompleteMovies: vi.fn(),
  initDatabase: vi.fn(),
  recordTMDBMatchReview: vi.fn(),
  updateMovie: vi.fn(),
  upsertMovieCatalogMetadata: vi.fn(),
}));

vi.mock('./embeddings.js', () => ({
  createEmbeddings: vi.fn(),
}));

vi.mock('./logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('./tmdb.js', () => ({
  extractUSCertification: vi.fn(),
  extractCatalogMetadata: vi.fn(),
  fetchMovieDetails: vi.fn(),
  getPosterUrl: vi.fn(),
  movieToEmbeddingText: vi.fn(),
  searchMovieMatch: vi.fn(),
}));

const config = {
  tmdbApiKey: 'tmdb-key',
  openaiApiKey: 'openai-key',
  databaseUrl: 'postgres://localhost/popchoice',
  dryRun: false,
  batchSize: 2,
  maxMovies: 0,
};

const catalogMetadata = {
  snapshot: { id: 593, title: 'Solaris' },
  people: [{ tmdbId: 1, name: 'Andrei Tarkovsky', role: 'director' }],
  genres: [{ tmdbId: 878, name: 'Science Fiction' }],
  keywords: [{ tmdbId: 456, name: 'space station' }],
};

function makeMovie(overrides: Partial<IncompleteMovie> = {}): IncompleteMovie {
  return {
    id: 'movie-1',
    name: 'Solaris',
    year: 1972,
    duration: 166,
    score_rating: 8.1,
    description: 'A psychologist is sent to a space station.',
    tmdb_id: null,
    ...overrides,
  };
}

function makeDetails(overrides: Record<string, unknown> = {}) {
  return {
    id: 593,
    title: 'Solaris',
    runtime: 166,
    poster_path: '/solaris.jpg',
    ...overrides,
  };
}

function makePendingUpdate(overrides: Partial<PendingUpdate> = {}): PendingUpdate {
  return {
    movie: makeMovie(),
    tmdbId: 593,
    matchConfidence: 0.92,
    runtime: 166,
    ageRating: 'PG',
    posterUrl: 'https://image.tmdb.org/t/p/w500/solaris.jpg',
    localizedName: null,
    embeddingText: 'embedding text',
    catalogMetadata,
    ...overrides,
  } as PendingUpdate;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(searchMovieMatch).mockResolvedValue({
    status: 'matched',
    tmdbId: 593,
    confidence: 0.92,
    title: 'Solaris',
    releaseYear: 1972,
    candidates: [],
  });
  vi.mocked(fetchMovieDetails).mockResolvedValue(makeDetails() as never);
  vi.mocked(extractUSCertification).mockReturnValue('PG');
  vi.mocked(extractCatalogMetadata).mockReturnValue(catalogMetadata as never);
  vi.mocked(getPosterUrl).mockReturnValue('https://image.tmdb.org/t/p/w500/solaris.jpg');
  vi.mocked(movieToEmbeddingText).mockReturnValue('embedding text');
});

describe('preparePendingUpdate', () => {
  it('uses an existing TMDB id without searching and prepares a DB update', async () => {
    const movie = makeMovie({ tmdb_id: 593 });

    const result = await preparePendingUpdate(config, movie);

    expect(searchMovieMatch).not.toHaveBeenCalled();
    expect(fetchMovieDetails).toHaveBeenCalledWith('tmdb-key', 593);
    expect(result).toMatchObject({
      status: 'pending',
      update: {
        movie,
        tmdbId: 593,
        matchConfidence: 1,
        runtime: 166,
        ageRating: 'PG',
        posterUrl: 'https://image.tmdb.org/t/p/w500/solaris.jpg',
        embeddingText: 'embedding text',
      },
    });
  });

  it('records ambiguous TMDB matches for manual review', async () => {
    const candidates = [{ tmdbId: 1, title: 'Solaris', releaseYear: 1972, confidence: 0.8 }];
    vi.mocked(searchMovieMatch).mockResolvedValueOnce({
      status: 'ambiguous',
      candidates,
    } as never);

    const result = await preparePendingUpdate(config, makeMovie());

    expect(result).toEqual({ status: 'skipped' });
    expect(recordTMDBMatchReview).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'ambiguous_match',
        candidates,
      }),
    );
  });

  it('returns a dry-run result before collecting DB writes', async () => {
    const result = await preparePendingUpdate({ ...config, dryRun: true }, makeMovie());

    expect(result).toEqual({ status: 'would_update' });
    expect(recordTMDBMatchReview).not.toHaveBeenCalled();
  });
});

describe('processMovieBatch', () => {
  it('generates embeddings once and writes prepared updates', async () => {
    vi.mocked(createEmbeddings).mockResolvedValue([[0.1, 0.2]]);

    const counts = await processMovieBatch(config, [makeMovie()], 1, 1);

    expect(counts).toEqual({ processed: 1, updated: 1, wouldUpdate: 0, skipped: 0 });
    expect(createEmbeddings).toHaveBeenCalledWith('openai-key', ['embedding text']);
    expect(updateMovie).toHaveBeenCalledWith(
      'movie-1',
      166,
      'PG',
      593,
      0.92,
      'https://image.tmdb.org/t/p/w500/solaris.jpg',
      null,
      [0.1, 0.2],
    );
    expect(upsertMovieCatalogMetadata).toHaveBeenCalledWith({
      movieId: 'movie-1',
      tmdbMetadata: catalogMetadata.snapshot,
      people: catalogMetadata.people,
      genres: catalogMetadata.genres,
      keywords: catalogMetadata.keywords,
      source: 'tmdb',
    });
  });

  it('skips pending updates when embedding generation fails', async () => {
    vi.mocked(createEmbeddings).mockRejectedValueOnce(new Error('embedding outage'));

    const counts = await processMovieBatch(config, [makeMovie()], 1, 1);

    expect(counts).toEqual({ processed: 1, updated: 0, wouldUpdate: 0, skipped: 1 });
    expect(updateMovie).not.toHaveBeenCalled();
    expect(upsertMovieCatalogMetadata).not.toHaveBeenCalled();
  });

  it('skips individual writes when an embedding is missing', async () => {
    vi.mocked(createEmbeddings).mockResolvedValueOnce([]);

    const counts = await processMovieBatch(config, [makeMovie()], 1, 1);

    expect(counts).toEqual({ processed: 1, updated: 0, wouldUpdate: 0, skipped: 1 });
    expect(updateMovie).not.toHaveBeenCalled();
  });
});

describe('runBackfill', () => {
  it('returns no totals when the movies table is absent', async () => {
    vi.mocked(checkTableExists).mockResolvedValueOnce(false);

    const totals = await runBackfill(config);

    expect(totals).toBeNull();
    expect(ensureTMDBMatchReviewSchema).not.toHaveBeenCalled();
    expect(ensureCatalogMetadataSchema).not.toHaveBeenCalled();
    expect(getIncompleteMovies).not.toHaveBeenCalled();
  });

  it('aggregates batch counts over fetched movies', async () => {
    vi.mocked(checkTableExists).mockResolvedValueOnce(true);
    vi.mocked(getIncompleteMovies).mockResolvedValueOnce([
      makeMovie(),
      makeMovie({ id: 'movie-2' }),
    ]);
    vi.mocked(createEmbeddings).mockResolvedValue([[0.1], [0.2]]);

    const totals = await runBackfill(config);

    expect(totals).toEqual({
      totalProcessed: 2,
      totalUpdated: 2,
      totalWouldUpdate: 0,
      totalSkipped: 0,
    });
    expect(ensureTMDBMatchReviewSchema).toHaveBeenCalledOnce();
    expect(ensureCatalogMetadataSchema).toHaveBeenCalledOnce();
  });
});
