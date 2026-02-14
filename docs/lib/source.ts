import { loader } from 'fumadocs-core/source';
import { docs, apiReference, userGuide } from '@/.source';
import { attachFile } from 'fumadocs-openapi/server';

export const docsSource = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

export const apiReferenceSource = loader({
  baseUrl: '/api-reference',
  source: apiReference.toFumadocsSource(),
  pageTree: {
    attachFile,
  },
});

export const userGuideSource = loader({
  baseUrl: '/user-guide',
  source: userGuide.toFumadocsSource(),
});
