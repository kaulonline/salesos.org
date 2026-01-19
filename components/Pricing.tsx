import React, { useState } from 'react';
import { PRICING_TIERS } from '../constants';
import { Check, X } from 'lucide-react';
import { Button } from './ui/Button';

export const Pricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  return (
    <section id="pricing" className="py-20 md:py-32 relative bg-[#F2F1EA] overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-2">Pricing</h2>
            <p className="text-[#666] text-lg">Choose the right plan for your team.</p>
          </div>

          {/* Toggle Switch */}
          <div className="bg-white p-1 rounded-full border border-black/5 flex items-center relative">
            <button 
              onClick={() => setBillingCycle('annual')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${billingCycle === 'annual' ? 'text-white' : 'text-[#666] hover:text-[#1A1A1A]'}`}
            >
              Annual
            </button>
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${billingCycle === 'monthly' ? 'text-white' : 'text-[#666] hover:text-[#1A1A1A]'}`}
            >
              Monthly
            </button>
            
            {/* Sliding Pill Background */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#1A1A1A] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${billingCycle === 'monthly' ? 'translate-x-[100%]' : 'translate-x-0'}`}
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {PRICING_TIERS.map((tier) => (
            <div 
              key={tier.name}
              className={`relative group rounded-[2.5rem] p-8 lg:p-10 flex flex-col transition-all duration-300 w-full min-h-[700px]
                ${tier.highlight 
                  ? 'bg-[#1A1A1A] text-white shadow-2xl ring-4 ring-[#EAD07D]/20 scale-100 lg:scale-105 z-10' 
                  : 'bg-[#F2F1EA] md:bg-[#F0F0E8] text-[#1A1A1A] border border-black/5 shadow-lg' // Slightly darker beige for cards to pop against bg
                }
              `}
            >
              {/* Top Tab / Badge */}
              <div 
                className={`absolute -top-[1px] -right-[1px] h-12 px-6 flex items-center justify-center rounded-bl-2xl rounded-tr-[2.4rem] text-xs font-bold uppercase tracking-wider
                  ${tier.highlight 
                    ? 'bg-[#EAD07D] text-[#1A1A1A]' 
                    : 'bg-[#E0E0D8] text-[#1A1A1A]/60'
                  }
                `}
              >
                {tier.badge}
                {/* Corner smoothing visual trick for tab */}
                <div className={`absolute top-0 -left-4 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${tier.highlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
                <div className={`absolute -bottom-4 right-0 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${tier.highlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
              </div>

              {/* Card Content */}
              <div className="mb-8 mt-4 text-center">
                <h3 className={`text-xl font-medium mb-4 ${tier.highlight ? 'opacity-90' : 'opacity-70'}`}>{tier.name}</h3>
                
                <div className="flex items-center justify-center gap-3 mb-2">
                   {tier.originalPrice && (
                       <span className={`text-2xl font-medium line-through decoration-2 ${tier.highlight ? 'text-gray-500' : 'text-gray-400'}`}>
                           {tier.originalPrice}
                       </span>
                   )}
                   <span className={`text-6xl font-sans font-medium tracking-tight ${tier.highlight ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'}`}>
                       {tier.price}
                   </span>
                </div>
                
                <p className={`text-xs font-medium uppercase tracking-wide mb-6 ${tier.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                    {billingCycle === 'annual' ? '$228 billed yearly' : '$'+parseInt(tier.price.slice(1))*12+' billed yearly'}
                </p>

                <p className={`text-sm leading-relaxed max-w-[260px] mx-auto ${tier.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                    {tier.description}
                </p>
              </div>

              {/* Divider */}
              <div className={`h-px w-full my-6 ${tier.highlight ? 'bg-white/10 dashed-border' : 'bg-black/5'}`} />

              {/* Features List */}
              <div className="flex-1 space-y-4 mb-10">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-4 text-[14px]">
                    <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center shrink-0 mt-0.5 text-white">
                       <Check size={10} strokeWidth={4} />
                    </div>
                    <span className={`flex-1 ${tier.highlight ? 'opacity-90' : 'opacity-70'}`}>{feature}</span>
                  </div>
                ))}
                
                {tier.notIncluded?.map((feature, idx) => (
                   <div key={`not-${idx}`} className="flex items-start gap-4 text-[14px]">
                    <div className={`w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 ${tier.highlight ? 'text-gray-600' : 'text-gray-400'}`}>
                       <X size={16} strokeWidth={2} />
                    </div>
                    <span className={`flex-1 ${tier.highlight ? 'text-gray-600' : 'text-gray-400 line-through'}`}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Button */}
              <Button 
                variant={tier.highlight ? 'white' : 'outline'} // Use white variant for dark card
                className={`w-full py-4 rounded-full font-bold text-sm ${
                    tier.highlight 
                    ? 'bg-white text-[#1A1A1A] hover:bg-gray-100' 
                    : 'bg-[#F2F1EA] border border-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-white'
                }`}
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