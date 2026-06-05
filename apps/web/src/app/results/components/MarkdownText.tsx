'use client';

import type { ReactNode } from 'react';

/**
 * Renders a string containing `**bold**` or `*italic*` markdown as React elements.
 * Double asterisks → <strong>, single asterisks → <em>.
 * Both patterns are what the AI description generator produces.
 */
export function MarkdownText({ text, style }: { text: string; style?: React.CSSProperties }) {
  // Split on **bold** first, then *italic* within plain segments.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return <span style={style}>{parts.map((part, index) => renderMarkdownPart(part, index))}</span>;
}

type MarkdownPartKind = 'bold' | 'italic' | 'text';

const MARKDOWN_RENDERERS: Record<MarkdownPartKind, (part: string, index: number) => ReactNode> = {
  bold: (part, index) => <strong key={index}>{part.slice(2, -2)}</strong>,
  italic: (part, index) => <em key={index}>{part.slice(1, -1)}</em>,
  text: (part) => part,
};

const MARKDOWN_PATTERNS: Array<{ kind: MarkdownPartKind; pattern: RegExp }> = [
  { kind: 'bold', pattern: /^\*\*[^*]+\*\*$/ },
  { kind: 'italic', pattern: /^\*[^*]+\*$/ },
];

function renderMarkdownPart(part: string, index: number): ReactNode {
  return MARKDOWN_RENDERERS[getMarkdownPartKind(part)](part, index);
}

function getMarkdownPartKind(part: string): MarkdownPartKind {
  return MARKDOWN_PATTERNS.find(({ pattern }) => pattern.test(part))?.kind ?? 'text';
}
