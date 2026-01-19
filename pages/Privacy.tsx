import React from 'react';
import { PageLayout } from '../components/PageLayout';

export const Privacy: React.FC = () => {
  return (
    <PageLayout title="Privacy Policy" subtitle="Last updated: March 2024" narrow>
      <div className="prose prose-lg text-[#666] mx-auto">
        <p>At SalesOS, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our service.</p>
        
        <h3 className="text-[#1A1A1A] font-bold mt-8 mb-4">1. Information We Collect</h3>
        <p>We collect information that you provide directly to us, such as when you create an account, subscribe to our newsletter, request customer support, or communicate with us.</p>
        
        <h3 className="text-[#1A1A1A] font-bold mt-8 mb-4">2. How We Use Your Information</h3>
        <p>We use the information we collect to provide, maintain, and improve our services, to develop new services, and to protect SalesOS and our users.</p>
        
        <h3 className="text-[#1A1A1A] font-bold mt-8 mb-4">3. Data Security</h3>
        <p>We implement appropriate technical and organizational measures to protect the security of your personal information.</p>
      </div>
    </PageLayout>
  );
};