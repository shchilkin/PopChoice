import { NextResponse, type NextRequest } from 'next/server';

export const RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES = 16 * 1024;
export const POSTER_REQUEST_BODY_LIMIT_BYTES = 32 * 1024;

export type ValidationIssue = {
  message: string;
  path: PropertyKey[];
};

class RequestBodyTooLargeError extends Error {
  constructor(readonly limitBytes: number) {
    super(`Request body exceeds ${limitBytes} bytes`);
    this.name = 'RequestBodyTooLargeError';
  }
}

class InvalidRequestBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRequestBodyError';
  }
}

function parseContentLength(headerValue: string | null): number | null {
  if (headerValue === null) return null;
  if (!/^\d+$/.test(headerValue.trim())) {
    throw new InvalidRequestBodyError('Invalid Content-Length header');
  }
  return Number.parseInt(headerValue, 10);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export async function readJsonBodyWithLimit(
  req: NextRequest,
  limitBytes: number,
): Promise<unknown> {
  const contentLength = parseContentLength(req.headers.get('content-length'));
  if (contentLength !== null && contentLength > limitBytes) {
    throw new RequestBodyTooLargeError(limitBytes);
  }

  const rawBody = await req.text();
  if (byteLength(rawBody) > limitBytes) {
    throw new RequestBodyTooLargeError(limitBytes);
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new InvalidRequestBodyError('Invalid JSON body');
  }
}

export function requestBodyErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof RequestBodyTooLargeError) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }
  if (error instanceof InvalidRequestBodyError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return null;
}

export function requestValidationErrorResponse(issues: ValidationIssue[]): NextResponse {
  return NextResponse.json(
    {
      details: issues
        .map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`)
        .join(', '),
      error: 'Invalid request data',
    },
    { status: 400 },
  );
}
