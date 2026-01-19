import React from 'react';
import { Hero } from '../components/Hero';
import { SocialProof } from '../components/SocialProof';
import { Features } from '../components/Features';
import { WhySalesOS } from '../components/WhySalesOS';
import { Pricing } from '../components/Pricing';
import { CTA } from '../components/CTA';

export const Home: React.FC = () => {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <WhySalesOS />
      <Pricing />
      <CTA />
    </>
  );
};