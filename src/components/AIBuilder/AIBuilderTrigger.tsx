/**
 * AI Builder Trigger Button
 * A button that opens the AI Builder modal
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIBuilderTriggerProps {
  onClick: () => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
}

export function AIBuilderTrigger({
  onClick,
  label = 'Create with AI',
  size = 'md',
  variant = 'secondary',
  className,
  disabled = false,
}: AIBuilderTriggerProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const variantClasses = {
    primary: 'bg-[#EAD07D] text-[#1A1A1A] hover:bg-[#d4bc6c] shadow-sm',
    secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#EAD07D]',
    ghost: 'text-gray-600 hover:text-[#1A1A1A] hover:bg-gray-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Sparkles className={cn('text-[#EAD07D]', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      <span>{label}</span>
    </button>
  );
}

export default AIBuilderTrigger;
