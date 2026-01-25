import React from 'react';
import { TESTIMONIALS } from '../constants';
import { Marquee } from './ui/Marquee';
import { ScrollReveal, StaggeredReveal } from './ui/ScrollReveal';
import { TiltCard } from './ui/TiltCard';

const COMPANY_LOGOS = [
  { name: 'Acme Corp', color: '#1A1A1A' },
  { name: 'GlobalBank', color: '#2563EB' },
  { name: 'Nebula', color: '#7C3AED' },
  { name: 'Vertex', color: '#059669' },
  { name: 'Sisyphus', color: '#DC2626' },
  { name: 'Quantum', color: '#0891B2' },
  { name: 'Helix', color: '#CA8A04' },
  { name: 'Prism', color: '#DB2777' },
];

export const SocialProof: React.FC = () => {
  return (
    <section className="py-24 bg-white border-y border-black/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <ScrollReveal animation="fade-up">
          <p className="text-center text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-[0.2em] mb-12">
            Trusted by modern revenue teams
          </p>
        </ScrollReveal>

        {/* Marquee Logos */}
        <Marquee speed={35} pauseOnHover gap={64} className="mb-6">
          {COMPANY_LOGOS.map((company, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 py-3 bg-[#F8F7F4] rounded-full border border-black/5 hover:border-[#EAD07D]/50 hover:bg-white transition-all duration-300 cursor-pointer group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform"
                style={{ backgroundColor: company.color }}
              >
                {company.name[0]}
              </div>
              <span className="text-lg font-bold text-[#1A1A1A]/70 group-hover:text-[#1A1A1A] transition-colors whitespace-nowrap">
                {company.name}
              </span>
            </div>
          ))}
        </Marquee>

        {/* Reverse direction marquee */}
        <Marquee speed={40} direction="right" pauseOnHover gap={64}>
          {COMPANY_LOGOS.slice().reverse().map((company, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 py-3 bg-[#F8F7F4] rounded-full border border-black/5 hover:border-[#EAD07D]/50 hover:bg-white transition-all duration-300 cursor-pointer group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform"
                style={{ backgroundColor: company.color }}
              >
                {company.name[0]}
              </div>
              <span className="text-lg font-bold text-[#1A1A1A]/70 group-hover:text-[#1A1A1A] transition-colors whitespace-nowrap">
                {company.name}
              </span>
            </div>
          ))}
        </Marquee>

        {/* Testimonial Grid */}
        <div className="mt-28">
          <ScrollReveal animation="fade-up" className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAD07D]/10 border border-[#EAD07D]/20 mb-4">
              <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Customer Stories</span>
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A]">Loved by sales teams everywhere</h3>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <ScrollReveal key={idx} animation="fade-up" delay={idx * 150}>
                <TiltCard
                  className="bg-[#F2F1EA] p-10 rounded-[2rem] relative overflow-hidden hover:shadow-xl transition-all duration-500 h-full"
                  maxTilt={5}
                  scale={1.01}
                  glare
                  glareMaxOpacity={0.1}
                >
                  {/* Quote icon */}
                  <div className="absolute top-8 right-8 text-[#EAD07D] opacity-20">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21L14.017 18C14.017 16.896 14.321 16.067 14.929 15.513C15.537 14.959 16.516 14.682 17.866 14.682L19.033 14.682L19.033 7.733C17.062 7.733 15.398 8.079 14.041 8.771C12.684 9.463 12.006 10.667 12.006 12.383L12.006 21H14.017ZM8.017 21L8.017 18C8.017 16.896 8.321 16.067 8.929 15.513C9.537 14.959 10.516 14.682 11.866 14.682L13.033 14.682L13.033 7.733C11.062 7.733 9.398 8.079 8.041 8.771C6.684 9.463 6.006 10.667 6.006 12.383L6.006 21H8.017Z" />
                    </svg>
                  </div>

                  {/* Stars */}
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-[#EAD07D] text-lg">★</span>
                    ))}
                  </div>

                  <p className="text-xl md:text-2xl text-[#1A1A1A] mb-8 relative z-10 font-medium leading-relaxed tracking-tight">
                    "{t.content}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                    />
                    <div>
                      <h5 className="font-bold text-[#1A1A1A]">{t.name}</h5>
                      <p className="text-sm text-[#666]">{t.role}, {t.company}</p>
                    </div>
                  </div>

                  {/* Decorative gradient */}
                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#EAD07D]/10 rounded-full blur-3xl pointer-events-none" />
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
