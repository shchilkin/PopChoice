import path from 'path';

function quoteFiles(filenames) {
  return filenames.map((filename) => JSON.stringify(filename)).join(' ');
}

const lintStagedConfig = {
  'apps/web/**/*.{js,jsx,ts,tsx,mjs}': (filenames) => {
    const relative = filenames.map((filename) =>
      JSON.stringify(path.relative('apps/web', filename)),
    );
    return [
      `cd apps/web && eslint --fix --max-warnings=0 ${relative.join(' ')}`,
      `oxfmt ${quoteFiles(filenames)}`,
    ];
  },
  '!(apps/web)/**/*.{js,jsx,ts,tsx,mjs}': (filenames) =>
    filenames.length ? [`oxfmt ${quoteFiles(filenames)}`] : [],
  '**/*.{json,css,scss,md,html,yml,yaml}': (filenames) =>
    filenames.length ? [`oxfmt ${quoteFiles(filenames)}`] : [],
  'package.json': ['oxfmt package.json'],
};

export default lintStagedConfig;
