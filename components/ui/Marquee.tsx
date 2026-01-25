import React from 'react';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  gap?: number;
}

export const Marquee: React.FC<MarqueeProps> = ({
  children,
  className = '',
  speed = 40,
  direction = 'left',
  pauseOnHover = true,
  gap = 48,
}) => {
  const animationDirection = direction === 'left' ? 'normal' : 'reverse';

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div
        className={`flex ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationDirection,
          gap: `${gap}px`,
        }}
      >
        {/* Original items */}
        <div className="flex shrink-0" style={{ gap: `${gap}px` }}>
          {children}
        </div>
        {/* Duplicate for seamless loop */}
        <div className="flex shrink-0" style={{ gap: `${gap}px` }}>
          {children}
        </div>
        {/* Third set for extra smoothness */}
        <div className="flex shrink-0" style={{ gap: `${gap}px` }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Vertical marquee variant
interface VerticalMarqueeProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
  pauseOnHover?: boolean;
}

export const VerticalMarquee: React.FC<VerticalMarqueeProps> = ({
  children,
  className = '',
  speed = 30,
  direction = 'up',
  pauseOnHover = true,
}) => {
  const animationDirection = direction === 'up' ? 'normal' : 'reverse';

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div
        className={`flex flex-col ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
        style={{
          animation: `marquee-vertical ${speed}s linear infinite`,
          animationDirection,
        }}
      >
        <div className="flex flex-col gap-4">
          {children}
        </div>
        <div className="flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
};
