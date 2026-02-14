#!/usr/bin/env tsx
/**
 * Generate comprehensive sitemap.xml for SalesOS
 * Includes all public pages, docs, and API reference pages
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://salesos.org';
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap.xml');
const DOCS_DIR = path.join(__dirname, '../docs/content');

interface SitemapURL {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Static pages configuration
const STATIC_PAGES: SitemapURL[] = [
  // Homepage - Highest Priority
  { loc: '/', lastmod: getCurrentDate(), changefreq: 'daily', priority: 1.0 },

  // Core Product Pages - High Priority
  { loc: '/product', lastmod: getCurrentDate(), changefreq: 'weekly', priority: 0.9 },
  { loc: '/features', lastmod: getCurrentDate(), changefreq: 'weekly', priority: 0.9 },
  { loc: '/pricing', lastmod: getCurrentDate(), changefreq: 'weekly', priority: 0.9 },
  { loc: '/integrations', lastmod: getCurrentDate(), changefreq: 'weekly', priority: 0.9 },
  { loc: '/enterprise', lastmod: getCurrentDate(), changefreq: 'monthly', priority: 0.8 },

  // Company Pages - Medium Priority
  { loc: '/about', lastmod: getCurrentDate(), changefreq: 'monthly', priority: 0.7 },
  { loc: '/blog', lastmod: getCurrentDate(), changefreq: 'daily', priority: 0.8 },
  { loc: '/careers', lastmod: getCurrentDate(), changefreq: 'weekly', priority: 0.6 },
  { loc: '/contact', lastmod: getCurrentDate(), changefreq: 'monthly', priority: 0.7 },
  { loc: '/changelog', lastmod: getCurrentDate(), changefreq: 'weekly', priority: 0.6 },

  // Auth Pages (public but lower priority)
  { loc: '/login', lastmod: getCurrentDate(), changefreq: 'yearly', priority: 0.3 },
  { loc: '/signup', lastmod: getCurrentDate(), changefreq: 'yearly', priority: 0.5 },
  { loc: '/request-access', lastmod: getCurrentDate(), changefreq: 'monthly', priority: 0.4 },

  // Legal Pages - Lower Priority
  { loc: '/privacy', lastmod: getCurrentDate(), changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms', lastmod: getCurrentDate(), changefreq: 'yearly', priority: 0.3 },
];

/**
 * Get all documentation pages from the docs directory
 */
async function getDocPages(): Promise<SitemapURL[]> {
  const docPages: SitemapURL[] = [];

  try {
    if (!fs.existsSync(DOCS_DIR)) {
      console.warn(`Docs directory not found: ${DOCS_DIR}`);
      return docPages;
    }

    // Find all .mdx files in the docs content directory
    const mdxFiles = await glob('**/*.mdx', { cwd: DOCS_DIR });

    for (const file of mdxFiles) {
      // Convert file path to URL path
      // e.g., "docs/authentication.mdx" -> "/docs/authentication"
      // e.g., "api-reference/quotes.mdx" -> "/docs/api-reference/quotes"
      let urlPath = file
        .replace(/\.mdx$/, '')
        .replace(/\/index$/, '')
        .replace(/^/, '/docs/');

      // Clean up URL
      urlPath = urlPath
        .replace(/--/g, '-') // Convert double dashes to single
        .replace(/\s+/g, '-') // Convert spaces to dashes
        .toLowerCase();

      docPages.push({
        loc: urlPath,
        lastmod: getCurrentDate(),
        changefreq: 'weekly',
        priority: 0.8, // High priority for docs
      });
    }

    console.log(`✓ Found ${docPages.length} documentation pages`);
  } catch (error) {
    console.error('Error scanning docs:', error);
  }

  return docPages;
}

/**
 * Generate XML sitemap
 */
function generateSitemap(urls: SitemapURL[]): string {
  const urlElements = urls
    .map(
      (url) => `
  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlElements}
</urlset>`;
}

/**
 * Main function
 */
async function main() {
  console.log('🗺️  Generating comprehensive sitemap...\n');

  // Gather all URLs
  const docPages = await getDocPages();
  const allUrls = [...STATIC_PAGES, ...docPages];

  // Sort by priority (highest first)
  allUrls.sort((a, b) => b.priority - a.priority);

  // Generate sitemap XML
  const sitemap = generateSitemap(allUrls);

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf-8');

  console.log(`\n✅ Sitemap generated successfully!`);
  console.log(`   Total URLs: ${allUrls.length}`);
  console.log(`   Static pages: ${STATIC_PAGES.length}`);
  console.log(`   Doc pages: ${docPages.length}`);
  console.log(`   Output: ${OUTPUT_FILE}\n`);
}

main().catch((error) => {
  console.error('Error generating sitemap:', error);
  process.exit(1);
});
