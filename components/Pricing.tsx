import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, TrendingUp, DollarSign, BarChart3, Zap, ArrowRight } from 'lucide-react';
import { OUTCOME_PRICING_MODELS } from '../constants';

const FEATURES_INCLUDED = [
  'Unlimited team members',
  'AI-Powered Sales Assistant',
  'Lead & Opportunity Management',
  'Pipeline Analytics',
  'Email & Calendar Sync',
  'Mobile App Access',
];

export const Pricing: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/signup');
  };

  const handleViewPricing = () => {
    navigate('/pricing');
  };

  const getModelIcon = (id: string) => {
    switch (id) {
      case 'revenue-share':
        return TrendingUp;
      case 'tiered-flat':
        return BarChart3;
      case 'flat-per-deal':
        return DollarSign;
      default:
        return Zap;
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-32 relative bg-[#F2F1EA] overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-[#93C01F]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#93C01F]/10 border border-[#93C01F]/20 mb-6">
            <TrendingUp size={16} className="text-[#93C01F]" />
            <span className="text-sm font-semibold text-[#1A1A1A]">Outcome-Based Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
            Pay When You <span className="text-[#EAD07D]">Win</span>
          </h2>
          <p className="text-[#666] text-lg max-w-2xl mx-auto">
            No upfront subscriptions. No per-seat fees. Only pay when your team closes deals.
          </p>
        </div>

        {/* Main Pricing Card */}
        <div className="bg-[#1A1A1A] rounded-[2.5rem] p-8 md:p-12 text-center max-w-4xl mx-auto mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D]/10 blur-[80px] rounded-full" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAD07D] text-[#1A1A1A] font-bold text-sm mb-6">
              <Zap size={16} />
              Most Popular
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Revenue Share Model
            </h3>

            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-5xl md:text-7xl font-bold text-[#EAD07D]">2.5%</span>
              <span className="text-lg text-white/60 text-left">
                of each<br />closed deal
              </span>
            </div>

            <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
              Close a $100,000 deal? Pay just $2,500. No deal? Pay nothing.
            </p>

            {/* Example deals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { amount: 10000, fee: 250 },
                { amount: 50000, fee: 1250 },
                { amount: 100000, fee: 2500 },
                { amount: 250000, fee: 6250 },
              ].map((deal) => (
                <div key={deal.amount} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-white font-semibold text-sm">${deal.amount.toLocaleString()}</p>
                  <p className="text-[#EAD07D] text-xs">Fee: ${deal.fee.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-white text-[#1A1A1A] rounded-full font-bold text-lg hover:bg-gray-100 transition-all"
            >
              Start Free Today
            </button>
          </div>
        </div>

        {/* Other Pricing Models */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {OUTCOME_PRICING_MODELS.map((model) => {
            const Icon = getModelIcon(model.id);
            return (
              <div
                key={model.id}
                className={`rounded-[1.5rem] p-6 transition-all ${
                  model.highlight
                    ? 'bg-[#1A1A1A] text-white ring-2 ring-[#EAD07D]/30'
                    : 'bg-white text-[#1A1A1A] border border-black/5 shadow-sm'
                }`}
              >
                {model.highlight && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EAD07D] text-[#1A1A1A] font-bold text-xs mb-4">
                    {model.badge}
                  </div>
                )}
                {!model.highlight && (
                  <span className="text-xs font-semibold text-[#999] uppercase tracking-wider">
                    {model.badge}
                  </span>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mt-3 mb-3 ${
                  model.highlight ? 'bg-white/10' : 'bg-[#F8F8F6]'
                }`}>
                  <Icon size={20} className={model.highlight ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'} />
                </div>

                <h4 className="font-semibold text-lg mb-1">{model.name}</h4>
                <p className={`text-sm mb-3 ${model.highlight ? 'text-white/60' : 'text-[#666]'}`}>
                  {model.description}
                </p>
                <p className={`text-lg font-bold ${model.highlight ? 'text-[#EAD07D]' : 'text-[#93C01F]'}`}>
                  {model.rate}
                </p>
                <p className={`text-xs ${model.highlight ? 'text-white/40' : 'text-[#999]'}`}>
                  {model.example}
                </p>
              </div>
            );
          })}
        </div>

        {/* Features Included */}
        <div className="bg-white rounded-[2rem] p-8 md:p-10 max-w-4xl mx-auto border border-black/5">
          <h4 className="font-semibold text-[#1A1A1A] text-center mb-6">
            Full Platform Access Included
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES_INCLUDED.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-sm text-[#666]">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <button
            onClick={handleViewPricing}
            className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-all inline-flex items-center gap-2"
          >
            View Full Pricing Details <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
};
