import React from 'react';
import { PageLayout } from '../components/PageLayout';

export const Terms: React.FC = () => {
  return (
    <PageLayout title="Terms of Service" subtitle="Last updated: March 2024" narrow>
      <div className="prose prose-lg text-[#666] mx-auto">
        <p>Please read these Terms of Service carefully before using the SalesOS website and service operated by SalesOS Inc.</p>
        
        <h3 className="text-[#1A1A1A] font-bold mt-8 mb-4">1. Acceptance of Terms</h3>
        <p>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</p>
        
        <h3 className="text-[#1A1A1A] font-bold mt-8 mb-4">2. Accounts</h3>
        <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms.</p>
        
        <h3 className="text-[#1A1A1A] font-bold mt-8 mb-4">3. Intellectual Property</h3>
        <p>The Service and its original content, features and functionality are and will remain the exclusive property of SalesOS Inc and its licensors.</p>
      </div>
    </PageLayout>
  );
};