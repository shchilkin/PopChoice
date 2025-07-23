# CI/CD Documentation

## GitHub Actions Workflow

This project includes a comprehensive GitHub Actions workflow for pull request validation located at `.github/workflows/pr.yml`.

## Workflow Overview

The workflow runs automatically on pull requests targeting the `development` branch and includes the following validation steps:

### 1. Code Quality Checks

- **ESLint** - Runs `npm run lint:check` to catch code quality issues
- **Prettier** - Validates code formatting consistency
- **TypeScript** - Runs `npm run type-check` to ensure type safety

### 2. Testing

- **Unit Tests** - Executes utility function tests using Vitest (Node.js environment)
- **Browser Tests** - Runs Storybook component tests with Playwright (conditional)

### 3. Build Verification

- **Production Build** - Builds the Next.js project to ensure no build errors

## Workflow Features

### Split Test Workspaces

- Utils tests and Storybook tests run in separate steps for better isolation
- Different test environments (Node.js vs. browser) are handled appropriately

### Conditional Storybook Tests

- Browser tests only run if Playwright installation succeeds
- Graceful fallback when browser dependencies are unavailable

### Resilient Build Process

- Handles network issues gracefully with informative error messages
- Includes retry logic for dependency installation

### Comprehensive Validation

- Covers all aspects: linting, formatting, type checking, testing, and building
- Ensures code quality and functionality before merging

## Workflow Trigger

The workflow is triggered on:

- Pull request events targeting the `development` branch (`branches: ['development']`)
- Both opening PRs and pushing new commits to existing PRs targeting development

## Known Limitations

### Environment Constraints

- Storybook tests may be skipped in environments where Playwright browser installation fails
- Some CI environments have restricted network access that may affect browser dependency installation

### Build Dependencies

- Build step may fail due to Google Fonts network issues in restricted CI environments
- Consider using font fallbacks or local font caching for better reliability in production

### Performance Considerations

- Full workflow can take 5-10 minutes depending on dependency installation
- Browser tests add significant time but provide valuable UI validation

## Local Testing

To run the same checks locally before pushing:

```bash
# Run all quality checks
npm run fix

# Run tests
npm run test
npm run test:storybook

# Verify build
npm run build
```

## Troubleshooting

### Common Issues

1. **Playwright Installation Failures**
   - Check if the system supports browser automation
   - Ensure sufficient disk space for browser binaries

2. **Network Timeouts**
   - Retry the workflow
   - Check for temporary network issues with external dependencies

3. **Build Failures**
   - Verify all environment variables are properly set
   - Check for syntax errors that may not be caught by linting

The workflow helps maintain code quality and functionality across all pull requests.
