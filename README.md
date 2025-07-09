<div align="center">
  <img src="/public/popcorn.png" alt="Popcorn Mascot" width="200" />
</div>

# PopChoice

PopChoice is a Solo project for the **Embeddings and Vector Databases** chapter from "The AI Engineer Path" on Scrimba.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## GitHub Actions Workflow

This project includes a GitHub Actions workflow for pull request validation located at `.github/workflows/pr.yml`. The workflow runs on all pull requests and includes the following steps:

### Main Steps:

1. **Lint code** - Runs ESLint using `next lint`
2. **Check Prettier formatting** - Validates code formatting with Prettier
3. **Type check** - Runs TypeScript checking with `tsc --noEmit`
4. **Run utils tests** - Executes utility function tests using Vitest
5. **Run Storybook tests** - Runs browser-based Storybook tests with Playwright
6. **Build project** - Builds the Next.js project to ensure no build errors

The workflow is triggered on pull request events for all branches and helps maintain code quality and functionality.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
