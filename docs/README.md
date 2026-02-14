# SalesOS Documentation

This directory contains the documentation site for SalesOS, built with Next.js and Fumadocs.

## Structure

```
docs/
├── app/              # Next.js app directory
├── content/          # MDX documentation files
│   ├── docs/        # General documentation
│   └── api-reference/ # API reference docs
├── components/       # React components
├── lib/             # Utility functions
└── public/          # Static assets
```

## Development

```bash
cd docs
npm install
npm run dev
```

Visit http://localhost:3000 to view the documentation site.

## Building for Production

```bash
npm run build
npm start
```

## Adding New Documentation

1. Create a new `.mdx` file in the appropriate directory:
   - General docs: `content/docs/your-page.mdx`
   - API reference: `content/api-reference/your-endpoint.mdx`

2. Add frontmatter:
```mdx
---
title: Your Page Title
description: A brief description of the page
---

# Your Page Title

Your content here...
```

3. The page will automatically be added to the sitemap during the next build.

## SEO Considerations

All documentation pages are:
- ✅ Indexed by search engines
- ✅ Included in the sitemap
- ✅ Optimized with meta tags
- ✅ Using semantic HTML
- ✅ Mobile-responsive

## Contributing

Please ensure all new documentation:
1. Follows the existing structure
2. Includes clear, concise content
3. Uses proper markdown formatting
4. Includes code examples where applicable
5. Has been tested locally before committing
