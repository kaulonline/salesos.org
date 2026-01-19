import React from 'react';
import { PRICING_TIERS } from '../constants';
import { Check } from 'lucide-react';
import { Button } from './ui/Button';

export const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-20 md:py-32 relative bg-[#F2F1EA]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 md:mb-24">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1A1A1A]">Simple, transparent pricing</h2>
          <p className="text-[#666] text-lg">Choose the plan that fits your growth stage.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-center max-w-lg lg:max-w-none mx-auto">
          {PRICING_TIERS.map((tier) => (
            <div 
              key={tier.name}
              className={`relative rounded-[2rem] p-8 md:p-10 flex flex-col transition-all duration-300 w-full ${
                tier.highlight 
                  ? 'bg-[#1A1A1A] text-white shadow-2xl lg:scale-110 z-10 ring-1 ring-black/5' 
                  : 'bg-white text-[#1A1A1A] hover:bg-[#FAF9F6] shadow-sm'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#EAD07D] text-[#1A1A1A] text-xs font-bold uppercase tracking-wide shadow-lg whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-medium mb-4 opacity-80">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-bold tracking-tight">{tier.price}</span>
                    {tier.price !== 'Custom' && <span className="opacity-60 font-medium">/mo</span>}
                </div>
                <p className={`text-sm mt-6 leading-relaxed ${tier.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{tier.description}</p>
              </div>

              <div className="flex-1 space-y-5 mb-10">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-[15px]">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tier.highlight ? 'bg-[#EAD07D] text-black' : 'bg-[#1A1A1A] text-white'}`}>
                       <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="opacity-90">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                variant={tier.highlight ? 'secondary' : 'primary'} 
                className="w-full mt-auto"
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};