import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveDefaultMoviesFilePath } from '@/lib/workers/curatedMovieSeed';

describe('resolveDefaultMoviesFilePath', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  function createRepoFixture(): { appsWebPath: string; repoPath: string; dataFilePath: string } {
    const repoPath = mkdtempSync(path.join(tmpdir(), 'popchoice-movies-path-'));
    tempDirs.push(repoPath);

    const appsWebPath = path.join(repoPath, 'apps/web');
    const dataPath = path.join(appsWebPath, 'data');
    const dataFilePath = path.join(dataPath, 'movies.txt');

    mkdirSync(appsWebPath, { recursive: true });
    mkdirSync(dataPath, { recursive: true });
    writeFileSync(dataFilePath, 'Casablanca: 1942 | PG | 1h 42m | 8.5 rating\nDescription.');

    return { appsWebPath, repoPath, dataFilePath };
  }

  it('finds the curated movie file when workers run from apps/web', () => {
    const { appsWebPath, dataFilePath } = createRepoFixture();

    expect(resolveDefaultMoviesFilePath(appsWebPath)).toBe(dataFilePath);
  });

  it('finds the curated movie file when workers run from the repo root', () => {
    const { repoPath, dataFilePath } = createRepoFixture();

    expect(resolveDefaultMoviesFilePath(repoPath)).toBe(dataFilePath);
  });

  it('prefers a movies.txt file in the current working directory', () => {
    const { appsWebPath } = createRepoFixture();
    const localFilePath = path.join(appsWebPath, 'movies.txt');
    writeFileSync(localFilePath, 'Arrival: 2016 | PG-13 | 116m | 7.9 rating\nDescription.');

    expect(resolveDefaultMoviesFilePath(appsWebPath)).toBe(localFilePath);
  });
});
