import React from 'react';
import { Hero } from '../components/Hero';
import { SocialProof } from '../components/SocialProof';
import { Features } from '../components/Features';
import { WhySalesOS } from '../components/WhySalesOS';
import { CTA } from '../components/CTA';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';
import { ComponentErrorBoundary } from '../src/components/ErrorBoundary';

export const Home: React.FC = () => {
  return (
    <>
      <SEOHead {...SEO_CONFIGS.home} />
      <ComponentErrorBoundary name="Hero">
        <Hero />
      </ComponentErrorBoundary>
      <ComponentErrorBoundary name="SocialProof">
        <SocialProof />
      </ComponentErrorBoundary>
      <ComponentErrorBoundary name="Features">
        <Features />
      </ComponentErrorBoundary>
      <ComponentErrorBoundary name="WhySalesOS">
        <WhySalesOS />
      </ComponentErrorBoundary>
      <ComponentErrorBoundary name="CTA">
        <CTA />
      </ComponentErrorBoundary>
    </>
  );
};