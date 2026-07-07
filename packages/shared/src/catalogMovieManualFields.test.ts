import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyCatalogMovieManualFields } from './catalogMovieManualFields.js';
import { closeDatabase, initDatabase } from './db.js';

vi.mock('pg', () => {
  const mPool = {
    end: vi.fn(),
    query: vi.fn(),
  };
  return {
    default: {
      Pool: vi.fn(function () {
        return mPool;
      }),
    },
  };
});

function movieRow(overrides: Record<string, unknown> = {}) {
  return {
    age_rating: 'NR',
    duration: 0,
    id: '42',
    localized_name: null,
    name: 'Joker',
    poster_url: null,
    tmdb_id: null,
    tmdb_match_confidence: null,
    tmdb_match_source: null,
    tmdb_matched_at: null,
    tmdb_metadata_refreshed_at: null,
    year: 2019,
    ...overrides,
  };
}

function auditRow(overrides: Record<string, unknown> = {}) {
  return {
    action: 'manual_update',
    actor: 'operator',
    created_at: '2026-06-08 10:00:00+00',
    id: '7',
    issue_key: 'missing_tmdb_id',
    note: 'verified',
    previous_state: {},
    repair_batch_id: null,
    repair_batch_item_id: null,
    result: {},
    target_id: '42',
    target_type: 'movie',
    ...overrides,
  };
}

describe('catalog movie manual fields', () => {
  let poolMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('updates verified operator fields and records catalog repair audit', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [movieRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [movieRow({ duration: 122, tmdb_id: 475557, tmdb_match_source: 'manual' })],
      })
      .mockResolvedValueOnce({ rows: [auditRow()] });

    const result = await applyCatalogMovieManualFields({
      actor: 'operator',
      fields: { localizedName: 'Joker', runtime: 122, tmdbId: 475557 },
      movieId: '42',
      note: 'verified',
    });

    expect(result.updatedFields).toEqual(['localizedName', 'runtime', 'tmdbId']);
    expect(result.movie).toMatchObject({ duration: 122, tmdb_id: 475557 });
    expect(String(poolMock.query.mock.calls[2][0])).toContain("tmdb_match_source = 'manual'");
    expect(poolMock.query.mock.calls[4][1]).toEqual(
      expect.arrayContaining(['manual_update', 'operator', 'missing_tmdb_id', 'movie', '42']),
    );
  });

  it('rejects duplicate manual TMDB ids before updating the movie row', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [movieRow()] })
      .mockResolvedValueOnce({ rows: [{ id: '99', name: 'Duplicate Joker', year: 2019 }] });

    await expect(
      applyCatalogMovieManualFields({
        actor: 'operator',
        fields: { tmdbId: 475557 },
        movieId: '42',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(poolMock.query).toHaveBeenCalledTimes(2);
  });

  it('requires at least one provided manual field', async () => {
    await expect(
      applyCatalogMovieManualFields({ actor: 'operator', fields: {}, movieId: '42' }),
    ).rejects.toThrow('At least one manual movie field is required.');
  });
});
