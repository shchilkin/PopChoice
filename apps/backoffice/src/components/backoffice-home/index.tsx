import { BackofficeLayout } from '../backoffice-layout';

type BackofficeHomeSection = {
  description: string;
  href: string;
  title: string;
};

type BackofficeHomeGroup = {
  sections: BackofficeHomeSection[];
  title: string;
};

const GROUPS: BackofficeHomeGroup[] = [
  {
    title: 'Catalog operations',
    sections: [
      {
        description: 'Data quality and repair work',
        href: '/catalog-health',
        title: 'Catalog health',
      },
      {
        description: 'Match decisions',
        href: '/tmdb-reviews',
        title: 'TMDB reviews',
      },
      {
        description: 'Worker activity',
        href: '/queue',
        title: 'Queue',
      },
      {
        description: 'Seed movies and queue catalog repair',
        href: '/catalog-seed',
        title: 'Catalog seed',
      },
      {
        description: 'Batch history',
        href: '/repair-batches',
        title: 'Repair batches',
      },
    ],
  },
  {
    title: 'Quality',
    sections: [
      {
        description: 'Eval runs',
        href: '/recommendation-evals',
        title: 'Recommendation evals',
      },
      {
        description: 'Provider spend and token totals',
        href: '/openai-usage',
        title: 'OpenAI usage',
      },
    ],
  },
];

export function BackofficeHomePage() {
  return (
    <BackofficeLayout
      active="home"
      title="Backoffice workspaces"
      description="Open an operational area."
      headerClassName="home-page-header"
    >
      <div className="home-overview" aria-label="Backoffice workspaces">
        {GROUPS.map((group) => (
          <section className="home-overview-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="home-overview-grid">
              {group.sections.map((section) => (
                <a
                  aria-label={section.title}
                  className="home-overview-tile"
                  href={section.href}
                  key={section.href}
                >
                  <strong>{section.title}</strong>
                  <span>{section.description}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </BackofficeLayout>
  );
}
