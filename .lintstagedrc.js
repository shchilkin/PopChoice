const lintStagedConfig = {
  'apps/web/**/*.{js,jsx,ts,tsx,mjs}': [
    'eslint --config apps/web/eslint.config.mjs --fix',
    'prettier --write',
  ],
  '!(apps/web)/**/*.{js,jsx,ts,tsx,mjs}': ['prettier --write'],
  '*.{json,css,md,yml,yaml}': ['prettier --write'],
  'package.json': ['sort-package-json', 'prettier --write'],
};

export default lintStagedConfig;
