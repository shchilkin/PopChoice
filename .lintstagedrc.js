import path from 'path';

const lintStagedConfig = {
  'apps/web/**/*.{js,jsx,ts,tsx,mjs}': (filenames) => {
    const relative = filenames.map((f) => path.relative('apps/web', f)).join(' ');
    return [`cd apps/web && eslint --fix ${relative}`, `prettier --write ${filenames.join(' ')}`];
  },
  '!(apps/web)/**/*.{js,jsx,ts,tsx,mjs}': ['prettier --write'],
  '*.{json,css,md,yml,yaml}': ['prettier --write'],
  'package.json': ['sort-package-json', 'prettier --write'],
};

export default lintStagedConfig;
