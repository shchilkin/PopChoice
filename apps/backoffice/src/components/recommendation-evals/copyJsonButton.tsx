'use client';

import { useState } from 'react';
import { Button } from '@pop-choice/ui';

type CopyState = 'idle' | 'copied' | 'failed';

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function CopyJsonButton({ label, text }: { label: string; text: string }) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  async function copyJson() {
    let didCopy = false;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy) {
      didCopy = fallbackCopy(text);
    }

    setCopyState(didCopy ? 'copied' : 'failed');
    window.setTimeout(() => setCopyState('idle'), 1800);
  }

  const copyLabel =
    copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy';

  return (
    <Button
      aria-label={`Copy ${label}`}
      aria-live="polite"
      className="json-copy-button"
      onClick={copyJson}
      size="sm"
      type="button"
      variant="quiet"
    >
      {copyLabel}
    </Button>
  );
}
