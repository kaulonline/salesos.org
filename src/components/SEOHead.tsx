import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  structuredData?: object;
}

const BASE_URL = 'https://salesos.org';
const DEFAULT_TITLE = 'SalesOS - AI-Powered Sales CRM & Revenue Intelligence Platform';
const DEFAULT_DESCRIPTION = 'The modern CRM built for high-growth sales teams. AI-powered pipeline intelligence, automated outreach, and real-time forecasting. Close deals 47% faster.';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  canonicalUrl,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noIndex = false,
  structuredData,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | SalesOS` : DEFAULT_TITLE;
  const fullCanonicalUrl = canonicalUrl ? `${BASE_URL}${canonicalUrl}` : BASE_URL;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const updateMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Helper to update or create link tag
    const updateLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    // Update meta tags
    updateMeta('description', description);
    updateMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

    if (keywords) {
      updateMeta('keywords', keywords);
    }

    // Open Graph
    updateMeta('og:title', fullTitle, true);
    updateMeta('og:description', description, true);
    updateMeta('og:url', fullCanonicalUrl, true);
    updateMeta('og:type', ogType, true);
    updateMeta('og:image', ogImage, true);

    // Twitter Card
    updateMeta('twitter:card', twitterCard);
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', ogImage);

    // Canonical URL
    updateLink('canonical', fullCanonicalUrl);

    // Add structured data if provided
    if (structuredData) {
      const existingScript = document.querySelector('script[data-seo-structured]');
      if (existingScript) {
        existingScript.remove();
      }
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-structured', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Dispatch event to signal SEO meta tags are ready (for pre-rendering)
    window.dispatchEvent(new CustomEvent('seo-ready'));

    // Cleanup function
    return () => {
      // Reset to defaults when component unmounts
      document.title = DEFAULT_TITLE;
    };
  }, [fullTitle, description, keywords, fullCanonicalUrl, ogImage, ogType, twitterCard, noIndex, structuredData]);

  return null; // This component only manages head tags
}

// Pre-defined SEO configurations for each page
export const SEO_CONFIGS = {
  home: {
    title: undefined, // Uses default
    description: 'SalesOS is the modern CRM built for high-growth sales teams. AI-powered pipeline intelligence, automated outreach, real-time forecasting, and 50+ integrations. Close deals 47% faster.',
    keywords: 'sales CRM, AI CRM, revenue intelligence, sales automation, pipeline management, sales forecasting, lead management, B2B sales software',
    canonicalUrl: '/',
  },
  product: {
    title: 'Product',
    description: 'Discover SalesOS product features: AI pipeline intelligence, automated outreach, and real-time analytics. Built for speed, designed for revenue.',
    keywords: 'sales product, CRM features, AI sales tools, pipeline analytics, sales dashboard, deal tracking software',
    canonicalUrl: '/product',
  },
  features: {
    title: 'Features',
    description: 'Explore SalesOS features: AI-powered forecasting, multi-channel sequences, real-time collaboration, advanced analytics, and seamless integrations.',
    keywords: 'CRM features, sales automation features, AI forecasting, sales sequences, team collaboration, sales analytics',
    canonicalUrl: '/features',
  },
  pricing: {
    title: 'Pricing - Pay When You Win',
    description: 'Outcome-based pricing for SalesOS. No upfront subscriptions - only pay when you close deals. Revenue share, tiered, or flat-fee options available.',
    keywords: 'outcome based pricing, pay per deal CRM, revenue share pricing, sales software pricing, no subscription CRM, pay when you win',
    canonicalUrl: '/pricing',
  },
  integrations: {
    title: 'Integrations',
    description: 'SalesOS integrates with 50+ tools including Salesforce, HubSpot, Slack, Gmail, LinkedIn, Zoom, and Zapier. Two-way sync, no code required.',
    keywords: 'CRM integrations, Salesforce integration, HubSpot integration, Slack integration, sales tool integrations, API integrations',
    canonicalUrl: '/integrations',
  },
  enterprise: {
    title: 'Enterprise',
    description: 'Enterprise-grade sales platform with advanced security, dedicated support, custom integrations, and unlimited scalability for large organizations.',
    keywords: 'enterprise CRM, enterprise sales software, large team CRM, corporate sales platform, enterprise integrations',
    canonicalUrl: '/enterprise',
  },
  about: {
    title: 'About Us',
    description: 'Learn about SalesOS - founded in 2021 in San Francisco. We are on a mission to fix the broken sales model. Less admin, more closing.',
    keywords: 'about SalesOS, sales software company, CRM company, sales team, revenue platform company',
    canonicalUrl: '/about',
  },
  blog: {
    title: 'Blog',
    description: 'Sales insights, tips, and best practices from the SalesOS team. Learn how top sales teams close more deals and grow revenue.',
    keywords: 'sales blog, CRM tips, sales best practices, revenue growth tips, sales insights',
    canonicalUrl: '/blog',
  },
  careers: {
    title: 'Careers',
    description: 'Join the SalesOS team. We are hiring across engineering, sales, marketing, and customer success. Remote-first, competitive pay.',
    keywords: 'SalesOS careers, sales software jobs, CRM company jobs, tech startup jobs, remote jobs',
    canonicalUrl: '/careers',
  },
  contact: {
    title: 'Contact',
    description: 'Get in touch with the SalesOS team. Contact us for sales inquiries, support, partnerships, or general questions.',
    keywords: 'contact SalesOS, sales software support, CRM help, sales platform contact',
    canonicalUrl: '/contact',
  },
  changelog: {
    title: 'Changelog',
    description: 'Stay up to date with the latest SalesOS updates, new features, improvements, and bug fixes.',
    keywords: 'SalesOS updates, CRM changelog, new features, product updates, release notes',
    canonicalUrl: '/changelog',
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'SalesOS Privacy Policy. Learn how we collect, use, and protect your data.',
    canonicalUrl: '/privacy',
    noIndex: true,
  },
  terms: {
    title: 'Terms of Service',
    description: 'SalesOS Terms of Service. Read our terms and conditions for using the platform.',
    canonicalUrl: '/terms',
    noIndex: true,
  },
};
