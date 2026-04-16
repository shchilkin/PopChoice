import { describe, expect, it, vi } from 'vitest';

vi.mock('@/clients', () => ({
  openAIClient: {
    embeddings: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(() => ({
    isConfigured: vi.fn(() => false),
  })),
}));

vi.mock('@/services', () => ({
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
}));

import { deserializeTMDBEmbeddings, serializeTMDBEmbeddings } from './tmdb';

describe('TMDB seeding payload serialization', () => {
  it('serializes Map embeddings to a plain object for queue payloads', () => {
    const serialized = serializeTMDBEmbeddings(
      new Map([
        [101, [0.1, 0.2]],
        [102, [0.3, 0.4]],
      ]),
    );

    expect(serialized).toEqual({
      '101': [0.1, 0.2],
      '102': [0.3, 0.4],
    });
  });

  it('deserializes queue payload embeddings back to a Map', () => {
    const deserialized = deserializeTMDBEmbeddings({
      '101': [0.1, 0.2],
      '102': [0.3, 0.4],
    });

    expect(deserialized).toBeInstanceOf(Map);
    expect(Array.from(deserialized?.entries() ?? [])).toEqual([
      [101, [0.1, 0.2]],
      [102, [0.3, 0.4]],
    ]);
  });
});
