import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sourceRoot = join(repoRoot, 'apps/backoffice/src');
const defaultMaxLines = 350;
const allowedLargeFiles = new Map();

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    sourceFilesForEntry(dir, entry),
  );
}

function sourceFilesForEntry(dir, entry) {
  const entryPath = join(dir, entry.name);
  if (entry.isDirectory()) {
    return sourceFilesForDirectory(entry.name, entryPath);
  }

  return isCheckedSourceFile(entry.name) ? [entryPath] : [];
}

function sourceFilesForDirectory(name, entryPath) {
  return isIgnoredDirectory(name) ? [] : sourceFiles(entryPath);
}

function isIgnoredDirectory(name) {
  return name === '.next' || name === 'node_modules';
}

function isCheckedSourceFile(name) {
  return isSourceFile(name) && !isTestFile(name);
}

function isSourceFile(name) {
  return name.endsWith('.ts') || name.endsWith('.tsx');
}

function isTestFile(name) {
  return name.endsWith('.test.ts') || name.endsWith('.test.tsx');
}

function getModuleSize(filePath) {
  const relativePath = relative(repoRoot, filePath);
  const maxLines = allowedLargeFiles.get(relativePath) ?? defaultMaxLines;
  const lines = readFileSync(filePath, 'utf8').split('\n').length;
  return { lines, maxLines, relativePath };
}

const oversizedFiles = sourceFiles(sourceRoot)
  .map(getModuleSize)
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
