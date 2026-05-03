import { Suspense } from 'react';

import Loading from './loading';
import { ResultsIdClient } from './ResultsIdClient';

/**
 * Server component wrapper.
 *
 * With `cacheComponents` enabled, route params are request-scoped data.
 * Passing the params promise through a Suspense boundary keeps this segment
 * streamable and avoids the blocking-route warning on /results/[id].
 */
export default function ResultsIdPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <ResultsIdClient params={params} />
    </Suspense>
  );
}
