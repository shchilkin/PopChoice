import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pg from 'pg';
import {
  checkTableExists,
  closeDatabase,
  ensureTMDBMatchReviewSchema,
  initDatabase,
  recordTMDBMatchReview,
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
