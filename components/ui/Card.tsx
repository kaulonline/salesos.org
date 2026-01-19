import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'yellow' | 'outline' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  variant = 'default', 
  padding = 'md', 
  className = '', 
  children, 
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden transition-all duration-300";
  
  const variants = {
    default: "bg-white rounded-[2rem] shadow-sm border border-black/5 hover:shadow-card",
    dark: "bg-[#1A1A1A] text-white rounded-[2rem] shadow-lg shadow-black/10",
    yellow: "bg-[#EAD07D] text-[#1A1A1A] rounded-[2rem] shadow-sm",
    outline: "bg-transparent border border-black/10 rounded-[2rem]",
    ghost: "bg-[#F8F8F6] rounded-[2rem] border border-transparent",
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};