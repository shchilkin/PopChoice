<div align="center">
  <img src="/public/popcorn.svg" alt="Popcorn Mascot" width="200" />
</div>

# PopChoice

PopChoice is a **movie recommendation engine** that uses AI embeddings and vector databases to provide personalized movie suggestions based on user preferences.

This is a solo project for the **Embeddings and Vector Databases** chapter from "The AI Engineer Path" on Scrimba.

🌐 **[Live Demo](https://pop-choice.shchilkin.dev/)**

## ✨ Features

- 🎬 **AI-Powered Recommendations** - Uses OpenAI embeddings for semantic movie matching
- 📊 **Interactive Questionnaire** - Collects user preferences through engaging questions
- 🔍 **Vector Search** - Lightning-fast similarity search with pgvector
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🧪 **Component Library** - Built with Storybook for consistent UI components

## 🛠 Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **AI/ML:** OpenAI Embeddings API, LangChain Core
- **Database:** PostgreSQL with pgvector, Redis (for caching)
- **Animation:** Motion (Framer Motion)
- **Movie Data:** TMDB (The Movie Database) API
- **Analytics:** Vercel Web Analytics
- **Testing:** Vitest, Storybook 10, Playwright, MSW (Mock Service Worker)
- **Development:** ESLint, Prettier, Husky, lint-staged

## 🚀 Quick Start

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/shchilkin/PopChoice.git
   cd PopChoice
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI and TMDB API keys
   ```

3. **Start local PostgreSQL** (requires Docker)

   ```bash
   npm run setup:local-db
   # Generates a random password, writes DATABASE_URL to .env, and starts the container
   npm run populate-db
   # Seeds the database with movie embeddings
   ```

   For other database options, see the **[Setup Guide](./docs/SETUP.md)**.

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open the application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Start the Storybook workshop at [http://localhost:6006](http://localhost:6006) with `npm run storybook`

## 📖 Documentation

- **[Setup Guide](./docs/SETUP.md)** — Complete setup instructions
- **[Development Guide](./docs/DEVELOPMENT.md)** — Development workflows, scripts, and project structure
- **[Services Guide](./docs/SERVICES.md)** — Background services documentation
- **[CI/CD Documentation](./docs/CI-CD.md)** — GitHub Actions workflow and deployment
- **[Design Guidelines](./docs/design-guidelines.md)** — UI/UX design guidelines

## 🗂 Project Structure

```text
src/
├── app/                    # Next.js app directory (API routes, pages)
├── clients/               # External API client wrappers
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── i18n/                  # Internationalisation (i18n) support
├── lib/                   # Shared library utilities
├── mocks/                 # MSW mock handlers
├── services/              # Business logic / service layer
├── styles/                # Global styles
└── utils/                 # Utility functions
services/
├── movie-discovery/       # Continuous TMDB movie discovery service
└── movie-seed/            # One-shot database seeding service
db/                        # Database migrations / schema
```

## 🗃 Background Services

- **movie-seed** (`services/movie-seed/`) — One-shot service that reads movies from a `movies.txt` file, generates OpenAI embeddings, and seeds the PostgreSQL database. Safe to re-run (deduplicates by name + year). See [`services/movie-seed/README.md`](./services/movie-seed/README.md).
- **movie-discovery** (`services/movie-discovery/`) — Continuous TMDB-driven service that discovers new movies, applies quality filters (vote count, rating, overview length), generates embeddings, and inserts them into the database. Supports scheduled and one-shot modes. See [`services/movie-discovery/README.md`](./services/movie-discovery/README.md).

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test            # Run all tests
npm run test:server     # Run utility function tests
npm run test:storybook  # Component tests (browser environment)
npm run storybook       # Start component workshop
npm run build-storybook # Build static Storybook
npm run start:storybook # Serve built Storybook

# Code Quality
npm run lint:check      # Check code quality
npm run format:check    # Check formatting
npm run type-check      # TypeScript validation
npm run fix             # Fix all issues automatically

# Database & Data
npm run setup:local-db       # Generate credentials, start Docker PostgreSQL
npm run populate-db          # Populate database with movie data
npm run analyze-movies       # Analyze movie data for embeddings
npm run calibrate-similarity # Calibrate vector similarity thresholds
```

For detailed development workflows and project structure, see the **[Development Guide](./docs/DEVELOPMENT.md)**.

## 🔗 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - Understanding embeddings for recommendations
- [pgvector Documentation](https://github.com/pgvector/pgvector) - Vector database setup
- [TMDB API Documentation](https://developer.themoviedb.org/docs/getting-started) - The Movie Database API integration
- [The AI Engineer Path](https://scrimba.com/the-ai-engineer-path-c02v) - Complete AI engineering course

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

<div align="center">
  Built with ❤️ for learning AI engineering
</div>
