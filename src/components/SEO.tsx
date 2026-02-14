import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  structuredData?: Record<string, any>;
  canonical?: string;
  noindex?: boolean;
}

/**
 * SEO Component for dynamic meta tag management
 * Usage: <SEO title="Page Title" description="..." />
 */
export function SEO({
  title = 'SalesOS - AI-Powered Sales CRM & Revenue Intelligence Platform',
  description = 'SalesOS is the modern CRM built for high-growth sales teams. AI-powered pipeline intelligence, automated outreach, real-time forecasting, and 50+ integrations. Close deals 47% faster.',
  keywords = 'sales CRM, AI CRM, revenue intelligence, sales automation, pipeline management, sales forecasting, lead management, deal tracking, sales engagement platform, B2B sales software',
  image = 'https://salesos.org/og-image.png',
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  structuredData,
  canonical,
  noindex = false,
}: SEOProps) {
  const location = useLocation();
  const fullUrl = `https://salesos.org${location.pathname}`;
  const canonicalUrl = canonical || fullUrl;

  useEffect(() => {
    // Update title
    document.title = title;

    // Update meta tags
    updateMetaTag('name', 'description', description);
    updateMetaTag('name', 'keywords', keywords);
    updateMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // Open Graph
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:url', fullUrl);
    updateMetaTag('property', 'og:type', type);

    // Twitter Card
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', image);
    updateMetaTag('name', 'twitter:url', fullUrl);

    // Article specific meta tags
    if (type === 'article') {
      if (author) updateMetaTag('name', 'author', author);
      if (publishedTime) updateMetaTag('property', 'article:published_time', publishedTime);
      if (modifiedTime) updateMetaTag('property', 'article:modified_time', modifiedTime);
    }

    // Update canonical link
    updateCanonicalLink(canonicalUrl);

    // Add structured data if provided
    if (structuredData) {
      addStructuredData(structuredData);
    }
  }, [title, description, keywords, image, type, author, publishedTime, modifiedTime, structuredData, canonicalUrl, fullUrl, noindex]);

  return null;
}

/**
 * Helper function to update or create meta tags
 */
function updateMetaTag(attr: string, key: string, content: string) {
  if (!content) return;

  let element = document.querySelector(`meta[${attr}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * Helper function to update canonical link
 */
function updateCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }

  link.href = url;
}

/**
 * Helper function to add structured data (JSON-LD)
 */
function addStructuredData(data: Record<string, any>) {
  // Remove existing dynamic structured data
  const existingScripts = document.querySelectorAll('script[data-dynamic-ld]');
  existingScripts.forEach((script) => script.remove());

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-dynamic-ld', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Pre-configured SEO for common page types
 */
export const SEOPresets = {
  // Product pages
  product: (name: string, description: string, price?: number) => ({
    title: `${name} - SalesOS`,
    description,
    type: 'product' as const,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      brand: {
        '@type': 'Brand',
        name: 'SalesOS',
      },
      offers: price
        ? {
            '@type': 'Offer',
            price,
            priceCurrency: 'USD',
          }
        : undefined,
    },
  }),

  // Blog articles
  article: (title: string, description: string, author: string, publishedDate: string, modifiedDate?: string) => ({
    title: `${title} - SalesOS Blog`,
    description,
    type: 'article' as const,
    author,
    publishedTime: publishedDate,
    modifiedTime: modifiedDate || publishedDate,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      author: {
        '@type': 'Person',
        name: author,
      },
      datePublished: publishedDate,
      dateModified: modifiedDate || publishedDate,
      publisher: {
        '@type': 'Organization',
        name: 'SalesOS',
        logo: {
          '@type': 'ImageObject',
          url: 'https://salesos.org/favicon.png',
        },
      },
    },
  }),

  // Documentation pages
  docs: (title: string, description: string) => ({
    title: `${title} - SalesOS Documentation`,
    description,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: title,
      description,
      author: {
        '@type': 'Organization',
        name: 'SalesOS',
      },
    },
  }),

  // Feature pages
  feature: (featureName: string, description: string) => ({
    title: `${featureName} - SalesOS Features`,
    description,
  }),

  // Landing pages
  landing: (title: string, description: string) => ({
    title,
    description,
  }),
};

export default SEO;
