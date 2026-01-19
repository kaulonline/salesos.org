import React from 'react';
import { TESTIMONIALS } from '../constants';

export const SocialProof: React.FC = () => {
  return (
    <section className="py-24 bg-white border-y border-black/5">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Logos */}
        <p className="text-center text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-[0.2em] mb-12">Trusted by modern revenue teams</p>
        <div className="flex flex-wrap justify-center gap-x-16 gap-y-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
           {['Acme Corp', 'GlobalBank', 'Nebula', 'Vertex', 'Sisyphus'].map((name, i) => (
             <span key={i} className="text-2xl font-bold font-sans text-[#1A1A1A]/60">{name}</span>
           ))}
        </div>

        {/* Testimonial Grid */}
        <div className="mt-28 grid grid-cols-1 md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((t, idx) => (
             <div key={idx} className="bg-[#F2F1EA] p-10 rounded-[2rem] relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="absolute top-8 right-8 text-[#EAD07D] opacity-20">
                   <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M14.017 21L14.017 18C14.017 16.896 14.321 16.067 14.929 15.513C15.537 14.959 16.516 14.682 17.866 14.682L19.033 14.682L19.033 7.733C17.062 7.733 15.398 8.079 14.041 8.771C12.684 9.463 12.006 10.667 12.006 12.383L12.006 21H14.017ZM8.017 21L8.017 18C8.017 16.896 8.321 16.067 8.929 15.513C9.537 14.959 10.516 14.682 11.866 14.682L13.033 14.682L13.033 7.733C11.062 7.733 9.398 8.079 8.041 8.771C6.684 9.463 6.006 10.667 6.006 12.383L6.006 21H8.017Z" />
                   </svg>
                </div>
                <p className="text-xl md:text-2xl text-[#1A1A1A] mb-8 relative z-10 font-medium leading-relaxed tracking-tight">"{t.content}"</p>
                <div className="flex items-center gap-4">
                  <img src={t.avatar} alt={t.name} className="w-14 h-14 rounded-full border-2 border-white shadow-sm" />
                  <div>
                    <h5 className="font-bold text-[#1A1A1A]">{t.name}</h5>
                    <p className="text-sm text-[#666]">{t.role}, {t.company}</p>
                  </div>
                </div>
             </div>
          ))}
        </div>
      </div>
    </section>
  );
};