import { logger } from '@pop-choice/shared';

type OptionalString = string | number | null | undefined;

export type BackofficeActionLogInput = {
  action: string;
  actor: string;
  durationMs: number;
  issueKey?: OptionalString;
  mode?: OptionalString;
  repairBatchId?: OptionalString;
  repairBatchItemId?: OptionalString;
  requestId?: OptionalString;
  resultStatus: string;
  reviewId?: OptionalString;
  targetId?: OptionalString;
  targetType: string;
};

const STRING_FIELDS = [
  'action',
  'actor',
  'issueKey',
  'mode',
  'repairBatchId',
  'repairBatchItemId',
  'requestId',
  'resultStatus',
  'reviewId',
  'targetId',
  'targetType',
] as const;

function compactString(value: OptionalString): string | undefined {
  if (value === null || value === undefined) return undefined;
  const compacted = String(value).trim();
  return compacted === '' ? undefined : compacted;
}

export function sanitizeBackofficeActionLog(
  input: BackofficeActionLogInput,
): Record<string, number | string> {
  const payload: Record<string, number | string> = {
    durationMs: Math.max(Math.round(input.durationMs), 0),
  };

  for (const field of STRING_FIELDS) {
    const value = compactString(input[field]);
    if (value !== undefined) payload[field] = value;
  }

  return payload;
}

export function logBackofficeAction(input: BackofficeActionLogInput): void {
  logger.info('Backoffice operator action', sanitizeBackofficeActionLog(input));
}
