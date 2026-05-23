import { describe, expect, it } from 'vitest';

import { createFreshQuizHref } from './quizNavigation';

describe('quiz navigation', () => {
  it('creates explicit fresh quiz session URLs', () => {
    const href = createFreshQuizHref();
    const url = new URL(href, 'https://popchoice.test');

    expect(url.pathname).toBe('/quiz');
    expect(url.searchParams.has('restart')).toBe(false);
    expect(url.searchParams.get('session')).toMatch(/^[a-z0-9]+-[a-z0-9]{6}$/);
  });
});
