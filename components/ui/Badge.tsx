import React from 'react';
import { cn } from '../../utils/cn'; // Assuming you might have a utility, otherwise I'll stick to template literals

interface BadgeProps {
  variant?: 'neutral' | 'dark' | 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'neutral', 
  size = 'md',
  dot = false, 
  className = '', 
  children 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-full whitespace-nowrap";
  
  const variants = {
    neutral: "bg-[#F8F8F6] text-[#666]",
    dark: "bg-[#1A1A1A] text-white",
    yellow: "bg-[#EAD07D] text-[#1A1A1A]",
    green: "bg-[#93C01F]/10 text-[#5a7a0c]",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    outline: "bg-transparent border border-black/10 text-[#666]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${variant === 'dark' ? 'bg-white' : 'bg-current'}`} />
      )}
      {children}
    </span>
  );
};