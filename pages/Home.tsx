import React from 'react';
import { Hero } from '../components/Hero';
import { SocialProof } from '../components/SocialProof';
import { Features } from '../components/Features';
import { WhySalesOS } from '../components/WhySalesOS';
import { CTA } from '../components/CTA';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

export const Home: React.FC = () => {
  return (
    <>
      <SEOHead {...SEO_CONFIGS.home} />
      <Hero />
      <SocialProof />
      <Features />
      <WhySalesOS />
      <CTA />
    </>
  );
};