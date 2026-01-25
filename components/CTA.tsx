import React from 'react';
import { Button } from './ui/Button';
import { ArrowRight, Sparkles } from 'lucide-react';

export const CTA: React.FC = () => {
  return (
    <section className="relative overflow-hidden rounded-t-[3rem] mt-10 mx-2 md:mx-6 mb-6">
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000"
        alt="Team meeting"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-[#1A1A1A]/85" />

      {/* Gradient Accent */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#EAD07D]/20 via-transparent to-transparent opacity-50" />

      {/* Content */}
      <div className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {/* Frosted Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-8">
            <Sparkles size={16} className="text-[#EAD07D]" />
            No credit card required
          </div>

          <h2 className="text-4xl md:text-7xl font-bold mb-8 tracking-tight text-white">
            Ready to scale your <br />
            <span className="text-[#EAD07D]">Revenue Engine?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 2,000+ high-growth teams using SalesOS to automate their pipeline and close more deals.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-5 mb-10">
            <Button variant="secondary" size="lg" className="min-w-[200px] text-lg group">
              Start 14-Day Free Trial
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="min-w-[200px] border-white/20 text-white hover:bg-white/10 text-lg">
              Talk to Sales
            </Button>
          </div>

          {/* Frosted Social Proof */}
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
            <div className="flex -space-x-3">
              {[
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=60',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60',
                'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=60',
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=60',
              ].map((src, i) => (
                <img key={i} src={src} alt="User" className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] object-cover" />
              ))}
            </div>
            <div className="text-left">
              <div className="text-white text-sm font-medium">Loved by 2,000+ teams</div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className="text-[#EAD07D]">★</span>
                ))}
                <span className="text-gray-500 text-xs ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Frosted Cards */}
      <div className="absolute top-20 left-10 hidden lg:block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 animate-float">
        <div className="text-[#EAD07D] text-2xl font-bold">+47%</div>
        <div className="text-white/60 text-xs">Close Rate</div>
      </div>

      <div className="absolute bottom-20 right-10 hidden lg:block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 animate-float" style={{ animationDelay: '1s' }}>
        <div className="text-[#EAD07D] text-2xl font-bold">3.2x</div>
        <div className="text-white/60 text-xs">Pipeline Growth</div>
      </div>
    </section>
  );
};
