import React from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  border?: boolean;
}

const getInitials = (name?: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User",
  name,
  fallback,
  size = 'md',
  className = '',
  border = false
}) => {
  const displayFallback = fallback || getInitials(name);
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  const borderStyles = border ? "border-2 border-white shadow-sm" : "";

  return (
    <div className={`relative rounded-full overflow-hidden bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] font-bold ${sizes[size]} ${borderStyles} ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{displayFallback}</span>
      )}
    </div>
  );
};