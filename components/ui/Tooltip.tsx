import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div 
        className={`
          absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 
          bg-[#1A1A1A]/95 backdrop-blur-sm text-white text-[13px] leading-relaxed rounded-xl shadow-2xl border border-white/10
          transition-all duration-200 origin-bottom z-50 pointer-events-none
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}
        `}
        role="tooltip"
      >
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#1A1A1A]/95" />
      </div>
    </div>
  );
};