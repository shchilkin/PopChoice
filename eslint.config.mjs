// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import nextConfig from 'eslint-config-next/core-web-vitals';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import storybook from 'eslint-plugin-storybook';
import unusedImports from 'eslint-plugin-unused-imports';

const eslintConfig = [
  // Ignore build output, public assets, and service sub-packages
  {
    ignores: ['storybook-static/**', 'public/**', 'services/**', '.next/**', 'node_modules/**'],
  },
  ...nextConfig,
  prettierConfig,
  ...storybook.configs['flat/recommended'],

  // Import organization and cleanup
  {
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // Organize imports
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-ins
            'external', // npm packages
            'internal', // Internal modules
            'parent', // ../
            'sibling', // ./
            'index', // ./index
            'type', // TypeScript types
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // Remove unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Prevent duplicate imports
      'import/no-duplicates': 'error',
      'no-console': process.env.CI ? 'error' : 'warn',
    },
  },

  // Allow console logs in server-side utils
  {
    files: [
      'src/utils/**/*.{ts,js}',
      'src/app/api/**/*.{ts,js}',
      'src/lib/**/*.{ts,js}',
      'scripts/**/*.{ts,js}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
