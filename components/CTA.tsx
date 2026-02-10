import React from 'react';
import { Button } from './ui/Button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ScrollReveal } from './ui/ScrollReveal';
import { AnimatedCounter } from './ui/AnimatedCounter';

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

      {/* Animated gradient orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#EAD07D]/20 blur-[120px] rounded-full animate-blob pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-[#EAD07D]/10 blur-[100px] rounded-full animate-blob pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Content */}
      <div className="relative z-10 py-16 md:py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {/* Frosted Badge */}
          <ScrollReveal animation="fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-8">
              <Sparkles size={16} className="text-[#EAD07D]" />
              No credit card required
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-8 tracking-tight text-white">
              Ready to scale your <span className="hidden sm:inline"><br /></span>
              <span className="text-[#EAD07D]">Revenue Engine?</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join <AnimatedCounter end={2000} suffix="+" className="text-white font-semibold" /> high-growth teams using SalesOS to automate their pipeline and close more deals.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={300}>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-5 mb-10">
              <Button variant="secondary" size="lg" className="min-w-[200px] text-lg group hover:scale-105 active:scale-95 transition-transform">
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="min-w-[200px] border-white/20 text-white hover:bg-white/10 text-lg hover:scale-105 active:scale-95 transition-transform">
                Talk to Sales
              </Button>
            </div>
          </ScrollReveal>

          {/* Frosted Social Proof */}
          <ScrollReveal animation="scale" delay={400}>
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex -space-x-3">
                {[
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=60',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60',
                  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=60',
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=60',
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="User"
                    className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] object-cover hover:scale-110 hover:z-10 transition-transform"
                    style={{ transitionDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="text-white text-sm font-medium">Loved by 2,000+ teams</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-[#EAD07D]">★</span>
                  ))}
                  <span className="text-gray-500 text-xs ml-1">4.9/5 rating</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Floating Frosted Cards */}
      <div className="absolute top-20 left-10 hidden lg:block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 animate-float hover:scale-110 transition-transform cursor-default">
        <div className="text-[#EAD07D] text-2xl font-bold">
          +<AnimatedCounter end={47} suffix="%" />
        </div>
        <div className="text-white/60 text-xs">Close Rate</div>
      </div>

      <div className="absolute bottom-20 right-10 hidden lg:block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 animate-float hover:scale-110 transition-transform cursor-default" style={{ animationDelay: '1s' }}>
        <div className="text-[#EAD07D] text-2xl font-bold">
          <AnimatedCounter end={3.2} decimals={1} suffix="x" />
        </div>
        <div className="text-white/60 text-xs">Pipeline Growth</div>
      </div>

      {/* Additional floating element */}
      <div className="absolute top-1/2 right-20 hidden xl:block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 animate-float" style={{ animationDelay: '2s' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/70 text-xs">Live sync</span>
        </div>
      </div>
    </section>
  );
};
