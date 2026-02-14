import { createSearchAPI } from 'fumadocs-core/search/server';
import { docsSource, apiReferenceSource, userGuideSource } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';

function mapPages(source: typeof docsSource) {
  return source.getPages().map((page: InferPageType<typeof source>) => ({
    id: page.url,
    title: page.data.title,
    description: page.data.description,
    url: page.url,
    structuredData: page.data.structuredData,
  }));
}

export const { GET } = createSearchAPI('advanced', {
  indexes: [
    ...mapPages(docsSource),
    ...mapPages(apiReferenceSource),
    ...mapPages(userGuideSource),
  ],
});
