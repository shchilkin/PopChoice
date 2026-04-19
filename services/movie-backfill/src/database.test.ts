import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pg from 'pg';
import { initDatabase, checkTableExists, closeDatabase } from './database.js';

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
});
