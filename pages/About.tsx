import React from 'react';
import { PageLayout } from '../components/PageLayout';

export const About: React.FC = () => {
  return (
    <PageLayout 
      title="About Us" 
      subtitle="We're on a mission to fix the broken sales model. Less admin, more closing."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 items-center">
         <div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-6">Our Story</h3>
            <div className="space-y-4 text-[#666] leading-relaxed">
                <p>
                    SalesOS began in 2021 when our founders, frustrated by the bloat and complexity of legacy CRMs, decided to build something better.
                </p>
                <p>
                    We believe that sales software should work for the rep, not the other way around. It should be fast, intuitive, and actually help you sell, rather than just being a database for your manager.
                </p>
                <p>
                    Today, we serve over 2,000 high-growth revenue teams across the globe, processing millions of dollars in pipeline every single day.
                </p>
            </div>
         </div>
         <div className="bg-white p-2 rounded-[2rem] shadow-card rotate-2 hover:rotate-0 transition-transform duration-500">
             <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200" alt="Team working" className="rounded-[1.5rem] w-full h-auto grayscale hover:grayscale-0 transition-all duration-500" />
         </div>
      </div>

      <div className="mb-20">
        <h3 className="text-2xl font-bold text-[#1A1A1A] mb-10 text-center">Meet the Leadership</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center group">
                    <div className="mb-4 overflow-hidden rounded-2xl">
                        <img src={`https://picsum.photos/300/300?random=${i+10}`} alt="Team Member" className="w-full aspect-square object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105" />
                    </div>
                    <h4 className="font-bold text-[#1A1A1A]">Alex Morgan</h4>
                    <p className="text-sm text-[#888]">Co-Founder</p>
                </div>
            ))}
        </div>
      </div>
    </PageLayout>
  );
};