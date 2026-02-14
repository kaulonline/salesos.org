import React from 'react';
import { AlertCircle } from 'lucide-react';

export const PricingDisclaimer: React.FC = () => {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mt-8">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-[#1A1A1A] mb-2">Pricing Disclaimer</h4>
          <p className="text-sm text-[#666] leading-relaxed">
            Competitor pricing shown represents publicly available rates as of February 2025 and may not reflect current pricing,
            promotional offers, or enterprise discounts. Pricing varies by contract terms, user count, and add-ons selected.
            Total cost calculations include estimated costs for typical implementations and commonly required features.
            Visit official vendor websites for current pricing. Last updated: Feb 2025.
          </p>
        </div>
      </div>
    </div>
  );
};

export const AdoptionRateDisclaimer: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-[#999] italic mt-2">
      <AlertCircle size={12} />
      <span>Adoption rates based on industry averages and G2/Gartner reports</span>
    </div>
  );
};
