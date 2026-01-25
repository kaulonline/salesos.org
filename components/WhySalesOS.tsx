import React from 'react';
import { DIFFERENTIATORS } from '../constants';
import { ScrollReveal } from './ui/ScrollReveal';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { TiltCard } from './ui/TiltCard';

// Parse metrics to extract numbers for animation
const parseMetric = (metric: string) => {
  const match = metric.match(/^([\d.]+)([x%+]*)$/);
  if (match) {
    return {
      value: parseFloat(match[1]),
      suffix: match[2],
      decimals: match[1].includes('.') ? 1 : 0,
    };
  }
  return null;
};

export const WhySalesOS: React.FC = () => {
  return (
    <section className="py-24 md:py-32 bg-white relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#EAD07D]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6">
          <div>
            <ScrollReveal animation="fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAD07D]/10 border border-[#EAD07D]/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#EAD07D] animate-pulse" />
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">The Difference</span>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={100}>
              <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6">Why SalesOS?</h2>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={200}>
              <p className="text-lg text-[#666] max-w-lg leading-relaxed">
                Designed for modern teams who refuse to settle for clunky, legacy software. The difference is in the details.
              </p>
            </ScrollReveal>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {DIFFERENTIATORS.map((item, idx) => {
            const parsedMetric = parseMetric(item.metric);

            return (
              <ScrollReveal key={item.id} animation="fade-up" delay={idx * 150}>
                <TiltCard
                  className="group p-10 rounded-[2.5rem] bg-[#F8F7F4] hover:bg-[#1A1A1A] hover:text-white transition-all duration-500 relative overflow-hidden h-full"
                  maxTilt={8}
                  scale={1.02}
                  glare
                  glareMaxOpacity={0.1}
                >
                  <div className="relative z-10 flex flex-col h-full justify-between min-h-[300px]">
                    <div>
                      {/* Animated Metric */}
                      <div className="text-6xl font-light mb-8 tracking-tighter text-[#EAD07D] font-sans">
                        {parsedMetric ? (
                          <AnimatedCounter
                            end={parsedMetric.value}
                            decimals={parsedMetric.decimals}
                            suffix={parsedMetric.suffix}
                            duration={2000}
                          />
                        ) : (
                          item.metric
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                      <p className="text-[#666] group-hover:text-gray-400 leading-relaxed transition-colors text-[15px]">
                        {item.description}
                      </p>
                    </div>
                    <div className="pt-8 border-t border-black/5 group-hover:border-white/10 mt-10">
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#1A1A1A]/40 group-hover:text-[#EAD07D] transition-colors">
                        {item.metricLabel}
                      </span>
                    </div>
                  </div>

                  {/* Decoration - enhanced glow */}
                  <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-[#EAD07D] blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full pointer-events-none" />
                  <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-white blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity duration-700 rounded-full pointer-events-none" />
                </TiltCard>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Bottom stats bar */}
        <ScrollReveal animation="fade-up" delay={600}>
          <div className="mt-16 bg-[#1A1A1A] rounded-[2rem] p-8 md:p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: 2000, suffix: '+', label: 'Teams' },
                { value: 50, suffix: '+', label: 'Countries' },
                { value: 99.9, suffix: '%', label: 'Uptime', decimals: 1 },
                { value: 4.9, suffix: '/5', label: 'Rating', decimals: 1 },
              ].map((stat, i) => (
                <div key={i} className="group">
                  <div className="text-3xl md:text-4xl font-bold text-[#EAD07D] mb-2">
                    <AnimatedCounter
                      end={stat.value}
                      suffix={stat.suffix}
                      decimals={stat.decimals || 0}
                      duration={2500}
                    />
                  </div>
                  <div className="text-sm text-white/60 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
