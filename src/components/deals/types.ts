import type { OpportunityStage, OpportunityContactRole, OpportunityType, Opportunity } from '../../types';

// All available stages in order
export const STAGES: OpportunityStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'NEEDS_ANALYSIS',
  'VALUE_PROPOSITION',
  'DECISION_MAKERS_IDENTIFIED',
  'PERCEPTION_ANALYSIS',
  'PROPOSAL_PRICE_QUOTE',
  'NEGOTIATION_REVIEW',
  'CLOSED_WON',
  'CLOSED_LOST',
];

export const OPPORTUNITY_TYPES: OpportunityType[] = [
  'NEW_BUSINESS',
  'EXISTING_BUSINESS',
  'RENEWAL',
  'UPSELL',
  'CROSS_SELL',
];

export const OPPORTUNITY_CONTACT_ROLES: OpportunityContactRole[] = [
  'DECISION_MAKER',
  'ECONOMIC_BUYER',
  'CHAMPION',
  'INFLUENCER',
  'TECHNICAL_BUYER',
  'END_USER',
  'EVALUATOR',
  'GATEKEEPER',
  'LEGAL',
  'PROCUREMENT',
  'BLOCKER',
  'OTHER',
];

export interface EditFormData {
  name: string;
  amount: number;
  probability: number;
  closeDate: string;
  stage: OpportunityStage;
  type: OpportunityType;
  nextStep: string;
  needsAnalysis: string;
}

// Formatting utilities
export const formatCurrency = (amount?: number) => {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactCurrency = (amount?: number) => {
  if (!amount) return '0';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
};

export const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateForInput = (date?: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const getStageLabel = (stage: OpportunityStage) => {
  const labels: Record<OpportunityStage, string> = {
    'PROSPECTING': 'Prospecting',
    'QUALIFICATION': 'Qualification',
    'NEEDS_ANALYSIS': 'Needs Analysis',
    'VALUE_PROPOSITION': 'Value Proposition',
    'DECISION_MAKERS_IDENTIFIED': 'Decision Makers',
    'PERCEPTION_ANALYSIS': 'Perception Analysis',
    'PROPOSAL_PRICE_QUOTE': 'Proposal',
    'NEGOTIATION_REVIEW': 'Negotiation',
    'CLOSED_WON': 'Closed Won',
    'CLOSED_LOST': 'Closed Lost',
  };
  return labels[stage] || stage;
};

export const getStageIndex = (stage: OpportunityStage): number => {
  return STAGES.indexOf(stage);
};

export const calculateDaysInStage = (lastActivityDate?: string) => {
  if (!lastActivityDate) return 0;
  const now = new Date();
  const lastActivity = new Date(lastActivityDate);
  const diffDays = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getRoleLabel = (role: OpportunityContactRole) => {
  const labels: Record<OpportunityContactRole, string> = {
    'DECISION_MAKER': 'Decision Maker',
    'ECONOMIC_BUYER': 'Economic Buyer',
    'CHAMPION': 'Champion',
    'INFLUENCER': 'Influencer',
    'TECHNICAL_BUYER': 'Technical Buyer',
    'END_USER': 'End User',
    'BLOCKER': 'Blocker',
    'EVALUATOR': 'Evaluator',
    'GATEKEEPER': 'Gatekeeper',
    'LEGAL': 'Legal',
    'PROCUREMENT': 'Procurement',
    'OTHER': 'Other',
  };
  return labels[role] || role;
};
