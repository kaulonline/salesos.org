/**
 * Admin badge utilities for status display
 */
import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { Star, Sparkles, Crown } from 'lucide-react';
import type { LicenseTier, PreGeneratedKeyStatus } from '../api/licensing';
import type { PaymentStatus } from '../api/payments';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'outline' | 'dark';

/**
 * Get status badge for user/entity status
 */
export const getStatusBadge = (status: string): React.ReactElement => {
  const variants: Record<string, BadgeVariant> = {
    ACTIVE: 'green',
    PENDING: 'yellow',
    SUSPENDED: 'red',
    INACTIVE: 'outline',
    TRIAL: 'yellow',
    EXPIRED: 'red',
    CANCELLED: 'outline',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

/**
 * Get role badge for user roles
 */
export const getRoleBadge = (role: string): React.ReactElement => {
  const variants: Record<string, BadgeVariant> = {
    ADMIN: 'dark',
    MANAGER: 'yellow',
    USER: 'outline',
    VIEWER: 'outline',
  };
  return <Badge variant={variants[role] || 'outline'} size="sm">{role}</Badge>;
};

/**
 * Get tier badge for license tiers
 */
export const getTierBadge = (tier: LicenseTier): React.ReactElement => {
  const config: Record<LicenseTier, { variant: BadgeVariant; icon?: React.ReactNode }> = {
    FREE: { variant: 'outline' },
    STARTER: { variant: 'yellow', icon: <Star size={10} /> },
    PROFESSIONAL: { variant: 'dark', icon: <Sparkles size={10} /> },
    ENTERPRISE: { variant: 'green', icon: <Crown size={10} /> },
    CUSTOM: { variant: 'dark' },
  };
  const { variant, icon } = config[tier] || { variant: 'outline' };
  return (
    <Badge variant={variant} size="sm" className="gap-1">
      {icon}
      {tier}
    </Badge>
  );
};

/**
 * Get key status badge for pre-generated license keys
 */
export const getKeyStatusBadge = (status: PreGeneratedKeyStatus): React.ReactElement => {
  const variants: Record<PreGeneratedKeyStatus, BadgeVariant> = {
    AVAILABLE: 'green',
    CLAIMED: 'yellow',
    EXPIRED: 'outline',
    REVOKED: 'red',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

/**
 * Get payment status badge
 */
export const getPaymentStatusBadge = (status: PaymentStatus): React.ReactElement => {
  const variants: Record<string, BadgeVariant> = {
    PENDING: 'yellow',
    COMPLETED: 'green',
    FAILED: 'red',
    REFUNDED: 'outline',
    CANCELLED: 'outline',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

/**
 * Get coupon status badge
 */
export const getCouponStatusBadge = (isActive: boolean, expiresAt?: string | null): React.ReactElement => {
  if (!isActive) {
    return <Badge variant="outline" size="sm">INACTIVE</Badge>;
  }
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return <Badge variant="red" size="sm">EXPIRED</Badge>;
  }
  return <Badge variant="green" size="sm">ACTIVE</Badge>;
};

/**
 * Get event status badge for outcome billing events
 */
export const getEventStatusBadge = (status: string): React.ReactElement => {
  const variants: Record<string, BadgeVariant> = {
    PENDING: 'yellow',
    APPROVED: 'green',
    BILLED: 'green',
    FLAGGED: 'yellow',
    WAIVED: 'outline',
    VOIDED: 'red',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

/**
 * Get invoice status badge
 */
export const getInvoiceStatusBadge = (status: string): React.ReactElement => {
  const variants: Record<string, BadgeVariant> = {
    DRAFT: 'outline',
    SENT: 'yellow',
    PAID: 'green',
    OVERDUE: 'red',
    VOID: 'outline',
    CANCELLED: 'outline',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

/**
 * Generic status color mapping for custom components
 */
export const STATUS_COLORS: Record<string, string> = {
  // Entity Status
  DRAFT: 'bg-[#F8F8F6] text-[#666]',
  PENDING: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-[#EAD07D]/30 text-[#1A1A1A]',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-[#93C01F]/20 text-[#93C01F]',
  COMPLETED: 'bg-[#93C01F]/20 text-[#93C01F]',
  CANCELLED: 'bg-red-100 text-red-700',
  // Payment Status
  PAID: 'bg-[#93C01F]/20 text-[#93C01F]',
  PARTIAL: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  REFUNDED: 'bg-orange-100 text-orange-700',
  FAILED: 'bg-red-100 text-red-700',
  // Generic
  ACTIVE: 'bg-[#93C01F]/20 text-[#93C01F]',
  INACTIVE: 'bg-[#F8F8F6] text-[#666]',
};
