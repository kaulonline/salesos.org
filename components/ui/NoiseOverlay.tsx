import React from 'react';

interface NoiseOverlayProps {
  opacity?: number;
  className?: string;
  blend?: 'overlay' | 'soft-light' | 'multiply' | 'screen';
}

export const NoiseOverlay: React.FC<NoiseOverlayProps> = ({
  opacity = 0.03,
  className = '',
  blend = 'overlay',
}) => {
  // SVG noise pattern encoded as data URI
  const noisePattern = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[9999] ${className}`}
      style={{
        backgroundImage: noisePattern,
        backgroundRepeat: 'repeat',
        opacity,
        mixBlendMode: blend,
      }}
    />
  );
};

// Grain animation variant (more dynamic)
export const AnimatedGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.04 }) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] animate-grain"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity,
      }}
    />
  );
};
