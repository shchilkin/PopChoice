import { describe, expect, it } from 'vitest';

import { repairResultStatusLabel, repairResultStatusTone } from './catalog-health';
import { repairStatusLabel } from './repair-batches';

describe('repair state presentation', () => {
  it('labels accepted work separately from resolved work', () => {
    expect(repairStatusLabel('queued')).toBe('Accepted');
    expect(repairStatusLabel('deduped')).toBe('Already queued');
    expect(repairStatusLabel('completed_resolved')).toBe('Issue cleared');
    expect(repairStatusLabel('completed_unresolved')).toBe('Still flagged');
  });

  it('does not use success tone for queued audit results', () => {
    expect(repairResultStatusLabel('queued')).toBe('Accepted');
    expect(repairResultStatusTone('queued')).toBe('neutral');
    expect(repairResultStatusTone('deduped')).toBe('neutral');
    expect(repairResultStatusTone('completed_resolved')).toBe('good');
    expect(repairResultStatusTone('failed')).toBe('warn');
  });
});
