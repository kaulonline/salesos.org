import React from 'react';
import { FEATURES } from '../constants';
import { ArrowUpRight, Bot, Calendar, Mail, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from './ui/ScrollReveal';
import { TiltCard } from './ui/TiltCard';

export const Features: React.FC = () => {
  return (
    <section id="solutions" className="py-16 md:py-24 lg:py-32 relative bg-[#F2F1EA] overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#EAD07D]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-20">
          <ScrollReveal animation="fade-up">
            {/* Frosted Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-[#EAD07D] animate-pulse" />
              <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Platform Features</span>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-[#1A1A1A]">
              Everything you need to <span className="hidden sm:inline"><br /></span>
              <span className="text-[#888]">close more deals.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-lg text-[#666] max-w-xl">
              Replace your fragmented tech stack with a unified platform designed for speed, intelligence, and scale.
            </p>
          </ScrollReveal>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => (
            <ScrollReveal
              key={feature.id}
              animation="fade-up"
              delay={idx * 100}
              className={feature.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}
            >
              <TiltCard
                className="group relative bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:shadow-xl hover:border-[#EAD07D]/30 transition-all duration-500 h-full"
                maxTilt={6}
                scale={1.02}
                glare
                glareMaxOpacity={0.15}
              >
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[240px]">
                  <div>
                    {/* Icon */}
                    <div className="mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F7F4] border border-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] group-hover:scale-110 group-hover:bg-[#EAD07D] transition-all duration-300 shadow-sm">
                        <feature.icon size={26} strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{feature.title}</h3>

                    {/* Description */}
                    <p className="text-[#666] leading-relaxed text-[15px]">{feature.description}</p>
                  </div>

                  {/* Learn More Link */}
                  <Link
                    to="/features"
                    className="mt-8 flex items-center text-sm font-semibold text-[#1A1A1A] opacity-60 group-hover:opacity-100 group-hover:text-[#1A1A1A] transition-all"
                  >
                    Learn more <ArrowUpRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#EAD07D]/0 to-[#EAD07D]/0 group-hover:from-[#EAD07D]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>

        {/* Additional Features Row */}
        <ScrollReveal animation="fade-up" delay={400}>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Bot, label: 'AI Assistant' },
              { icon: Calendar, label: 'Meeting Scheduler' },
              { icon: Mail, label: 'Email Sequences' },
              { icon: BarChart3, label: 'Revenue Forecasting' },
            ].map((item, i) => (
              <div
                key={i}
                className="group bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4 border border-white/50 hover:bg-white hover:shadow-lg hover:border-[#EAD07D]/30 transition-all duration-300 cursor-pointer"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#EAD07D] group-hover:scale-110 transition-all duration-300">
                  <item.icon size={20} strokeWidth={1.5} />
                </div>
                <span className="text-sm font-semibold text-[#1A1A1A]">{item.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal animation="scale" delay={500}>
          <div className="mt-16 text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-semibold text-sm hover:bg-[#333] transition-colors shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Explore All Features
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
