import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';
import { ArrowRight, BarChart3, Zap, Users, TrendingUp, Target, Mail } from 'lucide-react';
import { ScrollReveal } from '../components/ui/ScrollReveal';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { TiltCard } from '../components/ui/TiltCard';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

export const Product: React.FC = () => {
  return (
    <>
    <SEOHead {...SEO_CONFIGS.product} />
    <PageLayout
      title="The Product"
      subtitle="Built for speed, designed for revenue. See how SalesOS powers the world's fastest growing sales teams."
    >
      {/* Hero Image Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-24 h-[500px]">
        <img
          src="https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=2000"
          alt="Sales Dashboard"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/80 to-transparent" />

        {/* Frosted Stats Cards */}
        <div className="absolute bottom-8 left-8 right-8 flex flex-wrap gap-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-default">
            <div className="text-3xl font-bold text-[#EAD07D]">
              <AnimatedCounter end={3.2} decimals={1} suffix="x" duration={2000} />
            </div>
            <div className="text-sm text-white/70">Pipeline Growth</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-default">
            <div className="text-3xl font-bold text-[#EAD07D]">
              <AnimatedCounter end={47} suffix="%" duration={2000} />
            </div>
            <div className="text-sm text-white/70">Faster Close Rate</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-default">
            <div className="text-3xl font-bold text-[#EAD07D]">
              <AnimatedCounter end={89} suffix="%" duration={2000} />
            </div>
            <div className="text-sm text-white/70">Forecast Accuracy</div>
          </div>
        </div>

        {/* Frosted CTA */}
        <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-xs">
          <h3 className="text-white font-bold text-lg mb-2">See it in action</h3>
          <p className="text-white/70 text-sm mb-4">Watch how top teams use SalesOS to crush their quotas.</p>
          <Button variant="secondary" size="sm">Watch Demo</Button>
        </div>
      </div>

      {/* Pipeline Intelligence Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-32">
        <ScrollReveal animation="fade-right" className="order-2 md:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD07D]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider mb-6">
            <BarChart3 size={14} />
            Pipeline Intelligence
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6">Know exactly which deals will close.</h2>
          <p className="text-[#666] text-lg leading-relaxed mb-8">
            Stop guessing. Our AI engine analyzes thousands of signals—from email sentiment to stakeholder engagement—to give you a dynamic close probability score for every deal in your pipeline.
          </p>
          <ul className="space-y-4 mb-8">
             {['Real-time sentiment analysis', 'Stakeholder mapping', 'Risk alerts'].map((item, idx) => (
                <li key={item} className="flex items-center gap-3 text-[#1A1A1A] font-medium" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="w-5 h-5 rounded-full bg-[#EAD07D] flex items-center justify-center text-xs">✓</div>
                  {item}
                </li>
             ))}
          </ul>
          <Button className="group hover:scale-105 active:scale-95 transition-transform">
            Explore Pipeline Features
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </ScrollReveal>
        <ScrollReveal animation="fade-left" delay={200} className="order-1 md:order-2">
          <TiltCard className="relative" maxTilt={5} scale={1.01} glare glareMaxOpacity={0.1}>
            <div className="rounded-[2rem] overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000"
                alt="Analytics Dashboard"
                className="w-full h-auto"
              />
            </div>
            {/* Floating frosted card */}
            <div className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl p-4 shadow-xl animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1A1A1A]">Win Rate Up</div>
                  <div className="text-xs text-green-600 font-medium">
                    +<AnimatedCounter end={23} suffix="%" /> this quarter
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>
        </ScrollReveal>
      </div>

      {/* Automated Outreach Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-32">
        <div className="relative">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&q=80&w=1000"
              alt="Email Automation"
              className="w-full h-auto"
            />
          </div>
          {/* Floating frosted card */}
          <div className="absolute -bottom-6 -right-6 bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A]">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#1A1A1A]">Emails Sent</div>
                <div className="text-xs text-[#666] font-medium">2,847 this week</div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD07D]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider mb-6">
            <Zap size={14} />
            Automated Outreach
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6">Outreach that feels personal, at scale.</h2>
          <p className="text-[#666] text-lg leading-relaxed mb-8">
             Build multi-channel sequences that adapt automatically. If a prospect clicks a link, call them. If they don't open an email, send a LinkedIn connection request. All on autopilot.
          </p>
          <ul className="space-y-4 mb-8">
             {['Multi-channel sequences', 'Behavior-based triggers', 'AI personalization'].map(item => (
                <li key={item} className="flex items-center gap-3 text-[#1A1A1A] font-medium">
                  <div className="w-5 h-5 rounded-full bg-[#EAD07D] flex items-center justify-center text-xs">✓</div>
                  {item}
                </li>
             ))}
          </ul>
          <Button variant="outline" className="group">
            See Automation Demo
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Team Collaboration Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-20">
        <img
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=2000"
          alt="Team Collaboration"
          className="w-full h-[400px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/50 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-4">
              <Users size={14} />
              Team Collaboration
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Built for teams that move fast.</h2>
            <p className="text-white/70 text-lg mb-6">
              Real-time collaboration, shared pipelines, and unified communication. Everyone stays on the same page.
            </p>
            <Button variant="secondary">Learn About Teams</Button>
          </div>
        </div>

        {/* Floating team avatars */}
        <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map(i => (
              <img
                key={i}
                src={`https://images.unsplash.com/photo-${1500000000000 + i * 100000000}?auto=format&fit=crop&q=80&w=100&h=100`}
                alt="Team member"
                className="w-10 h-10 rounded-full border-2 border-white/50 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100&h=100`;
                }}
              />
            ))}
            <div className="w-10 h-10 rounded-full bg-[#EAD07D] border-2 border-white/50 flex items-center justify-center text-[#1A1A1A] text-xs font-bold">
              +12
            </div>
          </div>
          <div className="text-white/70 text-xs mt-2 text-center">Active now</div>
        </div>
      </div>
    </PageLayout>
    </>
  );
};
