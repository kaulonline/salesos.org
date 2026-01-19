import React from 'react';
import { DIFFERENTIATORS } from '../constants';

export const WhySalesOS: React.FC = () => {
  return (
    <section className="py-24 md:py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6">
           <div>
              <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6">Why SalesOS?</h2>
              <p className="text-lg text-[#666] max-w-lg leading-relaxed">Designed for modern teams who refuse to settle for clunky, legacy software. The difference is in the details.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
           {DIFFERENTIATORS.map((item) => (
             <div key={item.id} className="group p-10 rounded-[2.5rem] bg-[#F8F7F4] hover:bg-[#1A1A1A] hover:text-white transition-all duration-500 relative overflow-hidden">
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[300px]">
                   <div>
                      <div className="text-6xl font-light mb-8 tracking-tighter text-[#EAD07D] font-sans">{item.metric}</div>
                      <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                      <p className="text-[#666] group-hover:text-gray-400 leading-relaxed transition-colors text-[15px]">{item.description}</p>
                   </div>
                   <div className="pt-8 border-t border-black/5 group-hover:border-white/10 mt-10">
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#1A1A1A]/40 group-hover:text-[#EAD07D] transition-colors">{item.metricLabel}</span>
                   </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-[#EAD07D] blur-[80px] opacity-0 group-hover:opacity-15 transition-opacity duration-700 rounded-full pointer-events-none" />
             </div>
           ))}
        </div>
      </div>
    </section>
  )
}