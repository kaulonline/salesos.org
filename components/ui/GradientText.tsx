import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animate?: boolean;
  animationDuration?: number;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  colors = ['#EAD07D', '#D4A853', '#EAD07D'],
  animate = false,
  animationDuration = 3,
}) => {
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;

  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${animate ? 'animate-gradient-x' : ''} ${className}`}
      style={{
        backgroundImage: gradient,
        backgroundSize: animate ? '200% 100%' : '100% 100%',
        animationDuration: animate ? `${animationDuration}s` : undefined,
      }}
    >
      {children}
    </span>
  );
};

// Shimmering text variant
export const ShimmerText: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <span
      className={`relative inline-block ${className}`}
      style={{
        background: 'linear-gradient(90deg, #1A1A1A 0%, #1A1A1A 40%, #EAD07D 50%, #1A1A1A 60%, #1A1A1A 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shimmer 2s infinite linear',
      }}
    >
      {children}
    </span>
  );
};
