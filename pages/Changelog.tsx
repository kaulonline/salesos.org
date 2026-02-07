import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

const CHANGES = [
    { version: 'v2.1.0', date: 'March 15, 2024', title: 'Advanced Reporting & Dark Mode', desc: 'Introduced custom report builder and system-wide dark mode preference.' },
    { version: 'v2.0.4', date: 'February 28, 2024', title: 'LinkedIn Voice Messages', desc: 'You can now send voice notes directly through the SalesOS LinkedIn integration.' },
    { version: 'v2.0.0', date: 'January 10, 2024', title: 'SalesOS 2.0 Major Release', desc: 'Complete UI overhaul, 3x faster performance, and new AI forecasting engine.' },
    { version: 'v1.5.2', date: 'December 12, 2023', title: 'HubSpot Bi-directional Sync', desc: 'Real-time synchronization for contacts, companies, and deals.' },
];

export const Changelog: React.FC = () => {
  return (
    <>
      <SEOHead {...SEO_CONFIGS.changelog} />
      <PageLayout
        title="Changelog"
        subtitle="New updates and improvements to SalesOS."
        narrow
      >
      <div className="relative border-l-2 border-black/5 ml-4 md:ml-0 space-y-12 pl-8 md:pl-12">
        {CHANGES.map((change, i) => (
            <div key={i} className="relative">
                <div className="absolute -left-[41px] md:-left-[59px] top-1 w-6 h-6 rounded-full bg-[#EAD07D] border-4 border-[#F2F1EA] shadow-sm z-10"></div>
                <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-2">
                    <span className="font-mono text-sm font-bold text-[#EAD07D] bg-[#1A1A1A] px-2 py-1 rounded">{change.version}</span>
                    <span className="text-sm text-[#888] font-medium">{change.date}</span>
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{change.title}</h3>
                <p className="text-[#666] leading-relaxed bg-white p-6 rounded-2xl shadow-soft border border-black/5">
                    {change.desc}
                </p>
            </div>
        ))}
      </div>
    </PageLayout>
    </>
  );
};