import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkStructure } from 'fumadocs-core/mdx-plugins';

export const docs = defineDocs({
  dir: 'content/docs',
});

export const apiReference = defineDocs({
  dir: 'content/api-reference',
});

export const userGuide = defineDocs({
  dir: 'content/user-guide',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkStructure],
  },
});
