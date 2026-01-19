import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circle' | 'rect';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const baseStyles = "animate-pulse bg-gray-200/80"; // Slightly transparent for better blending
  
  const variants = {
    default: "rounded-2xl",
    circle: "rounded-full",
    rect: "rounded-md",
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} />
  );
};