'use client';

import { useEffect } from 'react';

import { requestCatalogHealthRefresh } from './catalogHealthRefreshEvent';

type RepairTone = '' | 'accepted' | 'good' | 'warn';

type RepairSummary = {
  batchId?: string;
  queued?: number;
  deduped?: number;
  failed?: number;
  unavailable?: number;
};

type RepairPayload = {
  message?: string;
  mode?: string;
  status?: string;
  summary?: RepairSummary;
};

type RepairResponse = {
  ok: boolean;
  payload: RepairPayload | null;
};

type RepairSubmissionState = {
  form: HTMLFormElement;
  originalText: string;
  row: HTMLTableRowElement | null;
};

type RepairStatusHandler = (
  state: RepairSubmissionState,
  payload: RepairPayload,
  timeouts: number[],
) => void;

const REPAIR_SUBMISSION_TIMEOUT_MS = 15_000;

function setMessage(form: HTMLFormElement, text: string, tone: RepairTone): void {
  const message = form.querySelector<HTMLElement>('[data-repair-message]');
  if (!message) return;

  message.textContent = text;
  message.classList.toggle('accepted', tone === 'accepted');
  message.classList.toggle('good', tone === 'good');
  message.classList.toggle('warn', tone === 'warn');
}

function setButton(form: HTMLFormElement, text: string, disabled: boolean): void {
  const button = form.querySelector<HTMLButtonElement>('[data-repair-submit]');
  if (!button) return;

  button.textContent = text;
  button.disabled = disabled;
}

function removeInlineConfirmation(form: HTMLFormElement): void {
  form.querySelector('[data-inline-confirmation]')?.remove();
}

function showInlineConfirmation(form: HTMLFormElement, message: string): void {
  const existing = form.querySelector<HTMLElement>('[data-inline-confirmation]');
  if (existing) {
    existing.querySelector<HTMLButtonElement>('[data-confirm-submit]')?.focus();
    return;
  }

  const confirmation = document.createElement('div');
  confirmation.className = 'inline-confirmation';
  confirmation.dataset.inlineConfirmation = 'true';

  const copy = document.createElement('p');
  copy.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'inline-confirmation-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button success small';
  confirm.dataset.confirmSubmit = 'true';
  confirm.type = 'submit';
  confirm.textContent = 'Confirm batch';
  confirm.addEventListener('click', () => {
    form.dataset.confirmed = 'true';
  });

  const cancel = document.createElement('button');
  cancel.className = 'button quiet small';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    delete form.dataset.confirmed;
    removeInlineConfirmation(form);
    setMessage(form, 'Batch action cancelled.', '');
  });

  actions.append(confirm, cancel);
  confirmation.append(copy, actions);
  form.appendChild(confirmation);
  confirm.focus();
}

function appendEmptyPlaceholder(body: HTMLElement | null, columnCount: number): void {
  if (!body || body.querySelector('[data-repair-row]')) return;

  const placeholder = document.createElement('tr');
  const cell = document.createElement('td');
  cell.className = 'repair-placeholder';
  cell.colSpan = columnCount;
  cell.textContent =
    'Visible sample accepted. It stays unresolved until workers update catalog health.';
  placeholder.appendChild(cell);
  body.appendChild(placeholder);
}

function formBody(form: HTMLFormElement): URLSearchParams {
  const body = new URLSearchParams();
  new FormData(form).forEach((value, key) => {
    if (typeof value === 'string') {
      body.append(key, value);
    }
  });
  return body;
}

function confirmInlineSubmission(form: HTMLFormElement): boolean {
  const confirmMessage = form.dataset.confirmMessage;
  if (confirmMessage && form.dataset.confirmed !== 'true') {
    showInlineConfirmation(form, confirmMessage);
    setMessage(form, 'Confirm this batch in-place to continue.', 'warn');
    return false;
  }

  delete form.dataset.confirmed;
  removeInlineConfirmation(form);
  return true;
}

function submitButtonText(form: HTMLFormElement): string {
  return form.querySelector('[data-repair-submit]')?.textContent || 'Queue backfill';
}

export function beginRepairSubmission(form: HTMLFormElement): RepairSubmissionState {
  const state = {
    form,
    originalText: submitButtonText(form),
    row: form.closest<HTMLTableRowElement>('[data-repair-row]'),
  };

  state.row?.classList.add('repair-pending');
  setButton(form, 'Queueing...', true);
  setMessage(form, 'Queueing...', '');
  return state;
}

async function readRepairPayload(response: Response): Promise<RepairPayload | null> {
  return (await response.json().catch(() => null)) as RepairPayload | null;
}

function repairSubmissionAbortSignal(): { clear: () => void; signal: AbortSignal } {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REPAIR_SUBMISSION_TIMEOUT_MS);

  return {
    clear: () => window.clearTimeout(timeoutId),
    signal: controller.signal,
  };
}

async function postRepairSubmission(form: HTMLFormElement): Promise<RepairResponse> {
  const abort = repairSubmissionAbortSignal();

  try {
    const response = await fetch(formActionUrl(form), {
      body: formBody(form),
      headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' },
      method: 'POST',
      signal: abort.signal,
    });

    return {
      ok: response.ok,
      payload: await readRepairPayload(response),
    };
  } finally {
    abort.clear();
  }
}

function clearPending(state: RepairSubmissionState): void {
  state.row?.classList.remove('repair-pending');
}

function restoreRepairForm(state: RepairSubmissionState, message: string): void {
  clearPending(state);
  setButton(state.form, state.originalText, false);
  setMessage(state.form, message, 'warn');
}

export function acceptedRepairMessage(payload: RepairPayload): string {
  const bulkSummary = payload.mode === 'bulk' ? payload.summary : null;
  if (bulkSummary) {
    return `Accepted ${bulkSummary.queued ?? 0}, already queued ${bulkSummary.deduped ?? 0}`;
  }

  return payload.status === 'deduped' ? 'Already queued for worker' : 'Accepted for worker';
}

function scheduleAcceptedRowRemoval(row: HTMLTableRowElement | null, timeouts: number[]): void {
  if (!row) return;

  const timeoutId = window.setTimeout(() => {
    const body = row.parentElement;
    const columnCount = row.cells.length;
    row.remove();
    appendEmptyPlaceholder(body, columnCount);
  }, 450);
  timeouts.push(timeoutId);
}

function handleQueuedOrDedupedRepair(
  state: RepairSubmissionState,
  payload: RepairPayload,
  timeouts: number[],
): void {
  requestCatalogHealthRefresh();
  clearPending(state);
  state.row?.classList.add('repair-accepted');
  setButton(state.form, payload.status === 'deduped' ? 'Already queued' : 'Accepted', true);
  setMessage(state.form, acceptedRepairMessage(payload), 'accepted');
  scheduleAcceptedRowRemoval(state.row, timeouts);
}

export function orchestrationAcceptedMessage(summary: RepairSummary | undefined): string {
  return summary?.batchId
    ? `Batch ${summary.batchId} accepted. Worker will queue jobs in chunks.`
    : 'Batch accepted. Worker will queue jobs in chunks.';
}

function handleOrchestrationQueuedRepair(
  state: RepairSubmissionState,
  payload: RepairPayload,
): void {
  requestCatalogHealthRefresh();
  clearPending(state);
  setButton(state.form, 'Orchestration accepted', true);
  setMessage(state.form, orchestrationAcceptedMessage(payload.summary), 'accepted');
}

export function partialRepairMessage(summary: RepairSummary | undefined): string {
  return `Partial: queued ${summary?.queued ?? 0}, deduped ${summary?.deduped ?? 0}, failed ${summary?.failed ?? 0}, unavailable ${summary?.unavailable ?? 0}`;
}

function handlePartialRepair(state: RepairSubmissionState, payload: RepairPayload): void {
  requestCatalogHealthRefresh();
  restoreRepairForm(state, partialRepairMessage(payload.summary));
}

const REPAIR_STATUS_HANDLERS: Record<string, RepairStatusHandler> = {
  deduped: handleQueuedOrDedupedRepair,
  orchestration_queued: handleOrchestrationQueuedRepair,
  partial: handlePartialRepair,
  queued: handleQueuedOrDedupedRepair,
};

export function handleRepairResponse(
  state: RepairSubmissionState,
  response: RepairResponse,
  timeouts: number[],
): void {
  const status = response.payload?.status;
  const handler = status ? REPAIR_STATUS_HANDLERS[status] : undefined;

  if (response.ok && handler && response.payload) {
    handler(state, response.payload, timeouts);
    return;
  }

  restoreRepairForm(state, response.payload?.message || 'Queue unavailable. Check Redis and logs.');
}

export function formActionUrl(
  form: Pick<HTMLFormElement, 'getAttribute'>,
  baseUrl = window.location.href,
): string {
  const action = form.getAttribute('action');
  return new URL(action || baseUrl, baseUrl).toString();
}

export function CatalogRepairEnhancement() {
  useEffect(() => {
    if (!window.fetch || !window.FormData) return undefined;

    const cleanups: Array<() => void> = [];
    const timeouts: number[] = [];
    const forms = document.querySelectorAll<HTMLFormElement>(
      '[data-repair-form], [data-bulk-repair-form]',
    );

    forms.forEach((form) => {
      const submit = async (event: SubmitEvent) => {
        event.preventDefault();

        if (!confirmInlineSubmission(form)) {
          return;
        }

        const state = beginRepairSubmission(form);

        try {
          handleRepairResponse(state, await postRepairSubmission(form), timeouts);
        } catch {
          restoreRepairForm(state, 'Request failed. Try again.');
        }
      };

      form.addEventListener('submit', submit);
      cleanups.push(() => form.removeEventListener('submit', submit));
    });

    document.documentElement.dataset.catalogRepairEnhanced = 'true';

    return () => {
      delete document.documentElement.dataset.catalogRepairEnhanced;
      cleanups.forEach((cleanup) => cleanup());
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  return null;
}
