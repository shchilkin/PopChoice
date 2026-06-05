import { describe, expect, it } from 'vitest';

import {
  acceptedRepairMessage,
  formActionUrl,
  orchestrationAcceptedMessage,
  partialRepairMessage,
} from './catalogRepairEnhancement';

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

describe('repair status messages', () => {
  it('keeps accepted messages aligned with single and bulk repair statuses', () => {
    expect(acceptedRepairMessage({ status: 'queued' })).toBe('Accepted for worker');
    expect(acceptedRepairMessage({ status: 'deduped' })).toBe('Already queued for worker');
    expect(
      acceptedRepairMessage({
        mode: 'bulk',
        status: 'queued',
        summary: { deduped: 2, queued: 5 },
      }),
    ).toBe('Accepted 5, already queued 2');
  });

  it('keeps orchestration and partial repair summaries stable', () => {
    expect(orchestrationAcceptedMessage({ batchId: 'batch-123' })).toBe(
      'Batch batch-123 accepted. Worker will queue jobs in chunks.',
    );
    expect(orchestrationAcceptedMessage(undefined)).toBe(
      'Batch accepted. Worker will queue jobs in chunks.',
    );
    expect(partialRepairMessage({ deduped: 2, failed: 3, queued: 1, unavailable: 4 })).toBe(
      'Partial: queued 1, deduped 2, failed 3, unavailable 4',
    );
  });
});
