'use client';

/**
 * Renders a string containing `**bold**` or `*italic*` markdown as React elements.
 * Double asterisks → <strong>, single asterisks → <em>.
 * Both patterns are what the AI description generator produces.
 */
export function MarkdownText({ text, style }: { text: string; style?: React.CSSProperties }) {
  // Split on **bold** first, then *italic* within plain segments.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </span>
  );
}
