<div align="center">
  <img src="/public/popcorn.svg" alt="Popcorn Mascot" width="200" />
</div>

# PopChoice

PopChoice is a **movie recommendation engine** that uses AI embeddings and vector databases to provide personalized movie suggestions based on user preferences.

This is a solo project for the **Embeddings and Vector Databases** chapter from "The AI Engineer Path" on Scrimba.

## ✨ Features

- 🎬 **AI-Powered Recommendations** - Uses OpenAI embeddings for semantic movie matching
- 📊 **Interactive Questionnaire** - Collects user preferences through engaging questions
- 🔍 **Vector Search** - Lightning-fast similarity search with Supabase pgvector
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🧪 **Component Library** - Built with Storybook for consistent UI components

## 🛠 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI/ML:** OpenAI GPT & Embeddings API
- **Database:** Supabase (PostgreSQL with pgvector extension)
- **Testing:** Vitest, Storybook, Playwright
- **Development:** ESLint, Prettier, Husky, lint-staged

## 🚀 Quick Start

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd pop-choice-22
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open the application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Start the Storybook workshop at [http://localhost:6006](http://localhost:6006) with `npm run storybook`

## 📖 Documentation

- **[Setup Guide](./docs/SETUP.md)** - Complete setup instructions for OpenAI, Supabase, and development environment
- **[Development Guide](./docs/DEVELOPMENT.md)** - Development workflows, scripts, and project structure
- **[CI/CD Documentation](./docs/CI-CD.md)** - GitHub Actions workflow and deployment information

## 🗂 Project Structure

```text
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (movie recommendations)
│   └── pages/             # Application pages
├── components/            # Reusable React components
│   ├── QuestionsForm/     # Movie preference questionnaire
│   ├── SuggestionCard/    # Movie recommendation cards
│   └── ...               # Other UI components
├── services/              # External API integrations
│   └── MovieService/      # TMDB API integration
└── utils/                 # Utility functions
    ├── db/               # Database schemas and functions
    └── movies/           # Movie data processing utilities
```

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Check code quality
npm run format:check    # Check formatting
npm run type-check      # TypeScript validation
npm run fix             # Fix all issues automatically

# Testing
npm run test            # Run all tests
npm run test:storybook  # Component tests
npm run storybook       # Start component workshop

# Utilities
npm run analyze-movies  # Analyze movie data for embeddings
```

## 🔗 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - Understanding embeddings for recommendations
- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns) - Vector database setup
- [The AI Engineer Path](https://scrimba.com/learn/aipath) - Complete AI engineering course

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

<div align="center">
  Built with ❤️ for learning AI engineering
</div>

# PopChoice

PopChoice is a **movie recommendation engine** that uses AI embeddings and vector databases to provide personalized movie suggestions based on user preferences.

This is a solo project for the **Embeddings and Vector Databases** chapter from "The AI Engineer Path" on Scrimba.

## ✨ Features

- 🎬 **AI-Powered Recommendations** - Uses OpenAI embeddings for semantic movie matching
- 📊 **Interactive Questionnaire** - Collects user preferences through engaging questions
- 🔍 **Vector Search** - Lightning-fast similarity search with Supabase pgvector
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🧪 **Component Library** - Built with Storybook for consistent UI components

## 🛠 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI/ML:** OpenAI GPT & Embeddings API
- **Database:** Supabase (PostgreSQL with pgvector extension)
- **Testing:** Vitest, Storybook, Playwright
- **Development:** ESLint, Prettier, Husky, lint-staged

## 🚀 Quick Start

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd pop-choice-22
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open the application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Start the Storybook workshop at [http://localhost:6006](http://localhost:6006) with `npm run storybook`

## 📖 Documentation

- **[Setup Guide](./docs/SETUP.md)** - Complete setup instructions for OpenAI, Supabase, and development environment
- **[Development Guide](./docs/DEVELOPMENT.md)** - Development workflows, scripts, and project structure
- **[CI/CD Documentation](./docs/CI-CD.md)** - GitHub Actions workflow and deployment information

## 🗂 Project Structure

```text
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (movie recommendations)
│   └── pages/             # Application pages
├── components/            # Reusable React components
│   ├── QuestionsForm/     # Movie preference questionnaire
│   ├── SuggestionCard/    # Movie recommendation cards
│   └── ...               # Other UI components
├── services/              # External API integrations
│   └── MovieService/      # TMDB API integration
└── utils/                 # Utility functions
    ├── db/               # Database schemas and functions
    └── movies/           # Movie data processing utilities
```

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Check code quality
npm run format:check    # Check formatting
npm run type-check      # TypeScript validation
npm run fix             # Fix all issues automatically

# Testing
npm run test            # Run all tests
npm run test:storybook  # Component tests
npm run storybook       # Start component workshop

# Utilities
npm run analyze-movies  # Analyze movie data for embeddings
```

# PopChoice Movie Recommendations

PopChoice is a **movie recommendation engine** that uses AI embeddings and vector databases to provide personalized movie suggestions based on user preferences.

This is a solo project for the **Embeddings and Vector Databases** chapter from "The AI Engineer Path" on Scrimba.

## Features

- Movie recommendation engine using AI embeddings
- Vector database search with Supabase
- Interactive questionnaire for user preferences
- Real-time movie suggestions based on user input

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **AI/ML:** OpenAI GPT & Embeddings API
- **Database:** Supabase (PostgreSQL with pgvector)
- **Testing:** Vitest, Storybook, Playwright
- **Development:** ESLint, Prettier, Husky

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Development Scripts

This project includes several npm scripts for development and testing:

### Testing

- `npm run test` - Run all tests using Vitest
- `npm run test:utils` - Run utility function tests (Node.js environment)
- `npm run test:storybook` - Run Storybook component tests (browser environment)

### Code Quality

- `npm run lint` or `npm run lint:check` - Run ESLint for code linting
- `npm run format:check` - Check code formatting with Prettier
- `npm run format:write` - Fix code formatting with Prettier
- `npm run type-check` - Run TypeScript type checking

### Development

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build Storybook for production

## GitHub Actions Workflow

This project includes a GitHub Actions workflow for pull request validation located at `.github/workflows/pr.yml`. The workflow runs on all pull requests and includes the following steps:

### Main Steps:

1. **Lint code** - Runs ESLint using `npm run lint:check`
2. **Check Prettier formatting** - Validates code formatting with Prettier
3. **Type check** - Runs TypeScript checking with `npm run type-check`
4. **Run utils tests** - Executes utility function tests using Vitest (Node.js environment)
5. **Run Storybook tests** - Runs browser-based Storybook tests with Playwright (conditional)
6. **Build project** - Builds the Next.js project to ensure no build errors

### Workflow Features:

- **Split test workspaces**: Utils tests and Storybook tests run in separate steps
- **Conditional Storybook tests**: Browser tests only run if Playwright installation succeeds
- **Resilient build process**: Handles network issues gracefully with informative error messages
- **Comprehensive validation**: Covers linting, formatting, type checking, testing, and building

### Workflow Trigger:

The workflow is triggered on pull request events for all branches (`branches: ['*']`).

### Known Limitations:

- Storybook tests may be skipped in environments where Playwright browser installation fails
- Build step may fail due to Google Fonts network issues in restricted CI environments
- In production, consider using font fallbacks or local font caching for better reliability

The workflow helps maintain code quality and functionality across all pull requests.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
