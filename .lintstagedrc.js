const lintStagedConfig = {
  '*.{js,jsx,ts,tsx,mjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,css,md,yml,yaml}': ['prettier --write'],
  'package.json': ['sort-package-json', 'prettier --write'],
};

export default lintStagedConfig;
