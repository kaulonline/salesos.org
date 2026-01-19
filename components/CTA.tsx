import React from 'react';
import { Button } from './ui/Button';

export const CTA: React.FC = () => {
  return (
    <section className="py-32 relative overflow-hidden bg-[#1A1A1A] text-white rounded-t-[3rem] mt-10 mx-2 md:mx-6 mb-6">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#EAD07D]/20 via-transparent to-transparent opacity-50" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl md:text-7xl font-bold mb-8 tracking-tight">
          Ready to scale your <br />
          <span className="text-[#EAD07D]">Revenue Engine?</span>
        </h2>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Join 2,000+ high-growth teams using SalesOS to automate their pipeline and close more deals.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
          <Button variant="secondary" size="lg" className="min-w-[200px] text-lg">Start 14-Day Free Trial</Button>
          <Button variant="outline" size="lg" className="min-w-[200px] border-white/20 text-white hover:bg-white/10 text-lg">Talk to Sales</Button>
        </div>
        <p className="mt-8 text-sm text-gray-500 font-medium">No credit card required • Cancel anytime</p>
      </div>
    </section>
  );
};