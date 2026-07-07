import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestCatalogHealthRefresh } from './catalogHealthRefreshEvent';
import {
  acceptedRepairMessage,
  beginRepairSubmission,
  formActionUrl,
  handleRepairResponse,
  orchestrationAcceptedMessage,
  partialRepairMessage,
} from './catalogRepairEnhancement';

vi.mock('./catalogHealthRefreshEvent', () => ({
  requestCatalogHealthRefresh: vi.fn(),
}));

class FakeClassList {
  private readonly values = new Set<string>();

  add(value: string): void {
    this.values.add(value);
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }

  remove(value: string): void {
    this.values.delete(value);
  }

  toggle(value: string, force?: boolean): void {
    if (force) {
      this.add(value);
      return;
    }

    this.remove(value);
  }
}

type FakeRepairDom = {
  body: { appendChild: ReturnType<typeof vi.fn>; querySelector: ReturnType<typeof vi.fn> };
  button: { disabled: boolean; textContent: string };
  form: HTMLFormElement;
  message: { classList: FakeClassList; textContent: string };
  row: {
    classList: FakeClassList;
    parentElement: FakeRepairDom['body'];
    remove: ReturnType<typeof vi.fn>;
    cells: unknown[];
  };
};

function createFakeElement() {
  return {
    appendChild: vi.fn(),
    className: '',
    colSpan: 0,
    textContent: '',
  };
}

function createRepairDom(buttonText = 'Queue backfill'): FakeRepairDom {
  const button = { disabled: false, textContent: buttonText };
  const message = { classList: new FakeClassList(), textContent: '' };
  const body = { appendChild: vi.fn(), querySelector: vi.fn(() => null) };
  const row = {
    cells: [{}],
    classList: new FakeClassList(),
    parentElement: body,
    remove: vi.fn(),
  };
  const form = {
    closest: vi.fn(() => row),
    querySelector: vi.fn((selector: string) => {
      if (selector === '[data-repair-submit]') return button;
      if (selector === '[data-repair-message]') return message;
      return null;
    }),
  } as unknown as HTMLFormElement;

  return { body, button, form, message, row };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(requestCatalogHealthRefresh).mockClear();
  vi.stubGlobal('window', {
    clearTimeout: globalThis.clearTimeout,
    setTimeout: globalThis.setTimeout,
  });
  vi.stubGlobal('document', {
    createElement: vi.fn(() => createFakeElement()),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

describe('repair response side effects', () => {
  it('accepts queued repairs and removes the row after the settle delay', async () => {
    const dom = createRepairDom();
    const timeouts: number[] = [];
    const state = beginRepairSubmission(dom.form);

    expect(dom.button).toMatchObject({ disabled: true, textContent: 'Queueing...' });
    expect(dom.row.classList.contains('repair-pending')).toBe(true);

    handleRepairResponse(state, { ok: true, payload: { status: 'queued' } }, timeouts);

    expect(requestCatalogHealthRefresh).toHaveBeenCalledOnce();
    expect(dom.button).toMatchObject({ disabled: true, textContent: 'Accepted' });
    expect(dom.message).toMatchObject({ textContent: 'Accepted for worker' });
    expect(dom.message.classList.contains('accepted')).toBe(true);
    expect(dom.row.classList.contains('repair-accepted')).toBe(true);

    await vi.advanceTimersByTimeAsync(450);

    expect(dom.row.remove).toHaveBeenCalledOnce();
    expect(dom.body.appendChild).toHaveBeenCalledOnce();
    expect(timeouts).toHaveLength(1);
  });

  it('restores partial repairs to the original submit state', () => {
    const dom = createRepairDom('Retry repair');
    const state = beginRepairSubmission(dom.form);

    handleRepairResponse(
      state,
      {
        ok: true,
        payload: {
          status: 'partial',
          summary: { deduped: 2, failed: 3, queued: 1, unavailable: 4 },
        },
      },
      [],
    );

    expect(requestCatalogHealthRefresh).toHaveBeenCalledOnce();
    expect(dom.button).toMatchObject({ disabled: false, textContent: 'Retry repair' });
    expect(dom.message).toMatchObject({
      textContent: 'Partial: queued 1, deduped 2, failed 3, unavailable 4',
    });
    expect(dom.message.classList.contains('warn')).toBe(true);
  });

  it('accepts orchestration repair batches without removing the row', () => {
    const dom = createRepairDom();
    const state = beginRepairSubmission(dom.form);

    handleRepairResponse(
      state,
      {
        ok: true,
        payload: { status: 'orchestration_queued', summary: { batchId: 'batch-123' } },
      },
      [],
    );

    expect(requestCatalogHealthRefresh).toHaveBeenCalledOnce();
    expect(dom.button).toMatchObject({
      disabled: true,
      textContent: 'Orchestration accepted',
    });
    expect(dom.message).toMatchObject({
      textContent: 'Batch batch-123 accepted. Worker will queue jobs in chunks.',
    });
    expect(dom.row.remove).not.toHaveBeenCalled();
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
