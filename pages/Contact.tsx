import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

export const Contact: React.FC = () => {
  return (
    <>
      <SEOHead {...SEO_CONFIGS.contact} />
      <PageLayout
        title="Get in Touch"
        subtitle="Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible."
        narrow
      >
      <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-card border border-black/5">
        <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1A1A1A]">First Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-[#F2F1EA] border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors" placeholder="Jane" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1A1A1A]">Last Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-[#F2F1EA] border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors" placeholder="Doe" />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-bold text-[#1A1A1A]">Work Email</label>
                <input type="email" className="w-full px-4 py-3 rounded-xl bg-[#F2F1EA] border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors" placeholder="jane@company.com" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-[#1A1A1A]">Message</label>
                <textarea rows={4} className="w-full px-4 py-3 rounded-xl bg-[#F2F1EA] border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors" placeholder="How can we help you?"></textarea>
            </div>

            <Button variant="primary" className="w-full">Send Message</Button>
        </form>
      </div>
    </PageLayout>
    </>
  );
};