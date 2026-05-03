#!/usr/bin/env bash
set -euo pipefail

git_root="$(git rev-parse --show-toplevel)"
cd "$git_root"

echo "Running pre-push checks..."

echo "• Lint"
npm run lint:check

echo "• Server tests"
npm run test:server

echo "• Production build"
npm run build

upstream="$(git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null || true)"

if [[ -n "$upstream" ]]; then
  changed_files="$(git diff --name-only "$upstream"...HEAD)"
else
  changed_files="$(git diff --name-only HEAD~1..HEAD 2>/dev/null || true)"
fi

storybook_pattern='^(apps/web/\.storybook/|apps/web/src/.*\.stories\.(js|jsx|ts|tsx)$|apps/web/src/components/|apps/web/src/app/.*/components/|apps/web/src/app/design-system/|apps/web/src/app/globals\.css$|apps/web/src/i18n/|apps/web/src/styles/)'

if [[ -n "$changed_files" ]] && printf '%s\n' "$changed_files" | grep -Eq "$storybook_pattern"; then
  echo "• Storybook tests"
  npm run test:storybook
else
  echo "• Storybook tests skipped (no Storybook-relevant changes detected)"
fi