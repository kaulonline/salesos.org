import React from 'react';
import { FEATURES } from '../constants';
import { ArrowUpRight } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

export const Features: React.FC = () => {
  return (
    <section id="solutions" className="py-32 relative bg-[#F2F1EA]">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#1A1A1A]">
            Everything you need to <br />
            <span className="text-[#888]">dominate your market.</span>
          </h2>
          <p className="text-lg text-[#666] max-w-xl">
            Replace your fragmented tech stack with a unified platform designed for speed, intelligence, and scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feature) => (
            <div 
              key={feature.id}
              className={`group relative modern-card p-10 hover:z-20 transition-all duration-300 flex flex-col ${
                feature.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'
              }`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[240px]">
                <div>
                  <div className="mb-8 block">
                    <Tooltip content={feature.description}>
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F7F4] border border-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] group-hover:scale-110 group-hover:bg-[#EAD07D] transition-all duration-300 shadow-sm cursor-help">
                        <feature.icon size={26} strokeWidth={1.5} />
                      </div>
                    </Tooltip>
                  </div>
                  
                  <div className="mb-4 block">
                    <Tooltip content={feature.description}>
                      <h3 className="text-2xl font-bold text-[#1A1A1A] inline-block cursor-help border-b border-transparent hover:border-[#EAD07D] transition-colors">{feature.title}</h3>
                    </Tooltip>
                  </div>
                  
                  <p className="text-[#666] leading-relaxed text-[15px]">{feature.description}</p>
                </div>
                
                <div className="mt-10 flex items-center text-sm font-semibold text-[#1A1A1A] opacity-60 group-hover:opacity-100 transition-all">
                  Learn more <ArrowUpRight className="ml-2 w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};