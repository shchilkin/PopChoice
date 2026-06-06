export type SerializableTMDBEmbeddings = Record<string, number[]>;

export function serializeTMDBEmbeddings(
  embeddings?: Map<number, number[]>,
): SerializableTMDBEmbeddings | undefined {
  if (!embeddings || embeddings.size === 0) return undefined;
  return Object.fromEntries(
    Array.from(embeddings.entries()).map(([movieId, embedding]) => [String(movieId), embedding]),
  );
}

export function deserializeTMDBEmbeddings(
  serialized?: SerializableTMDBEmbeddings,
): Map<number, number[]> | undefined {
  if (!serialized) return undefined;
  const entries: Array<[number, number[]]> = Object.entries(serialized).flatMap(
    ([movieId, embedding]) => {
      const parsedMovieId = Number(movieId);
      const isValidMovieId = Number.isFinite(parsedMovieId) && Number.isInteger(parsedMovieId);
      const isValidEmbedding =
        Array.isArray(embedding) &&
        embedding.every((value) => typeof value === 'number' && Number.isFinite(value));

      if (!isValidMovieId || !isValidEmbedding) return [];
      return [[parsedMovieId, embedding]];
    },
  );
  return new Map(entries);
}
