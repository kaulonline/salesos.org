import React from 'react';
import { Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  variant?: 'default' | 'filled';
}

export const Input: React.FC<InputProps> = ({ 
  icon, 
  variant = 'default',
  className = '', 
  ...props 
}) => {
  const baseStyles = "w-full rounded-full text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-[#EAD07D]";
  const variants = {
    default: "bg-white border-transparent py-2.5 shadow-sm placeholder-gray-400 text-[#1A1A1A]",
    filled: "bg-[#F8F8F6] border-transparent py-2.5 placeholder-gray-400 text-[#1A1A1A] hover:bg-gray-200",
  };

  const paddingLeft = icon ? "pl-10" : "pl-4";

  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
      )}
      <input 
        className={`${baseStyles} ${variants[variant]} ${paddingLeft} pr-4 ${className}`}
        {...props}
      />
    </div>
  );
};

export const SearchInput: React.FC<InputProps> = (props) => (
  <Input icon={<Search size={16} />} {...props} />
);
