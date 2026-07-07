import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

const child = spawn(
  'docker',
  [
    'compose',
    '-p',
    'popchoice-e2e',
    '-f',
    'docker-compose.e2e.yml',
    'down',
    '-v',
    '--remove-orphans',
  ],
  {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error('[e2e:db] Failed to stop e2e services.');
  console.error(error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
