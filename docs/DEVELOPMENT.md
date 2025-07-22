# Development Guide

## Prerequisites

- Node.js 18+ and npm
- Git
- VS Code (recommended)

## Development Scripts

### Testing

- `npm run test` - Run all tests using Vitest
- `npm run test:server` - Run utility function tests (Node.js environment)
- `npm run test:storybook` - Run Storybook component tests (browser environment)

### Code Quality

- `npm run lint` or `npm run lint:check` - Run ESLint for code linting
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format:check` - Check code formatting with Prettier
- `npm run format:write` - Fix code formatting with Prettier
- `npm run format:package` - Sort and format package.json
- `npm run type-check` - Run TypeScript type checking
- `npm run fix` - Run all fixes (lint, format, package.json)

### Development

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build Storybook for production

### Database & Data Management

- `npm run populate-db` - Populate database with movie data from movies.txt file
- `npm run create-embeddings` - Create embeddings for movies without them in the database
- `npm run analyze-movies` - Analyze movie data chunks for embedding optimization

## Database Setup Workflow

The project includes several scripts to help you set up and manage your movie recommendation database:

1. **Analysis Phase** - Use `npm run analyze-movies` to understand your movie data structure
2. **Population Phase** - Use `npm run populate-db` to import movies from `movies.txt` into your Supabase database
3. **Embedding Phase** - Use `npm run create-embeddings` to generate AI embeddings for semantic search

These scripts are designed to work together, with the populate script automatically creating embeddings for new movies. The separate create-embeddings script is useful when you need to add embeddings to existing movies that don't have them.

## Code Style and Conventions

- **TypeScript** - All new code should be TypeScript
- **ESLint** - Follows Next.js and Prettier configurations
- **Prettier** - Code formatting is enforced
- **Import organization** - Auto-sorted with eslint-plugin-import

## Testing Strategy

- **Unit tests** - Vitest for utility functions and business logic
- **Component tests** - Storybook with Vitest integration
- **Browser tests** - Playwright for end-to-end scenarios

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── pages/             # App pages
├── components/            # Reusable React components
├── services/              # External API integrations
└── utils/                 # Utility functions and helpers
    ├── db/               # Database scripts
    └── movies/           # Movie data processing
```
