import { formatBackofficeDateTime } from '../../lib/backoffice';
import { DataTable } from '../shared';

import { StatusBadge } from './reviewPresentation';

import type { TMDBMatchReviewActionAudit } from '@pop-choice/shared';

export function AuditRows({ audit }: { audit: TMDBMatchReviewActionAudit[] }) {
  if (audit.length === 0) return <p className="empty">No decisions have been recorded yet.</p>;

  return (
    <DataTable columns={['When', 'Actor', 'Action', 'Status', 'Candidate', 'Note']}>
      {audit.map((entry) => (
        <tr key={entry.id}>
          <td>{formatBackofficeDateTime(entry.createdAt)}</td>
          <td>{entry.actor}</td>
          <td>{entry.action.replaceAll('_', ' ')}</td>
          <td>
            {entry.previousStatus ? (
              <StatusBadge status={entry.previousStatus} />
            ) : (
              <span className="data-pill neutral">-</span>
            )}{' '}
            <StatusBadge status={entry.newStatus} />
          </td>
          <td>
            {entry.candidate?.id ?? '-'} {entry.candidate ? entry.candidate.title : ''}
          </td>
          <td>{entry.note ?? '-'}</td>
        </tr>
      ))}
    </DataTable>
  );
}
