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

### Utilities

- `npm run analyze-movies` - Analyze movie data chunks for embedding optimization

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
