'use client';

import { useEffect } from 'react';

import { requestCatalogHealthRefresh } from './catalogHealthRefreshEvent';

type RepairTone = '' | 'accepted' | 'good' | 'warn';

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

        const confirmMessage = form.dataset.confirmMessage;
        if (confirmMessage && form.dataset.confirmed !== 'true') {
          showInlineConfirmation(form, confirmMessage);
          setMessage(form, 'Confirm this batch in-place to continue.', 'warn');
          return;
        }
        delete form.dataset.confirmed;
        removeInlineConfirmation(form);

        const row = form.closest<HTMLTableRowElement>('[data-repair-row]');
        const originalText =
          form.querySelector('[data-repair-submit]')?.textContent || 'Queue backfill';

        row?.classList.add('repair-pending');
        setButton(form, 'Queueing...', true);
        setMessage(form, 'Queueing...', '');

        try {
          const response = await fetch(formActionUrl(form), {
            body: formBody(form),
            headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' },
            method: 'POST',
          });
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
            mode?: string;
            status?: string;
            summary?: {
              batchId?: string;
              queued?: number;
              deduped?: number;
              failed?: number;
              unavailable?: number;
            };
          } | null;

          if (response.ok && (payload?.status === 'queued' || payload?.status === 'deduped')) {
            requestCatalogHealthRefresh();
            row?.classList.remove('repair-pending');
            row?.classList.add('repair-accepted');
            const deduped = payload.status === 'deduped';
            setButton(form, deduped ? 'Already queued' : 'Accepted', true);
            const bulkSummary = payload.mode === 'bulk' ? payload.summary : null;
            const bulkMessage = bulkSummary
              ? `Accepted ${bulkSummary.queued ?? 0}, already queued ${bulkSummary.deduped ?? 0}`
              : deduped
                ? 'Already queued for worker'
                : 'Accepted for worker';
            setMessage(form, bulkMessage, 'accepted');

            if (row) {
              const timeoutId = window.setTimeout(() => {
                const body = row.parentElement;
                const columnCount = row.cells.length;
                row.remove();
                appendEmptyPlaceholder(body, columnCount);
              }, 450);
              timeouts.push(timeoutId);
            }
            return;
          }

          if (response.ok && payload?.status === 'orchestration_queued') {
            requestCatalogHealthRefresh();
            row?.classList.remove('repair-pending');
            setButton(form, 'Orchestration accepted', true);
            const batchId = payload.summary?.batchId;
            setMessage(
              form,
              batchId
                ? `Batch ${batchId} accepted. Worker will queue jobs in chunks.`
                : 'Batch accepted. Worker will queue jobs in chunks.',
              'accepted',
            );
            return;
          }

          if (response.ok && payload?.status === 'partial') {
            requestCatalogHealthRefresh();
            const bulkSummary = payload.summary;
            row?.classList.remove('repair-pending');
            setButton(form, originalText, false);
            setMessage(
              form,
              `Partial: queued ${bulkSummary?.queued ?? 0}, deduped ${bulkSummary?.deduped ?? 0}, failed ${bulkSummary?.failed ?? 0}, unavailable ${bulkSummary?.unavailable ?? 0}`,
              'warn',
            );
            return;
          }

          row?.classList.remove('repair-pending');
          setButton(form, originalText, false);
          setMessage(form, payload?.message || 'Queue unavailable. Check Redis and logs.', 'warn');
        } catch {
          row?.classList.remove('repair-pending');
          setButton(form, originalText, false);
          setMessage(form, 'Request failed. Try again.', 'warn');
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
