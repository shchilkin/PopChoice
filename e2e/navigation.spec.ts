import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('navigating to / loads the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PopChoice/);
    await expect(page.getByRole('heading', { name: 'PopChoice' })).toBeVisible();
  });

  test('navigating to /quiz loads the quiz intro', async ({ page }) => {
    await page.goto('/quiz');
    // QuizIntro shows solo and group mode buttons
    await expect(page.getByRole('button', { name: /Just me/i })).toBeVisible();
  });

  test('navigating to /about loads the about page', async ({ page }) => {
    await page.goto('/about');
    // About heading comes from t.about.title = 'AI that gets your taste'
    await expect(page.getByRole('heading', { name: 'AI that gets your taste' })).toBeVisible();
  });

  test('navigating to /results without recommendation data redirects to /quiz', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('popchoice_recommendation');
    });
    await page.goto('/results');
    await expect(page).toHaveURL('/quiz');
  });

  test('navigating to /results with recommendation data shows results heading', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'popchoice_recommendation',
        JSON.stringify({
          similarMovies: [
            {
              id: 1,
              name: 'Test Movie',
              year: 2024,
              similarity: 0.95,
              posterURL: 'https://image.tmdb.org/t/p/w500/test.jpg',
              isMainRecommendation: true,
            },
          ],
        }),
      );
    });
    await page.goto('/results');
    // t.results.title = 'We found your perfect film'
    await expect(page.getByRole('heading', { name: 'We found your perfect film' })).toBeVisible();
  });

  test('/loading without quiz data redirects to /quiz', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('popchoice_quiz_data');
    });
    await page.goto('/loading');
    await expect(page).toHaveURL('/quiz');
  });
});

test.describe('TopNavigation logo link', () => {
  test('logo link on /about navigates back to /', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('link', { name: 'PopChoice' }).click();
    await expect(page).toHaveURL('/');
  });

  test('logo link on /quiz navigates back to /', async ({ page }) => {
    await page.goto('/quiz');
    await page.getByRole('link', { name: 'PopChoice' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('TopNavigation nav links', () => {
  test('"Movies" nav link navigates to /available-movies', async ({ page }) => {
    await page.goto('/about');
    // t.nav.availableMovies = 'Movies'
    await page.getByRole('link', { name: 'Movies' }).click();
    await expect(page).toHaveURL('/available-movies');
  });

  test('"Find a movie" nav link navigates to /quiz', async ({ page }) => {
    await page.goto('/about');
    // t.nav.findAMovie = 'Find a movie' — CTA link shown on non-landing pages
    await page.getByRole('link', { name: 'Find a movie' }).click();
    await expect(page).toHaveURL('/quiz');
  });
});

test.describe('/available-movies page', () => {
  test('navigating to /available-movies loads the page with heading', async ({ page }) => {
    await page.goto('/available-movies');
    // t.moviesPage.title = 'Available Movies'
    await expect(page.getByRole('heading', { name: 'Available Movies' })).toBeVisible();
  });

  test('/available-movies table shows column headers', async ({ page }) => {
    await page.goto('/available-movies');
    // t.moviesPage.columns — Name, Age Rating, Duration, Score
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Age Rating' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Duration' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Score' })).toBeVisible();
  });
});
