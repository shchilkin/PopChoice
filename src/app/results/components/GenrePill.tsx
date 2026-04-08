export function GenrePill({ genre }: { genre: string }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs"
      style={{
        background: 'var(--pc-bd1)',
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t2)',
      }}
    >
      {genre}
    </span>
  );
}
