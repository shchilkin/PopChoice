import type { CatalogMovieDetail } from '@pop-choice/shared';

import { CountPill } from '../shared';
import { duplicatePeerCount, splitHealthFlags } from './helpers';

export function HealthFlagsPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { activeFlags, resolvedFlags } = splitHealthFlags(detail.healthFlags);

  return (
    <article className={`panel ${activeFlags.length > 0 ? 'needs-work' : 'healthy'}`}>
      <div className="panel-header">
        <div>
          <h2>Health flags</h2>
          <div className="issue-hint">
            Same predicates as Catalog Health, scoped to this movie row.
          </div>
        </div>
        <CountPill
          count={activeFlags.length}
          state={activeFlags.length > 0 ? 'warning' : 'healthy'}
        />
      </div>
      <div className="flag-list">
        {activeFlags.length === 0 ? (
          <span className="pill healthy">No active flags</span>
        ) : (
          activeFlags.map((flag) => (
            <span key={flag.key} className="pill warning">
              {flag.label}
            </span>
          ))
        )}
      </div>
      <details className="compact-details">
        <summary>Resolved checks ({resolvedFlags.length})</summary>
        <div className="flag-list">
          {resolvedFlags.map((flag) => (
            <span key={flag.key} className="pill">
              {flag.label}
            </span>
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
