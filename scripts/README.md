# SalesOS Build Scripts

This directory contains utility scripts for building and maintaining the SalesOS application.

## Available Scripts

### generate-sitemap.ts

Automatically generates a comprehensive XML sitemap for the entire SalesOS platform.

**Features:**
- Scans and includes all static pages (homepage, product, pricing, etc.)
- Automatically discovers and includes all 65+ documentation pages from `/docs/content`
- Generates proper priority and change frequency for each URL
- Updates lastmod dates automatically

**Usage:**
```bash
# Generate sitemap manually
npm run generate:sitemap

# Automatically runs before build
npm run build
```

**Output:**
- Creates/updates `/public/sitemap.xml`
- Includes proper XML schema
- SEO-optimized with priorities and change frequencies

**Configuration:**
Edit the script to modify:
- `SITE_URL` - Base URL (default: https://salesos.org)
- `STATIC_PAGES` - List of static pages to include
- Priority and change frequency values

**Maintenance:**
- Sitemap is automatically regenerated on each build
- No manual updates needed when adding new docs
- Review quarterly to ensure all important pages are included

## Adding New Scripts

When adding new build scripts:
1. Create a `.ts` file in this directory
2. Add a npm script in `package.json`
3. Document it in this README
4. Ensure it's TypeScript-compatible with tsx

## Dependencies

Scripts require:
- `tsx` - TypeScript execution
- `glob` - File pattern matching
- Node.js 18+ recommended
