import React from 'react';
import { Eye, Users } from 'lucide-react';
import { PresenceInfo } from '../../lib/collaborationSocket';
import { Avatar } from '../../../components/ui/Avatar';

export interface ActiveViewersProps {
  /** List of users currently viewing */
  viewers: PresenceInfo[];
  /** Maximum avatars to show before +N */
  maxAvatars?: number;
  /** Show count badge */
  showCount?: boolean;
  /** Size of avatars */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

export function ActiveViewers({
  viewers,
  maxAvatars = 3,
  showCount = true,
  size = 'sm',
  className = '',
}: ActiveViewersProps) {
  if (viewers.length === 0) {
    return null;
  }

  const visibleViewers = viewers.slice(0, maxAvatars);
  const remainingCount = Math.max(0, viewers.length - maxAvatars);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const overlapClasses = {
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Avatar Stack */}
      <div className="flex items-center">
        {visibleViewers.map((viewer, index) => (
          <div
            key={viewer.userId}
            className={`relative ${index > 0 ? overlapClasses[size] : ''}`}
            style={{ zIndex: visibleViewers.length - index }}
          >
            <Avatar
              src={viewer.avatarUrl}
              name={viewer.userName}
              size={size}
              className="ring-2 ring-white"
            />
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#93C01F] rounded-full ring-2 ring-white" />
          </div>
        ))}

        {/* +N more indicator */}
        {remainingCount > 0 && (
          <div
            className={`${overlapClasses[size]} ${sizeClasses[size]} rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-medium ring-2 ring-white`}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Viewer names tooltip on hover */}
      <div className="group relative ml-2">
        {showCount && (
          <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F6] rounded-full text-xs text-[#666]">
            <Eye size={12} />
            <span>{viewers.length} viewing</span>
          </div>
        )}

        {/* Tooltip with names */}
        <div className="hidden group-hover:block absolute z-50 top-full left-0 mt-1 p-2 bg-[#1A1A1A] text-white rounded-lg shadow-lg min-w-[140px]">
          <p className="text-xs font-medium text-white/60 mb-1">Currently viewing:</p>
          <ul className="space-y-1">
            {viewers.map((viewer) => (
              <li key={viewer.userId} className="text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#93C01F] rounded-full" />
                <span className="truncate">{viewer.userName}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for list items
 */
export function ActiveViewersBadge({
  viewers,
  className = '',
}: {
  viewers: PresenceInfo[];
  className?: string;
}) {
  if (viewers.length === 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-[#EAD07D]/20 text-[#1A1A1A] rounded-full text-xs ${className}`}
      title={`${viewers.length} user${viewers.length > 1 ? 's' : ''} viewing: ${viewers.map((v) => v.userName).join(', ')}`}
    >
      <Users size={10} />
      <span>{viewers.length}</span>
    </div>
  );
}

export default ActiveViewers;
