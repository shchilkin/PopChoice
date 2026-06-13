import { expect, test, type Page } from 'playwright/test';

const localizedLandingSmokeCases = [
  {
    aboutFeature: 'Считывает ситуацию',
    aboutTitle: 'Киновечер без бесконечного скролла',
    locale: 'ru',
    modeHeadline: 'Выберите формат киновечера',
    modeTitle: 'Быстрый подбор',
  },
  {
    aboutFeature: 'Lukee tilanteen',
    aboutTitle: 'Elokuvailta ilman loputonta selaamista',
    locale: 'fi',
    modeHeadline: 'Valitse millainen elokuvailta on tulossa',
    modeTitle: 'Pikavalinta',
  },
] as const;

const MOCK_POSTERS = Array.from({ length: 8 }, (_, index) => {
  const color = ['1a1a2e', '16213e', '0f3460', '533483', '2c003e', '1b1b2f', '0d1117', '0a0a14'][
    index
  ];

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect width="300" height="450" fill="#${color}"/></svg>`,
  )}`;
});

async function setStoredLocale(page: Page, locale: string) {
  await page.addInitScript((storedLocale) => {
    window.localStorage.setItem('popchoice_locale', storedLocale);
  }, locale);
}

async function mockPosterApi(page: Page) {
  await page.route('**/api/poster-urls', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ posters: MOCK_POSTERS }),
    });
  });
}

test('landing page presents current recommendation modes and starts the quiz', async ({ page }) => {
  await mockPosterApi(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'PopChoice' })).toBeVisible();
  await expect(page.getByText('Choose your kind of movie night')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fast Pick' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Normal Match' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Duo & Group' })).toBeVisible();
  await expect(page.getByText('Choose speed and audience')).toBeVisible();
  await expect(page.getByText('AI blends sources')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Design System' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Find My Movie' }).first().click();

  await expect(page).toHaveURL(/\/quiz\?session=/);
  await expect(page.getByRole('heading', { name: "Let's find your movie" })).toBeVisible();
});

test('about page leads with product value before the builder story', async ({ page }) => {
  await page.goto('/about');

  await expect(
    page.getByRole('heading', { name: 'Movie night, without the endless scroll' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Find My Movie' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What it does' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reads the room' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Respects hard avoids' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Learns with feedback' })).toBeVisible();

  const productIntro = page.getByText('PopChoice helps solo watchers');
  const builderNote = page.getByRole('heading', { name: 'Builder note' });

  await expect(builderNote).toBeVisible();
  await expect(productIntro).toBeVisible();

  const introTop = await productIntro.evaluate((element) => element.getBoundingClientRect().top);
  const builderTop = await builderNote.evaluate((element) => element.getBoundingClientRect().top);

  expect(introTop).toBeLessThan(builderTop);
});

for (const copy of localizedLandingSmokeCases) {
  test(`landing and about render refreshed copy in ${copy.locale}`, async ({ page }) => {
    await setStoredLocale(page, copy.locale);
    await mockPosterApi(page);

    await page.goto('/');

    await expect(page.getByText(copy.modeHeadline)).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.modeTitle })).toBeVisible();

    await page.goto('/about');

    await expect(page.getByRole('heading', { name: copy.aboutTitle })).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.aboutFeature })).toBeVisible();
  });
}
