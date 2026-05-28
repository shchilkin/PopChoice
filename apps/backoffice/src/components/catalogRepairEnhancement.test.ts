import { describe, expect, it } from 'vitest';

import { formActionUrl } from './catalogRepairEnhancement';

describe('formActionUrl', () => {
  it('uses the action attribute instead of the clobberable form.action property', () => {
    const form = {
      action: '[object HTMLInputElement]',
      getAttribute: (name: string) => (name === 'action' ? '/catalog-health/actions' : null),
    } as Pick<HTMLFormElement, 'getAttribute'> & { action: string };

    expect(formActionUrl(form, 'https://backoffice.pop-choice.shchilkin.dev/')).toBe(
      'https://backoffice.pop-choice.shchilkin.dev/catalog-health/actions',
    );
  });

  it('falls back to the current page URL when the form action is empty', () => {
    const form = {
      getAttribute: () => '',
    } as Pick<HTMLFormElement, 'getAttribute'>;

    expect(formActionUrl(form, 'https://backoffice.pop-choice.shchilkin.dev/catalog')).toBe(
      'https://backoffice.pop-choice.shchilkin.dev/catalog',
    );
  });
});
