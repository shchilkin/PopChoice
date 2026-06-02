import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sourceRoot = join(repoRoot, 'apps/backoffice/src');
const defaultMaxLines = 350;
const allowedLargeFiles = new Map();

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.next' || entry.name === 'node_modules') return [];
      return sourceFiles(entryPath);
    }

    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) return [];
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) return [];
    return [entryPath];
  });
}

const oversizedFiles = sourceFiles(sourceRoot)
  .map((filePath) => {
    const relativePath = relative(repoRoot, filePath);
    const maxLines = allowedLargeFiles.get(relativePath) ?? defaultMaxLines;
    const lines = readFileSync(filePath, 'utf8').split('\n').length;
    return { lines, maxLines, relativePath };
  })
  .filter(({ lines, maxLines }) => lines > maxLines)
  .sort((a, b) => b.lines - a.lines);

if (oversizedFiles.length > 0) {
  console.error('Backoffice module size check failed:');
  for (const { lines, maxLines, relativePath } of oversizedFiles) {
    console.error(`- ${relativePath}: ${lines} lines, max ${maxLines}`);
  }
  console.error(
    `Default max is ${defaultMaxLines}. Split the file or add a temporary allowlist entry with intent.`,
  );
  process.exit(1);
}

console.log(`Backoffice module size check passed (${defaultMaxLines} default max lines).`);
