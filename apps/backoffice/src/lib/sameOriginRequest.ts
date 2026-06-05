import type { NextRequest } from 'next/server';

import { expectedSameOrigins, hasMatchingOriginEvidence } from './sameOriginRequestOrigins';

export function isSameOriginRequest(request: NextRequest): boolean {
  return hasMatchingOriginEvidence(request.headers, expectedSameOrigins(request));
}
