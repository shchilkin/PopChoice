import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';

import { source } from '@/lib/source';

import type { DocData } from 'fumadocs-mdx/runtime/types';
import type { HTMLAttributes, ReactNode } from 'react';

function getPlainText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getPlainText).join('');
  }

  return '';
}

function normalizeHeadingText(value: ReactNode): string {
  return getPlainText(value).replace(/\s+/g, ' ').trim();
}

function createMdxComponents(pageTitle: string) {
  let skippedMatchingTitle = false;

  return {
    ...defaultMdxComponents,
    h1: (props: HTMLAttributes<HTMLHeadingElement>) => {
      if (
        !skippedMatchingTitle &&
        normalizeHeadingText(props.children) === normalizeHeadingText(pageTitle)
      ) {
        skippedMatchingTitle = true;
        return null;
      }

      const Heading = defaultMdxComponents.h1 ?? 'h1';
      return <Heading {...props} />;
    },
  };
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const pageData = page.data as typeof page.data & DocData & { title: string; full?: boolean };
  const MDX = pageData.body;

  return (
    <DocsPage toc={pageData.toc} full={pageData.full}>
      <DocsTitle>{pageData.title}</DocsTitle>
      <DocsDescription>{pageData.description}</DocsDescription>
      <DocsBody>
        <MDX components={createMdxComponents(pageData.title)} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
