import { NextResponse, type NextRequest } from 'next/server';

import { getBackofficeErrorStatus } from './backofficeRuntime';

export type BackofficeActionFailurePayload = {
  ok: false;
  status: 'failed';
  message: string;
};

export function wantsBackofficeJsonResponse(request: Pick<NextRequest, 'headers'>): boolean {
  const accept = request.headers.get('accept') ?? '';
  const requestedWith = request.headers.get('x-requested-with') ?? '';
  return accept.includes('application/json') || requestedWith.toLowerCase() === 'fetch';
}

export function backofficeActionFailureResponse(
  message: string,
  status: number,
): NextResponse<BackofficeActionFailurePayload> {
  return NextResponse.json({ ok: false, status: 'failed', message }, { status });
}

export function getBackofficePublicErrorMessage(error: unknown, fallback: string): string {
  const publicMessage =
    typeof error === 'object' && error !== null && 'publicMessage' in error
      ? (error as { publicMessage?: unknown }).publicMessage
      : undefined;

  return typeof publicMessage === 'string' && publicMessage.trim() !== ''
    ? publicMessage
    : fallback;
}

export function backofficeActionErrorResponse(
  error: unknown,
  fallbackMessage: string,
): NextResponse<BackofficeActionFailurePayload> {
  return backofficeActionFailureResponse(
    getBackofficePublicErrorMessage(error, fallbackMessage),
    getBackofficeErrorStatus(error),
  );
}
