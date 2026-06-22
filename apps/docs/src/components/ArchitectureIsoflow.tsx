'use client';

import { useEffect, useRef, useState } from 'react';

import { popChoiceArchitectureDiagram } from '@/diagrams/popchoice-architecture';

function IsoflowMount() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;
    let iconStyleTimer: number | undefined;

    const applyIconPreviewStyles = () => {
      containerRef.current?.querySelectorAll('img').forEach((image) => {
        image.setAttribute('height', '96');
        image.setAttribute('width', '96');
        image.style.height = '96px';
        image.style.width = '96px';

        let parent = image.parentElement;
        for (let depth = 0; parent && depth < 3; depth += 1) {
          parent.style.height = '96px';
          parent.style.width = '96px';
          parent = parent.parentElement;
        }
      });
    };

    async function mountIsoflow() {
      try {
        const [{ default: React18 }, { createRoot }, { default: Isoflow }] = await Promise.all([
          import('react18'),
          import('react-dom18/client'),
          import('isoflow'),
        ]);

        if (!mounted || !containerRef.current) {
          return;
        }

        const root = createRoot(containerRef.current);
        root.render(
          React18.createElement(Isoflow, {
            editorMode: 'EXPLORABLE_READONLY',
            enableDebugTools: false,
            height: '100%',
            initialData: popChoiceArchitectureDiagram,
            mainMenuOptions: [],
            width: '100%',
          }),
        );
        cleanup = () => root.unmount();
        setStatus('ready');
        iconStyleTimer = window.setInterval(applyIconPreviewStyles, 100);
        window.setTimeout(() => {
          if (iconStyleTimer) {
            window.clearInterval(iconStyleTimer);
            iconStyleTimer = undefined;
          }
        }, 2000);
      } catch (error) {
        console.error('Isoflow architecture diagram failed to mount.', error);
        if (mounted) {
          setStatus('failed');
        }
      }
    }

    void mountIsoflow();

    return () => {
      mounted = false;
      if (iconStyleTimer) {
        window.clearInterval(iconStyleTimer);
      }
      cleanup?.();
    };
  }, []);

  return (
    <div
      className="architecture-isoflow-surface relative h-full w-full bg-white"
      data-testid="architecture-isoflow"
    >
      <div className="h-full w-full" ref={containerRef} />
      {status === 'loading' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-fd-muted/30 text-sm text-fd-muted-foreground">
          Loading Isoflow...
        </div>
      ) : null}
      {status === 'failed' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-fd-muted/30 px-6 text-center text-sm text-fd-muted-foreground">
          Isoflow failed to mount in this browser runtime.
        </div>
      ) : null}
    </div>
  );
}

export function ArchitectureIsoflow() {
  return (
    <figure className="my-6 overflow-hidden rounded-lg border bg-fd-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium text-fd-foreground">PopChoice architecture</p>
          <p className="text-xs text-fd-muted-foreground">
            Experimental Isoflow Community Edition graph for the docs architecture page.
          </p>
        </div>
      </div>
      <div className="h-[620px] min-h-[520px] w-full overflow-hidden bg-white">
        <IsoflowMount />
      </div>
      <figcaption className="border-t px-4 py-3 text-xs text-fd-muted-foreground">
        Experimental architecture graph rendered with Isoflow Community Edition. The source model
        lives in git; use this as a visual map, with the surrounding docs as the canonical
        operational detail.
      </figcaption>
    </figure>
  );
}
