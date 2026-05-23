import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pg from 'pg';
import {
  checkTableExists,
  closeDatabase,
  ensureCatalogMetadataSchema,
  ensureTMDBMatchReviewSchema,
  getIncompleteMovies,
  initDatabase,
  recordTMDBMatchReview,
  updateMovie,
} from './database.js';

vi.mock('pg', () => {
  const mPool = {
    query: vi.fn(),
    end: vi.fn(),
  };
  return {
    default: {
      Pool: vi.fn(function () {
        return mPool;
      }),
    },
  };
});

describe('database', () => {
  let poolMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  describe('checkTableExists', () => {
    it('returns true if table exists', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [{ exists: true }] });

      const result = await checkTableExists('movies');

      expect(poolMock.query).toHaveBeenCalledWith(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
        ['movies'],
      );
      expect(result).toBe(true);
    });

    it('returns false if table does not exist', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [{ exists: false }] });

      const result = await checkTableExists('non_existent_table');

      expect(poolMock.query).toHaveBeenCalledWith(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
        ['non_existent_table'],
      );
      expect(result).toBe(false);
    });
  });

  describe('ensureTMDBMatchReviewSchema', () => {
    it('creates the TMDB match review table and indexes', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [] });

      await ensureTMDBMatchReviewSchema();

      expect(poolMock.query).toHaveBeenCalledTimes(1);
      const [sql] = poolMock.query.mock.calls[0];
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS tmdb_match_reviews');
      expect(sql).toContain('idx_tmdb_match_reviews_movie_reason');
      expect(sql).toContain('idx_tmdb_match_reviews_status_updated_at');
    });
  });

  describe('ensureCatalogMetadataSchema', () => {
    it('creates the normalized catalog metadata tables and indexes', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [] });

      await ensureCatalogMetadataSchema();

      expect(poolMock.query).toHaveBeenCalledTimes(1);
      const [sql] = poolMock.query.mock.calls[0];
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_people');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_genres');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_keywords');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS movie_people');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS movie_genres');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS movie_keywords');
      expect(sql).toContain('ALTER COLUMN tmdb_id TYPE int');
      expect(sql).toContain('catalog_people_tmdb_id_unique');
      expect(sql).toContain('idx_movie_people_movie_role_order');
      expect(sql).toContain('movie_genres_source_check');
      expect(sql).toContain('movie_keywords_source_check');
    });
  });

  describe('getIncompleteMovies', () => {
    it('selects movies that are missing TMDB identity, runtime, or poster data', async () => {
      poolMock.query.mockResolvedValueOnce({
        rows: [
          {
            id: '42',
            name: 'Solaris',
            year: 1972,
            duration: 166,
            score_rating: 8.1,
            description: 'A psychologist is sent to a space station.',
            tmdb_id: 593,
          },
        ],
      });

      const result = await getIncompleteMovies(10);

      const [sql, params] = poolMock.query.mock.calls[0];
      expect(sql).toContain('tmdb_id IS NULL OR duration = 0 OR poster_url IS NULL');
      expect(sql).toContain('LIMIT $1');
      expect(params).toEqual([10]);
      expect(result).toEqual([
        {
          id: '42',
          name: 'Solaris',
          year: 1972,
          duration: 166,
          score_rating: 8.1,
          description: 'A psychologist is sent to a space station.',
          tmdb_id: 593,
        },
      ]);
    });
  });

  describe('updateMovie', () => {
    it('fills poster and localized title metadata when updating a movie', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [] });

      await updateMovie(
        '42',
        166,
        'PG',
        593,
        1,
        'https://image.tmdb.org/t/p/w500/poster.jpg',
        'Солярис',
        [0.1, 0.2],
      );

      const [sql, params] = poolMock.query.mock.calls[0];
      expect(sql).toContain('poster_url = COALESCE($5, poster_url)');
      expect(sql).toContain('localized_name = COALESCE($6, localized_name)');
      expect(params).toEqual([
        166,
        'PG',
        593,
        1,
        'https://image.tmdb.org/t/p/w500/poster.jpg',
        'Солярис',
        JSON.stringify([0.1, 0.2]),
        '42',
      ]);
    });
  });

  describe('recordTMDBMatchReview', () => {
    it('upserts an open review for ambiguous TMDB matches', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [] });

      await recordTMDBMatchReview({
        movie: {
          id: '42',
          name: 'Solaris',
          year: 1972,
          duration: 166,
          score_rating: 8.1,
          description: 'A psychologist is sent to a space station.',
          tmdb_id: null,
        },
        reason: 'ambiguous_match',
        candidates: [
          {
            id: 593,
            title: 'Solaris',
            originalTitle: 'Solaris',
            releaseYear: 1972,
            confidence: 1,
          },
        ],
        notes: 'TMDB returned multiple candidates.',
      });

      expect(poolMock.query).toHaveBeenCalledTimes(1);
      const [sql, params] = poolMock.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO tmdb_match_reviews');
      expect(sql).toContain('ON CONFLICT (movie_id, reason) DO UPDATE');
      expect(params).toEqual([
        '42',
        'Solaris',
        1972,
        'ambiguous_match',
        JSON.stringify([
          {
            id: 593,
            title: 'Solaris',
            originalTitle: 'Solaris',
            releaseYear: 1972,
            confidence: 1,
          },
        ]),
        'TMDB returned multiple candidates.',
      ]);
    });
  });
});
