import type { AccountType, AccountStatus, AccountRating, ChurnRisk } from '../../types';

export const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatCurrency = (value?: number) => {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 1000000 ? 'compact' : 'standard',
    maximumFractionDigits: 0,
  }).format(value);
};

export const getTypeLabel = (type?: AccountType): string => {
  if (!type) return 'Unknown';
  const labels: Record<AccountType, string> = {
    PROSPECT: 'Prospect',
    CUSTOMER: 'Customer',
    PARTNER: 'Partner',
    RESELLER: 'Reseller',
    COMPETITOR: 'Competitor',
    OTHER: 'Other',
  };
  return labels[type] || type;
};

export const getTypeVariant = (type?: AccountType): 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark' => {
  if (!type) return 'default';
  const variants: Record<AccountType, 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark'> = {
    PROSPECT: 'default',
    CUSTOMER: 'success',
    PARTNER: 'dark',
    RESELLER: 'yellow',
    COMPETITOR: 'warning',
    OTHER: 'default',
  };
  return variants[type] || 'default';
};

export const getStatusLabel = (status?: AccountStatus): string => {
  if (!status) return 'Active';
  const labels: Record<AccountStatus, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    PENDING: 'Pending',
    CHURNED: 'Churned',
    AT_RISK: 'At Risk',
  };
  return labels[status] || status;
};

export const getRatingLabel = (rating?: AccountRating): string => {
  if (!rating) return 'Not Rated';
  const labels: Record<AccountRating, string> = {
    HOT: 'Hot',
    WARM: 'Warm',
    COLD: 'Cold',
  };
  return labels[rating] || rating;
};

export const getChurnRiskLabel = (risk?: ChurnRisk): string => {
  if (!risk) return 'Unknown';
  const labels: Record<ChurnRisk, string> = {
    NONE: 'None',
    LOW: 'Low Risk',
    MEDIUM: 'Medium Risk',
    HIGH: 'High Risk',
  };
  return labels[risk] || risk;
};

export const getChurnRiskColor = (risk?: ChurnRisk): string => {
  if (!risk) return 'bg-gray-100 text-gray-600';
  const colors: Record<ChurnRisk, string> = {
    NONE: 'bg-gray-100 text-gray-600',
    LOW: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-red-100 text-red-700',
  };
  return colors[risk] || 'bg-gray-100 text-gray-600';
};

export const getHealthColor = (score?: number) => {
  if (!score) return { bg: 'bg-gray-100', text: 'text-[#666]', fill: 'bg-gray-300' };
  if (score >= 80) return { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', fill: 'bg-[#93C01F]' };
  if (score >= 60) return { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', fill: 'bg-[#EAD07D]' };
  if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-600', fill: 'bg-orange-400' };
  return { bg: 'bg-red-100', text: 'text-red-600', fill: 'bg-red-400' };
};

export const ACCOUNT_TYPES: AccountType[] = ['PROSPECT', 'CUSTOMER', 'PARTNER', 'RESELLER', 'COMPETITOR', 'OTHER'];
