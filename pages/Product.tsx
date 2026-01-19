import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';
import { ArrowRight, BarChart3, Zap, Layers } from 'lucide-react';

export const Product: React.FC = () => {
  return (
    <PageLayout 
      title="The Product" 
      subtitle="Built for speed, designed for revenue. See how SalesOS powers the world's fastest growing sales teams."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-32">
        <div className="order-2 md:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD07D]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider mb-6">
            Pipeline Intelligence
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6">Know exactly which deals will close.</h2>
          <p className="text-[#666] text-lg leading-relaxed mb-8">
            Stop guessing. Our AI engine analyzes thousands of signals—from email sentiment to stakeholder engagement—to give you a dynamic close probability score for every deal in your pipeline.
          </p>
          <ul className="space-y-4 mb-8">
             {['Real-time sentiment analysis', 'Stakeholder mapping', 'Risk alerts'].map(item => (
                <li key={item} className="flex items-center gap-3 text-[#1A1A1A] font-medium">
                  <div className="w-5 h-5 rounded-full bg-[#EAD07D] flex items-center justify-center text-xs">✓</div>
                  {item}
                </li>
             ))}
          </ul>
          <Button>Explore Pipeline Features</Button>
        </div>
        <div className="order-1 md:order-2 bg-white rounded-[2rem] p-8 shadow-card border border-black/5">
           <div className="aspect-[4/3] bg-[#F2F1EA] rounded-2xl flex items-center justify-center relative overflow-hidden">
              <BarChart3 size={64} className="text-[#1A1A1A]/20" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#EAD07D]/10 to-transparent"></div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
        <div className="bg-white rounded-[2rem] p-8 shadow-card border border-black/5">
           <div className="aspect-[4/3] bg-[#F2F1EA] rounded-2xl flex items-center justify-center relative overflow-hidden">
              <Zap size={64} className="text-[#1A1A1A]/20" />
              <div className="absolute inset-0 bg-gradient-to-bl from-[#1A1A1A]/5 to-transparent"></div>
           </div>
        </div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD07D]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider mb-6">
            Automated Outreach
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6">Outreach that feels personal, at scale.</h2>
          <p className="text-[#666] text-lg leading-relaxed mb-8">
             Build multi-channel sequences that adapt automatically. If a prospect clicks a link, call them. If they don't open an email, send a LinkedIn connection request. All on autopilot.
          </p>
          <Button variant="outline">See Automation Demo</Button>
        </div>
      </div>
    </PageLayout>
  );
};