import React from 'react';
import { useScrollReveal } from '../../src/hooks/useScrollReveal';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'fade' | 'scale' | 'blur';
  delay?: number;
  duration?: number;
  threshold?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  threshold = 0.1,
}) => {
  const { ref, isVisible } = useScrollReveal({ threshold });

  const getAnimationStyles = () => {
    const baseStyles = {
      transition: `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      transitionDelay: `${delay}ms`,
    };

    const hiddenStyles: Record<string, React.CSSProperties> = {
      'fade-up': { opacity: 0, transform: 'translateY(40px)' },
      'fade-down': { opacity: 0, transform: 'translateY(-40px)' },
      'fade-left': { opacity: 0, transform: 'translateX(40px)' },
      'fade-right': { opacity: 0, transform: 'translateX(-40px)' },
      'fade': { opacity: 0 },
      'scale': { opacity: 0, transform: 'scale(0.9)' },
      'blur': { opacity: 0, filter: 'blur(10px)' },
    };

    const visibleStyles: React.CSSProperties = {
      opacity: 1,
      transform: 'translateY(0) translateX(0) scale(1)',
      filter: 'blur(0)',
    };

    return {
      ...baseStyles,
      ...(isVisible ? visibleStyles : hiddenStyles[animation]),
    };
  };

  return (
    <div ref={ref} className={className} style={getAnimationStyles()}>
      {children}
    </div>
  );
};

// Staggered container for multiple items
interface StaggeredRevealProps {
  children: React.ReactNode[];
  className?: string;
  childClassName?: string;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'fade' | 'scale';
  staggerDelay?: number;
  duration?: number;
}

export const StaggeredReveal: React.FC<StaggeredRevealProps> = ({
  children,
  className = '',
  childClassName = '',
  animation = 'fade-up',
  staggerDelay = 100,
  duration = 700,
}) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <div ref={ref} className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          className={childClassName}
          style={{
            transition: `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            transitionDelay: `${index * staggerDelay}ms`,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : animation === 'fade-up' ? 'translateY(30px)' : 'translateY(-30px)',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};
