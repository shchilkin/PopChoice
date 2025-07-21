# Setup Guide

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_API_KEY=your-supabase-anon-key

# TMDB API (for movie data)
TMDB_API_KEY=your-tmdb-api-key
```

## OpenAI Setup

This application uses the OpenAI API to generate embeddings and chat completions.

### Steps:

1. **Get your OpenAI API key**
   - Sign up or log in at [OpenAI Platform](https://platform.openai.com/docs/overview)
   - Go to your account settings and create an API key

2. **Add your API key to the `.env` file**
   - Add the line: `OPENAI_API_KEY=your-openai-api-key-here`

3. **Verify setup**
   - Your application will automatically load the API key from `.env`
   - See [`src/utils/openaiClient.ts`](../src/utils/openaiClient.ts) for usage example

## Supabase Database Setup

This application uses Supabase (PostgreSQL) to store movie embeddings.

### Steps:

1. **Create a Supabase project**
   - Sign up at [Supabase](https://supabase.com)
   - Create a new project
   - Wait for the database to be provisioned

2. **Set up the database schema**
   - Go to the SQL Editor in your Supabase dashboard
   - Run the SQL from [`src/utils/db/createDB.sql`](../src/utils/db/createDB.sql)

3. **Add the matching function**
   - In the SQL Editor, run the SQL from [`src/utils/db/match_movies.sql`](../src/utils/db/match_movies.sql)

4. **Configure environment variables**
   - Get your project URL and anon key from Supabase dashboard
   - Add them to your `.env` file

5. **Test your setup**
   - Use the Supabase dashboard to verify tables were created
   - Test the connection using the provided utility scripts

## TMDB API Setup (Optional)

For additional movie metadata and images:

1. **Create TMDB account**
   - Sign up at [The Movie Database](https://www.themoviedb.org/signup)
   - Request an API key from your account settings

2. **Add to environment**
   - Add `TMDB_API_KEY=your-key` to your `.env` file

## Development Container Setup

This project includes a development container configuration for consistent development environments.

### Using with VS Code:

1. **Install prerequisites**
   - Install [Docker](https://www.docker.com/products/docker-desktop)
   - Install [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. **Set environment variables**
   - Set environment variables in your shell before launching VS Code
   - The dev container will forward these automatically

3. **Open in container**
   - Open the project in VS Code
   - Click "Reopen in Container" when prompted
   - Wait for the container to build and dependencies to install

### Features included:

- Node.js 22 with npm
- Git and GitHub CLI pre-installed
- All VS Code extensions pre-configured
- Port forwarding for development servers (3000, 6006)
- Automatic npm install on container creation
