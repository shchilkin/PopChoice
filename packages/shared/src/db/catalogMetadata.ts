import { getPool } from './pool.js';
import { metadataJson, valueOrNull } from './utils.js';

import type {
  CatalogGenreInput,
  CatalogKeywordInput,
  CatalogMetadataRefreshPlan,
  CatalogMetadataSource,
  MovieCatalogMetadataInput,
  MoviePersonCreditInput,
  MovieWatchProviderInput,
} from './types.js';
import type { PoolClient } from 'pg';

function createCatalogMetadataRefreshPlan(
  input: MovieCatalogMetadataInput,
): CatalogMetadataRefreshPlan {
  return {
    movieId: String(input.movieId),
    source: input.source ?? 'tmdb',
    shouldRefreshPeople: input.people !== undefined,
    shouldRefreshGenres: input.genres !== undefined,
    shouldRefreshKeywords: input.keywords !== undefined,
    shouldRefreshProviders: input.providers !== undefined,
    people: input.people ?? [],
    genres: input.genres ?? [],
    keywords: input.keywords ?? [],
    providers: input.providers ?? [],
  };
}

async function updateMovieCatalogMetadataSnapshot(
  client: PoolClient,
  movieId: string,
  tmdbMetadata: Record<string, unknown> | undefined,
): Promise<void> {
  if (!tmdbMetadata) return;

  await client.query(
    `UPDATE movies
        SET tmdb_metadata = $2::jsonb,
            tmdb_metadata_refreshed_at = now()
      WHERE id = $1`,
    [movieId, JSON.stringify(tmdbMetadata)],
  );
}

async function deleteRefreshedCatalogMetadata(
  client: PoolClient,
  plan: CatalogMetadataRefreshPlan,
): Promise<void> {
  if (plan.shouldRefreshPeople) {
    await client.query(
      `DELETE FROM movie_people
        WHERE movie_id = $1
          AND tmdb_credit_id IS NOT NULL`,
      [plan.movieId],
    );
  }
  if (plan.shouldRefreshGenres) {
    await client.query(`DELETE FROM movie_genres WHERE movie_id = $1 AND source = $2`, [
      plan.movieId,
      plan.source,
    ]);
  }
  if (plan.shouldRefreshKeywords) {
    await client.query(`DELETE FROM movie_keywords WHERE movie_id = $1 AND source = $2`, [
      plan.movieId,
      plan.source,
    ]);
  }
  if (plan.shouldRefreshProviders) {
    await client.query(`DELETE FROM movie_watch_providers WHERE movie_id = $1`, [plan.movieId]);
  }
}

async function upsertCatalogPersonCredit(
  client: PoolClient,
  movieId: string,
  person: MoviePersonCreditInput,
): Promise<void> {
  const personResult = await client.query<{ id: string }>(
    `INSERT INTO catalog_people (
       tmdb_id, name, profile_path, popularity, raw_metadata, updated_at
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, now())
     ON CONFLICT (tmdb_id) WHERE tmdb_id IS NOT NULL DO UPDATE
       SET name = EXCLUDED.name,
           profile_path = COALESCE(EXCLUDED.profile_path, catalog_people.profile_path),
           popularity = COALESCE(EXCLUDED.popularity, catalog_people.popularity),
           raw_metadata = EXCLUDED.raw_metadata,
           updated_at = now()
     RETURNING id::text`,
    [
      person.tmdbId,
      person.name,
      valueOrNull(person.profilePath),
      valueOrNull(person.popularity),
      metadataJson(person.rawMetadata),
    ],
  );
  const personId = personResult.rows[0]?.id;
  if (!personId) return;

  await client.query(
    `INSERT INTO movie_people (
       movie_id, person_id, tmdb_credit_id, role, character_name, job,
       department, billing_order, raw_metadata, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
     ON CONFLICT (movie_id, tmdb_credit_id) WHERE tmdb_credit_id IS NOT NULL DO UPDATE
       SET person_id = EXCLUDED.person_id,
           role = EXCLUDED.role,
           character_name = EXCLUDED.character_name,
           job = EXCLUDED.job,
           department = EXCLUDED.department,
           billing_order = EXCLUDED.billing_order,
           raw_metadata = EXCLUDED.raw_metadata,
           updated_at = now()`,
    [
      movieId,
      personId,
      person.creditId,
      person.role,
      valueOrNull(person.characterName),
      valueOrNull(person.job),
      valueOrNull(person.department),
      valueOrNull(person.billingOrder),
      metadataJson(person.rawMetadata),
    ],
  );
}

async function upsertCatalogGenre(
  client: PoolClient,
  movieId: string,
  source: CatalogMetadataSource,
  genre: CatalogGenreInput,
): Promise<void> {
  const genreResult = await client.query<{ id: string }>(
    `INSERT INTO catalog_genres (tmdb_id, name, raw_metadata, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (tmdb_id) WHERE tmdb_id IS NOT NULL DO UPDATE
       SET name = EXCLUDED.name,
           raw_metadata = EXCLUDED.raw_metadata,
           updated_at = now()
     RETURNING id::text`,
    [genre.tmdbId, genre.name, metadataJson(genre.rawMetadata)],
  );
  const genreId = genreResult.rows[0]?.id;
  if (!genreId) return;

  await client.query(
    `INSERT INTO movie_genres (movie_id, genre_id, source)
     VALUES ($1, $2, $3)
     ON CONFLICT (movie_id, genre_id) DO UPDATE
       SET source = EXCLUDED.source`,
    [movieId, genreId, source],
  );
}

async function upsertCatalogKeyword(
  client: PoolClient,
  movieId: string,
  source: CatalogMetadataSource,
  keyword: CatalogKeywordInput,
): Promise<void> {
  const keywordResult = await client.query<{ id: string }>(
    `INSERT INTO catalog_keywords (tmdb_id, name, raw_metadata, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (tmdb_id) WHERE tmdb_id IS NOT NULL DO UPDATE
       SET name = EXCLUDED.name,
           raw_metadata = EXCLUDED.raw_metadata,
           updated_at = now()
     RETURNING id::text`,
    [keyword.tmdbId, keyword.name, metadataJson(keyword.rawMetadata)],
  );
  const keywordId = keywordResult.rows[0]?.id;
  if (!keywordId) return;

  await client.query(
    `INSERT INTO movie_keywords (movie_id, keyword_id, source)
     VALUES ($1, $2, $3)
     ON CONFLICT (movie_id, keyword_id) DO UPDATE
       SET source = EXCLUDED.source`,
    [movieId, keywordId, source],
  );
}

async function upsertCatalogWatchProvider(
  client: PoolClient,
  movieId: string,
  provider: MovieWatchProviderInput,
): Promise<void> {
  const providerResult = await client.query<{ id: string }>(
    `INSERT INTO catalog_watch_providers (
       tmdb_id, provider_name, logo_path, raw_metadata, updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (tmdb_id) WHERE tmdb_id IS NOT NULL DO UPDATE
       SET provider_name = EXCLUDED.provider_name,
           logo_path = COALESCE(EXCLUDED.logo_path, catalog_watch_providers.logo_path),
           raw_metadata = EXCLUDED.raw_metadata,
           updated_at = now()
     RETURNING id::text`,
    [
      provider.providerId,
      provider.providerName,
      valueOrNull(provider.logoPath),
      metadataJson(provider.rawMetadata),
    ],
  );
  const providerRowId = providerResult.rows[0]?.id;
  if (!providerRowId) return;

  await client.query(
    `INSERT INTO movie_watch_providers (
       movie_id, provider_id, region, availability_type, display_priority,
       link, raw_metadata, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
     ON CONFLICT (movie_id, provider_id, region, availability_type) DO UPDATE
       SET display_priority = EXCLUDED.display_priority,
           link = EXCLUDED.link,
           raw_metadata = EXCLUDED.raw_metadata,
           updated_at = now()`,
    [
      movieId,
      providerRowId,
      provider.region,
      provider.availabilityType,
      valueOrNull(provider.displayPriority),
      valueOrNull(provider.link),
      metadataJson(provider.rawMetadata),
    ],
  );
}

async function upsertRefreshedCatalogMetadata(
  client: PoolClient,
  plan: CatalogMetadataRefreshPlan,
): Promise<void> {
  for (const person of plan.shouldRefreshPeople ? plan.people : []) {
    await upsertCatalogPersonCredit(client, plan.movieId, person);
  }
  for (const genre of plan.shouldRefreshGenres ? plan.genres : []) {
    await upsertCatalogGenre(client, plan.movieId, plan.source, genre);
  }
  for (const keyword of plan.shouldRefreshKeywords ? plan.keywords : []) {
    await upsertCatalogKeyword(client, plan.movieId, plan.source, keyword);
  }
  for (const provider of plan.shouldRefreshProviders ? plan.providers : []) {
    await upsertCatalogWatchProvider(client, plan.movieId, provider);
  }
}

export async function upsertMovieCatalogMetadata(input: MovieCatalogMetadataInput): Promise<void> {
  const client = await getPool().connect();
  const plan = createCatalogMetadataRefreshPlan(input);

  try {
    await client.query('BEGIN');
    await updateMovieCatalogMetadataSnapshot(client, plan.movieId, input.tmdbMetadata);
    await deleteRefreshedCatalogMetadata(client, plan);
    await upsertRefreshedCatalogMetadata(client, plan);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
