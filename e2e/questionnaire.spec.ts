import { expect, test } from '@playwright/test';

// The quiz is at /quiz and has 5 steps (no localStorage setup required).
// Steps: 0=FavoriteMovie, 1=Era, 2=Mood, 3=Tone, 4=FavoriteActor

test.describe('Quiz intro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quiz');
  });

  test('shows solo and group mode options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Just me/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Group mode/i })).toBeVisible();
  });

  test('clicking "Just me" starts the quiz at step 1', async ({ page }) => {
    await page.getByRole('button', { name: /Just me/i }).click();
    // FavoriteMovieStep — t.quiz.favoriteMovie.title
    await expect(page.getByRole('heading', { name: "What's your favorite movie?" })).toBeVisible();
  });

  test('clicking "Group mode" shows group setup screen', async ({ page }) => {
    await page.getByRole('button', { name: /Group mode/i }).click();
    // GroupSetup — t.quiz.groupSetup.title
    await expect(page.getByRole('heading', { name: "Who's watching?" })).toBeVisible();
  });
});

test.describe('Quiz questions (solo flow)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quiz');
    await page.getByRole('button', { name: /Just me/i }).click();
  });

  test('step 1: favorite movie input is visible', async ({ page }) => {
    await expect(page.getByPlaceholder(/The Dark Knight, Parasite/)).toBeVisible();
  });

  test('step 1: Continue button is disabled when input is empty', async ({ page }) => {
    // Continue button — uses t.quiz.nav.continue
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  test('step 1: typing a movie enables Continue', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  test('step 2: era options are visible after proceeding from step 1', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    // EraStep — t.quiz.era.title
    await expect(
      page.getByRole('heading', { name: 'New releases or timeless classics?' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Releases' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeless Classics' })).toBeVisible();
    await expect(page.getByRole('button', { name: "I'm open to both" })).toBeVisible();
  });

  test('step 2: selecting an era enables Continue', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await page.getByRole('button', { name: 'New Releases' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  test('step 3: mood genre chips are visible', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Releases' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    // MoodStep shows GENRES — Action, Comedy, Drama, etc.
    await expect(page.getByRole('heading', { name: "What's your mood tonight?" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Action' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comedy' })).toBeVisible();
  });

  test('step 3: multiple mood genres can be selected', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Releases' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Action' }).click();
    await page.getByRole('button', { name: 'Drama' }).click();
    // Both should show as selected (Continue becomes enabled)
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  test('ProgressDots updates as steps advance', async ({ page }) => {
    // Step 1 of 5 — dot indicator shows "1 of 5"
    await expect(page.getByText('1 of 5')).toBeVisible();
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('2 of 5')).toBeVisible();
  });

  test('Back button returns to previous step', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('2 of 5')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('1 of 5')).toBeVisible();
  });

  test('step 4: tone options are visible after proceeding from step 3', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Releases' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Action' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    // ToneStep — t.quiz.tone.title = 'What tone are you after?'
    await expect(page.getByRole('heading', { name: 'What tone are you after?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Light & Fun' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Balanced' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Serious' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dark & Intense' })).toBeVisible();
  });

  test('step 4: selecting a tone enables Continue', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Releases' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Action' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await page.getByRole('button', { name: 'Light & Fun' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  test('step 5: actor input is visible and nav shows "Find My Movie"', async ({ page }) => {
    await page.getByPlaceholder(/The Dark Knight, Parasite/).fill('Inception');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Releases' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Action' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Light & Fun' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    // FavoriteActorStep — t.quiz.actor.title = "Who's your favorite actor?"
    await expect(page.getByRole('heading', { name: "Who's your favorite actor?" })).toBeVisible();
    // t.quiz.actor.placeholder = 'e.g. Tom Hanks, Meryl Streep, Cillian Murphy…'
    await expect(page.getByPlaceholder(/Tom Hanks, Meryl Streep/)).toBeVisible();
    // Last step in solo mode — nav button shows 'Find My Movie ✨' (t.quiz.nav.findMyMovie)
    await expect(page.getByRole('button', { name: 'Find My Movie ✨' })).toBeVisible();
  });
});

test.describe('Quiz group setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quiz');
    await page.getByRole('button', { name: /Group mode/i }).click();
  });

  test('group name inputs are shown', async ({ page }) => {
    // Two placeholder inputs: "Person 1's name", "Person 2's name"
    await expect(page.getByPlaceholder("Person 1's name")).toBeVisible();
    await expect(page.getByPlaceholder("Person 2's name")).toBeVisible();
  });

  test('"Add another person" button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add another person' })).toBeVisible();
  });

  test('entering names and confirming starts the quiz for person 1', async ({ page }) => {
    await page.getByPlaceholder("Person 1's name").fill('Alice');
    await page.getByPlaceholder("Person 2's name").fill('Bob');
    await page.getByRole('button', { name: "Let's go!" }).click();
    // Should be on step 1 of quiz for Alice — person tab and heading are visible
    await expect(page.getByText("Alice's turn")).toBeVisible();
    await expect(page.getByRole('heading', { name: "What's your favorite movie?" })).toBeVisible();
  });
});
