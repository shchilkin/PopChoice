'use client';

import { useEffect } from 'react';

type RepairTone = '' | 'good' | 'warn';

function setMessage(form: HTMLFormElement, text: string, tone: RepairTone): void {
  const message = form.querySelector<HTMLElement>('[data-repair-message]');
  if (!message) return;

  message.textContent = text;
  message.classList.toggle('good', tone === 'good');
  message.classList.toggle('warn', tone === 'warn');
}

function setButton(form: HTMLFormElement, text: string, disabled: boolean): void {
  const button = form.querySelector<HTMLButtonElement>('[data-repair-submit]');
  if (!button) return;

  button.textContent = text;
  button.disabled = disabled;
}

function appendEmptyPlaceholder(body: HTMLElement | null, columnCount: number): void {
  if (!body || body.querySelector('[data-repair-row]')) return;

  const placeholder = document.createElement('tr');
  const cell = document.createElement('td');
  cell.className = 'repair-placeholder';
  cell.colSpan = columnCount;
  cell.textContent =
    'Visible sample queued. Refresh after workers complete to verify catalog health.';
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

export function CatalogRepairEnhancement() {
  useEffect(() => {
    if (!window.fetch || !window.FormData) return undefined;

    const cleanups: Array<() => void> = [];
    const timeouts: number[] = [];
    const forms = document.querySelectorAll<HTMLFormElement>('[data-repair-form]');

    forms.forEach((form) => {
      const submit = async (event: SubmitEvent) => {
        event.preventDefault();

        const row = form.closest<HTMLTableRowElement>('[data-repair-row]');
        const originalText =
          form.querySelector('[data-repair-submit]')?.textContent || 'Queue backfill';

        row?.classList.add('repair-pending');
        setButton(form, 'Queueing...', true);
        setMessage(form, 'Queueing...', '');

        try {
          const response = await fetch(form.action, {
            body: formBody(form),
            headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' },
            method: 'POST',
          });
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
            status?: string;
          } | null;

          if (response.ok && payload?.status === 'queued') {
            row?.classList.remove('repair-pending');
            row?.classList.add('repair-queued');
            setButton(form, 'Queued', true);
            setMessage(form, 'Queued for workers', 'good');

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

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  return null;
}
