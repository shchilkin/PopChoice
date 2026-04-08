import { Sparkles } from 'lucide-react';

export function SimilarityBadge({ similarity }: { similarity: number }) {
  const pct = Math.round(similarity * 100);
  const color = pct >= 95 ? '#14B8A6' : pct >= 90 ? '#F5C518' : pct >= 85 ? '#FF9F1C' : '#8B5CF6';
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}35`,
        color,
      }}
    >
      <Sparkles size={10} />
      {pct}% match
    </div>
  );
}
