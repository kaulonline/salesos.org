import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { FEATURES } from '../constants';
import { Tooltip } from '../components/ui/Tooltip';
import { ArrowUpRight } from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  return (
    <PageLayout 
      title="Features" 
      subtitle="A complete toolkit for modern revenue teams. Everything you need to find, close, and keep customers."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {FEATURES.map((feature) => (
            <div 
              key={feature.id}
              className="group relative modern-card p-10 hover:z-20 transition-all duration-300 flex flex-col md:col-span-1 min-h-[300px]"
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="mb-8 block">
                    <Tooltip content={feature.description}>
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F7F4] border border-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] group-hover:scale-110 group-hover:bg-[#EAD07D] transition-all duration-300 shadow-sm cursor-help">
                        <feature.icon size={26} strokeWidth={1.5} />
                      </div>
                    </Tooltip>
                  </div>
                  
                  <div className="mb-4 block">
                    <h3 className="text-2xl font-bold text-[#1A1A1A]">{feature.title}</h3>
                  </div>
                  
                  <p className="text-[#666] leading-relaxed text-[15px]">{feature.description}</p>
                </div>
              </div>
            </div>
        ))}
         
         {/* Extra features for the page */}
         {['Meeting Scheduler', 'Call Recording', 'Revenue Forecasting', 'Lead Scoring', 'Email Tracking'].map((item, i) => (
             <div key={i} className="modern-card p-8 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center text-[#1A1A1A] font-bold">
                    {i + 5}
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A]">{item}</h3>
             </div>
         ))}
      </div>
    </PageLayout>
  );
};