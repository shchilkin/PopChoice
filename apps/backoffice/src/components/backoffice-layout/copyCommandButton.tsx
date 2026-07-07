'use client';

import { Button } from '@pop-choice/ui';
import { useState } from 'react';

type Props = {
  command: string;
};

type CopyState = 'idle' | 'copied' | 'failed';

function fallbackCopy(command: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = command;
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

export function CopyCommandButton({ command }: Props) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  async function copyCommand() {
    let didCopy = false;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(command);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy) {
      didCopy = fallbackCopy(command);
    }

    setCopyState(didCopy ? 'copied' : 'failed');
    window.setTimeout(() => setCopyState('idle'), 1800);
  }

  const label = copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy';

  return (
    <Button
      aria-label={`Copy command: ${command}`}
      aria-live="polite"
      className="command-copy-button"
      onClick={copyCommand}
      size="sm"
      type="button"
      variant="quiet"
    >
      {label}
    </Button>
  );
}
