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
- **Movie Data:** TMDB (The Movie Database) API
- **Testing:** Vitest, Storybook, Playwright
- **Development:** ESLint, Prettier, Husky, lint-staged

## 🚀 Quick Start

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd PopChoice
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

   For detailed setup instructions, see the **[Setup Guide](./docs/SETUP.md)**.

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

# Testing
npm run test            # Run all tests
npm run test:server     # Run utility function tests
npm run test:storybook  # Component tests (browser environment)
npm run storybook       # Start component workshop

# Code Quality
npm run lint:check      # Check code quality
npm run format:check    # Check formatting
npm run type-check      # TypeScript validation
npm run fix             # Fix all issues automatically

# Database & Data
npm run populate-db     # Populate database with movie data
npm run analyze-movies  # Analyze movie data for embeddings
```

For detailed development workflows and project structure, see the **[Development Guide](./docs/DEVELOPMENT.md)**.

## 🔗 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - Understanding embeddings for recommendations
- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns) - Vector database setup
- [TMDB API Documentation](https://developer.themoviedb.org/docs/getting-started) - The Movie Database API integration
- [The AI Engineer Path](https://scrimba.com/the-ai-engineer-path-c02v) - Complete AI engineering course

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

<div align="center">
  Built with ❤️ for learning AI engineering
</div>
