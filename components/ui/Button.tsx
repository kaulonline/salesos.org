import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#F2F1EA] disabled:opacity-50 disabled:cursor-not-allowed tracking-tight";
  
  const variants = {
    // Primary is now the Dark Action button
    primary: "bg-[#1A1A1A] text-white hover:bg-black shadow-lg shadow-black/10",
    // Secondary is the Yellow Accent button
    secondary: "bg-[#EAD07D] text-[#1A1A1A] hover:bg-[#E5C973] shadow-lg shadow-[#EAD07D]/20",
    // Outline matches the dark theme text
    outline: "border border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5 backdrop-blur-sm",
    ghost: "text-[#666] hover:text-[#1A1A1A] hover:bg-black/5",
  };

  const sizes = {
    sm: "px-5 py-2 text-sm",
    md: "px-7 py-3 text-[15px]",
    lg: "px-9 py-4 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};