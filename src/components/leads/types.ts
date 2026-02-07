import type { LeadStatus, LeadRating, LeadSource, Lead } from '../../types';

// Status options
export const LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'NURTURING',
  'CONVERTED',
  'LOST',
];

// Rating options
export const LEAD_RATINGS: LeadRating[] = ['HOT', 'WARM', 'COLD'];

// Formatting utilities
export const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatCurrency = (amount?: number) => {
  if (!amount) return 'Not set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getStatusLabel = (status: LeadStatus): string => {
  const labels: Record<LeadStatus, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    QUALIFIED: 'Qualified',
    UNQUALIFIED: 'Unqualified',
    NURTURING: 'Nurturing',
    CONVERTED: 'Converted',
    LOST: 'Lost',
  };
  return labels[status] || status;
};

export const getStatusVariant = (status: LeadStatus): 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark' => {
  const variants: Record<LeadStatus, 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark'> = {
    NEW: 'yellow',
    CONTACTED: 'default',
    QUALIFIED: 'success',
    UNQUALIFIED: 'danger',
    NURTURING: 'warning',
    CONVERTED: 'success',
    LOST: 'danger',
  };
  return variants[status] || 'default';
};

export const getRatingLabel = (rating?: LeadRating): string => {
  if (!rating) return 'Unrated';
  const labels: Record<LeadRating, string> = {
    HOT: 'Hot',
    WARM: 'Warm',
    COLD: 'Cold',
  };
  return labels[rating] || rating;
};

export const getRatingColor = (rating?: LeadRating): string => {
  if (!rating) return 'bg-[#F8F8F6] text-[#666]';
  const colors: Record<LeadRating, string> = {
    HOT: 'bg-[#EAD07D] text-[#1A1A1A]',
    WARM: 'bg-[#EAD07D]/40 text-[#1A1A1A]',
    COLD: 'bg-[#1A1A1A]/10 text-[#1A1A1A]',
  };
  return colors[rating] || 'bg-[#F8F8F6] text-[#666]';
};

export const getSourceLabel = (source?: LeadSource): string => {
  if (!source) return 'Unknown';
  const labels: Record<LeadSource, string> = {
    WEB: 'Website',
    PHONE_INQUIRY: 'Phone Inquiry',
    PARTNER_REFERRAL: 'Partner Referral',
    PURCHASED_LIST: 'Purchased List',
    EXTERNAL_REFERRAL: 'External Referral',
    EMPLOYEE_REFERRAL: 'Employee Referral',
    TRADE_SHOW: 'Trade Show',
    WEB_FORM: 'Web Form',
    SOCIAL_MEDIA: 'Social Media',
    EMAIL_CAMPAIGN: 'Email Campaign',
    WEBINAR: 'Webinar',
    COLD_CALL: 'Cold Call',
    OTHER: 'Other',
  };
  return labels[source] || source;
};

export const calculateDaysSinceContact = (lastContactedAt?: string): number | null => {
  if (!lastContactedAt) return null;
  return Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
};
