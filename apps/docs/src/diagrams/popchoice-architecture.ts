import isoflowIsopack from '@isoflow/isopacks/dist/isoflow';

type ArchitectureDiagram = {
  title: string;
  description: string;
  version: string;
  colors: Array<{ id: string; value: string }>;
  fitToView?: boolean;
  icons: Array<{ id: string; name: string; url: string; isIsometric?: boolean }>;
  items: Array<{ id: string; name: string; description: string; icon: string }>;
  views: Array<{
    id: string;
    name: string;
    description: string;
    items: Array<{ id: string; tile: { x: number; y: number } }>;
    rectangles?: Array<{
      id: string;
      color: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }>;
    textBoxes?: Array<{
      id: string;
      tile: { x: number; y: number };
      content: string;
      fontSize?: number;
    }>;
    connectors?: Array<{
      id: string;
      color: string;
      width?: number;
      style?: 'SOLID' | 'DOTTED' | 'DASHED';
      anchors: Array<{ id: string; ref: { item: string } }>;
    }>;
  }>;
};

const architectureIconIds = [
  'user',
  'server',
  'office',
  'queue',
  'storage',
  'document',
  'package-module',
  'cloud',
  'mail',
  'image',
] as const;

const architectureIcons = isoflowIsopack.icons.filter((icon) =>
  architectureIconIds.includes(icon.id as (typeof architectureIconIds)[number]),
);

export const popChoiceArchitectureDiagram = {
  title: 'PopChoice Architecture',
  description: 'Experimental architecture map for the PopChoice docs.',
  version: '0.1',
  colors: [
    { id: 'web', value: '#38bdf8' },
    { id: 'ops', value: '#facc15' },
    { id: 'data', value: '#34d399' },
    { id: 'queue', value: '#fb7185' },
    { id: 'ext', value: '#a78bfa' },
    { id: 'ci', value: '#94a3b8' },
    { id: 'line', value: '#334155' },
    { id: 'muted', value: '#e2e8f0' },
  ],
  fitToView: true,
  icons: architectureIcons,
  items: [
    {
      id: 'users',
      name: 'Users',
      description: 'Public recommendation and account flows.',
      icon: 'user',
    },
    {
      id: 'web',
      name: 'apps/web',
      description: 'User-facing Next.js app, API routes, and recommendation UI.',
      icon: 'server',
    },
    {
      id: 'backoffice',
      name: 'apps/backoffice',
      description: 'Operator catalog health, repair, seed, queue, and eval UI.',
      icon: 'office',
    },
    {
      id: 'docs',
      name: 'apps/docs',
      description: 'Fumadocs site rendering the git-backed docs folder.',
      icon: 'document',
    },
    {
      id: 'bullBoard',
      name: 'apps/bull-board',
      description: 'BullMQ queue monitoring surface.',
      icon: 'office',
    },
    {
      id: 'workers',
      name: 'apps/web workers',
      description: 'BullMQ workers for recommendations, catalog repair, seed, and evals.',
      icon: 'server',
    },
    {
      id: 'redis',
      name: 'Redis + BullMQ',
      description: 'Queue transport, worker coordination, and rate-limiting support.',
      icon: 'queue',
    },
    {
      id: 'postgres',
      name: 'PostgreSQL + pgvector',
      description: 'Catalog, embeddings, sessions, feedback, memory, and audit rows.',
      icon: 'storage',
    },
    {
      id: 'shared',
      name: 'packages/shared',
      description: 'Shared database, embedding, logging, and utility helpers.',
      icon: 'package-module',
    },
    {
      id: 'ui',
      name: 'packages/ui',
      description: 'Domain-free UI primitives reused by app workspaces.',
      icon: 'package-module',
    },
    {
      id: 'tmdb',
      name: 'TMDB',
      description: 'Movie metadata, poster, discovery, and identity data source.',
      icon: 'cloud',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'Embeddings, moderation, and recommendation text generation.',
      icon: 'cloud',
    },
    {
      id: 'resend',
      name: 'Resend',
      description: 'Transactional email delivery for password reset.',
      icon: 'mail',
    },
    {
      id: 'ghcr',
      name: 'GHCR images',
      description: 'Prebuilt images published by GitHub Actions.',
      icon: 'image',
    },
    {
      id: 'coolify',
      name: 'Coolify',
      description: 'Development and production VPS deployment runtime.',
      icon: 'server',
    },
  ],
  views: [
    {
      id: 'runtime',
      name: 'Runtime architecture',
      description: 'Primary runtime boundaries and data movement.',
      items: [
        { id: 'users', tile: { x: 0, y: 2 } },
        { id: 'web', tile: { x: 2, y: 2 } },
        { id: 'backoffice', tile: { x: 2, y: 0 } },
        { id: 'docs', tile: { x: 2, y: 4 } },
        { id: 'bullBoard', tile: { x: 4, y: 0 } },
        { id: 'workers', tile: { x: 5, y: 2 } },
        { id: 'redis', tile: { x: 4, y: 2 } },
        { id: 'postgres', tile: { x: 4, y: 4 } },
        { id: 'shared', tile: { x: 6, y: 4 } },
        { id: 'ui', tile: { x: 0, y: 4 } },
        { id: 'tmdb', tile: { x: 8, y: 0 } },
        { id: 'openai', tile: { x: 8, y: 2 } },
        { id: 'resend', tile: { x: 8, y: 4 } },
        { id: 'ghcr', tile: { x: 5, y: -2 } },
        { id: 'coolify', tile: { x: 7, y: -2 } },
      ],
      rectangles: [
        { id: 'apps-zone', color: 'web', from: { x: 1, y: -1 }, to: { x: 4, y: 5 } },
        { id: 'infra-zone', color: 'data', from: { x: 3, y: 1 }, to: { x: 7, y: 5 } },
        { id: 'external-zone', color: 'ext', from: { x: 7, y: -1 }, to: { x: 9, y: 5 } },
        { id: 'deploy-zone', color: 'ci', from: { x: 4, y: -3 }, to: { x: 8, y: -1 } },
      ],
      textBoxes: [
        { id: 'apps-label', tile: { x: 1, y: -1 }, content: 'Application surfaces', fontSize: 0.5 },
        { id: 'infra-label', tile: { x: 3, y: 1 }, content: 'Runtime data plane', fontSize: 0.5 },
        {
          id: 'external-label',
          tile: { x: 7, y: -1 },
          content: 'External providers',
          fontSize: 0.5,
        },
        { id: 'deploy-label', tile: { x: 4, y: -3 }, content: 'Image promotion', fontSize: 0.5 },
      ],
      connectors: [
        {
          id: 'users-web',
          color: 'web',
          width: 4,
          anchors: [
            { id: 'a', ref: { item: 'users' } },
            { id: 'b', ref: { item: 'web' } },
          ],
        },
        {
          id: 'ops-queue',
          color: 'ops',
          width: 4,
          anchors: [
            { id: 'a', ref: { item: 'backoffice' } },
            { id: 'b', ref: { item: 'redis' } },
          ],
        },
        {
          id: 'web-queue',
          color: 'queue',
          width: 4,
          anchors: [
            { id: 'a', ref: { item: 'web' } },
            { id: 'b', ref: { item: 'redis' } },
          ],
        },
        {
          id: 'queue-workers',
          color: 'queue',
          width: 4,
          anchors: [
            { id: 'a', ref: { item: 'redis' } },
            { id: 'b', ref: { item: 'workers' } },
          ],
        },
        {
          id: 'bullboard-queue',
          color: 'ops',
          style: 'DASHED',
          width: 3,
          anchors: [
            { id: 'a', ref: { item: 'bullBoard' } },
            { id: 'b', ref: { item: 'redis' } },
          ],
        },
        {
          id: 'apps-db',
          color: 'data',
          width: 4,
          anchors: [
            { id: 'a', ref: { item: 'web' } },
            { id: 'b', ref: { item: 'postgres' } },
          ],
        },
        {
          id: 'workers-db',
          color: 'data',
          width: 4,
          anchors: [
            { id: 'a', ref: { item: 'workers' } },
            { id: 'b', ref: { item: 'postgres' } },
          ],
        },
        {
          id: 'shared-db',
          color: 'data',
          style: 'DOTTED',
          width: 3,
          anchors: [
            { id: 'a', ref: { item: 'shared' } },
            { id: 'b', ref: { item: 'postgres' } },
          ],
        },
        {
          id: 'ui-apps',
          color: 'web',
          style: 'DOTTED',
          width: 3,
          anchors: [
            { id: 'a', ref: { item: 'ui' } },
            { id: 'b', ref: { item: 'web' } },
          ],
        },
        {
          id: 'tmdb-workers',
          color: 'ext',
          width: 3,
          anchors: [
            { id: 'a', ref: { item: 'workers' } },
            { id: 'b', ref: { item: 'tmdb' } },
          ],
        },
        {
          id: 'openai-workers',
          color: 'ext',
          width: 3,
          anchors: [
            { id: 'a', ref: { item: 'workers' } },
            { id: 'b', ref: { item: 'openai' } },
          ],
        },
        {
          id: 'resend-web',
          color: 'ext',
          style: 'DASHED',
          width: 3,
          anchors: [
            { id: 'a', ref: { item: 'web' } },
            { id: 'b', ref: { item: 'resend' } },
          ],
        },
        {
          id: 'ghcr-coolify',
          color: 'ci',
          width: 4,
          anchors: [
            { id: 'a', ref: { item: 'ghcr' } },
            { id: 'b', ref: { item: 'coolify' } },
          ],
        },
        {
          id: 'coolify-apps',
          color: 'ci',
          style: 'DASHED',
          width: 3,
          anchors: [
            { id: 'a', ref: { item: 'coolify' } },
            { id: 'b', ref: { item: 'web' } },
          ],
        },
      ],
    },
  ],
} satisfies ArchitectureDiagram;
