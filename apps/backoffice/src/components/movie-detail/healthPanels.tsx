import type { CatalogMovieDetail } from '@pop-choice/shared';
import { Badge, cn } from '@pop-choice/ui';

import { CountPill } from '../shared';
import { duplicatePeerCount, splitHealthFlags } from './helpers';

export function HealthFlagsPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { activeFlags, resolvedFlags } = splitHealthFlags(detail.healthFlags);
  const needsWork = activeFlags.length > 0;

  return (
    <article
      className={cn(
        'grid gap-4 border-t pt-5',
        needsWork
          ? 'border-[var(--warn)]'
          : 'border-[color-mix(in_srgb,var(--good),var(--border)_70%)]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-medium text-[var(--text)]">Health flags</h2>
          <p className="m-0 text-sm font-bold text-[var(--muted)]">
            Catalog Health checks scoped to this movie row.
          </p>
        </div>
        <Badge
          className="min-w-12 text-center text-base"
          variant={needsWork ? 'warning' : 'success'}
        >
          {activeFlags.length}
        </Badge>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {activeFlags.length === 0 ? (
          <Badge variant="success">No active flags</Badge>
        ) : (
          activeFlags.map((flag) => (
            <Badge key={flag.key} variant="warning">
              {flag.label}
            </Badge>
          ))
        )}
      </div>
      <details className="text-sm font-bold text-[var(--muted)]">
        <summary className="cursor-pointer">Resolved checks ({resolvedFlags.length})</summary>
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {resolvedFlags.map((flag) => (
            <Badge key={flag.key} variant="muted">
              {flag.label}
            </Badge>
          ))}
        </div>
      </details>
    </article>
  );
}

function PeerList({
  peers,
}: {
  peers: { id: string; name: string; year: number; tmdbId: number | null }[];
}) {
  if (peers.length === 0) return <p className="empty compact">No peers found.</p>;

  return (
    <ul className="peer-list">
      {peers.map((peer) => (
        <li key={peer.id}>
          <a href={`/movies/${encodeURIComponent(peer.id)}`}>#{peer.id}</a>
          <span>{peer.name}</span>
          <span className="muted">
            {peer.year}
            {peer.tmdbId === null ? '' : ` · TMDB ${peer.tmdbId}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DuplicatePeersPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { duplicateContext } = detail;
  const total = duplicatePeerCount(duplicateContext);

  return (
    <article className={`panel ${total > 0 ? 'needs-work' : 'healthy'}`}>
      <div className="panel-header">
        <div>
          <h2>Duplicate context</h2>
          <div className="issue-hint">
            Peer rows with matching TMDB id or normalized title/year.
          </div>
        </div>
        <CountPill count={total} state={total > 0 ? 'warning' : 'healthy'} />
      </div>
      <div className="duplicate-context">
        <div>
          <h3>Same TMDB id</h3>
          <PeerList peers={duplicateContext.tmdbIdPeers} />
        </div>
        <div>
          <h3>Same normalized title/year</h3>
          <PeerList peers={duplicateContext.normalizedTitleYearPeers} />
        </div>
      </div>
    </article>
  );
}
