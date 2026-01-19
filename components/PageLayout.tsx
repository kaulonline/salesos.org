import React from 'react';

interface PageLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  narrow?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, subtitle, children, narrow = false }) => (
  <div className="pt-32 pb-20 px-6 min-h-screen bg-[#F2F1EA]">
    <div className="max-w-4xl mx-auto text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-[#1A1A1A] tracking-tight">{title}</h1>
      <p className="text-lg md:text-xl text-[#666] leading-relaxed">{subtitle}</p>
    </div>
    <div className={`${narrow ? 'max-w-4xl' : 'max-w-7xl'} mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200`}>
      {children}
    </div>
  </div>
);