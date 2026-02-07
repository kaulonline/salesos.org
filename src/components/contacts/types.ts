import type { ContactRole, SeniorityLevel, BuyingPower, InfluenceLevel, ContactStatus } from '../../types';

export const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getRoleLabel = (role?: ContactRole): string => {
  if (!role) return 'Unknown';
  const labels: Record<ContactRole, string> = {
    CHAMPION: 'Champion',
    ECONOMIC_BUYER: 'Economic Buyer',
    DECISION_MAKER: 'Decision Maker',
    INFLUENCER: 'Influencer',
    END_USER: 'End User',
    GATEKEEPER: 'Gatekeeper',
    BLOCKER: 'Blocker',
    TECHNICAL_BUYER: 'Technical Buyer',
  };
  return labels[role] || role;
};

export const getRoleVariant = (role?: ContactRole): 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark' => {
  if (!role) return 'default';
  const variants: Record<ContactRole, 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark'> = {
    CHAMPION: 'success',
    ECONOMIC_BUYER: 'yellow',
    DECISION_MAKER: 'dark',
    INFLUENCER: 'default',
    END_USER: 'default',
    GATEKEEPER: 'warning',
    BLOCKER: 'danger',
    TECHNICAL_BUYER: 'default',
  };
  return variants[role] || 'default';
};

export const getSeniorityLabel = (seniority?: SeniorityLevel): string => {
  if (!seniority) return 'Unknown';
  const labels: Record<SeniorityLevel, string> = {
    IC: 'Individual Contributor',
    MANAGER: 'Manager',
    SENIOR_MANAGER: 'Senior Manager',
    DIRECTOR: 'Director',
    SENIOR_DIRECTOR: 'Senior Director',
    VP: 'Vice President',
    SVP: 'Senior Vice President',
    C_LEVEL: 'C-Level',
    BOARD: 'Board Member',
    OWNER: 'Owner',
  };
  return labels[seniority] || seniority;
};

export const getBuyingPowerLabel = (power?: BuyingPower): string => {
  if (!power) return 'Unknown';
  const labels: Record<BuyingPower, string> = {
    NONE: 'None',
    INFLUENCER: 'Influencer',
    RECOMMENDER: 'Recommender',
    DECISION_MAKER: 'Decision Maker',
    BUDGET_HOLDER: 'Budget Holder',
  };
  return labels[power] || power;
};

export const getInfluenceColor = (level?: InfluenceLevel): string => {
  if (!level) return 'bg-gray-100 text-gray-600';
  const colors: Record<InfluenceLevel, string> = {
    HIGH: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-gray-100 text-gray-600',
  };
  return colors[level] || 'bg-gray-100 text-gray-600';
};

export const getStatusLabel = (status?: ContactStatus): string => {
  if (!status) return 'Active';
  const labels: Record<ContactStatus, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    BOUNCED: 'Bounced',
    UNSUBSCRIBED: 'Unsubscribed',
  };
  return labels[status] || status;
};

export const CONTACT_ROLES: ContactRole[] = [
  'CHAMPION',
  'ECONOMIC_BUYER',
  'DECISION_MAKER',
  'INFLUENCER',
  'END_USER',
  'GATEKEEPER',
  'BLOCKER',
  'TECHNICAL_BUYER',
];

export const SENIORITY_LEVELS: SeniorityLevel[] = [
  'IC',
  'MANAGER',
  'SENIOR_MANAGER',
  'DIRECTOR',
  'SENIOR_DIRECTOR',
  'VP',
  'SVP',
  'C_LEVEL',
  'BOARD',
  'OWNER',
];

export const calculateDaysSinceContact = (lastContactedAt?: string): number | null => {
  if (!lastContactedAt) return null;
  return Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
};
