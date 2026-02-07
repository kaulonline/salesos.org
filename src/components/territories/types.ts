import { Globe, Building2, Factory, Layers, Map } from 'lucide-react';
import type { TerritoryType } from '../../types/territory';

export const typeLabels: Record<TerritoryType, string> = {
  GEOGRAPHIC: 'Geographic',
  NAMED_ACCOUNTS: 'Named Accounts',
  INDUSTRY: 'Industry',
  ACCOUNT_SIZE: 'Account Size',
  CUSTOM: 'Custom',
};

export const typeColors: Record<TerritoryType, string> = {
  GEOGRAPHIC: '#3B82F6',
  NAMED_ACCOUNTS: '#8B5CF6',
  INDUSTRY: '#10B981',
  ACCOUNT_SIZE: '#F59E0B',
  CUSTOM: '#EC4899',
};

export const typeIcons: Record<TerritoryType, React.ElementType> = {
  GEOGRAPHIC: Globe,
  NAMED_ACCOUNTS: Building2,
  INDUSTRY: Factory,
  ACCOUNT_SIZE: Layers,
  CUSTOM: Map,
};

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

export const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education',
  'Real Estate', 'Construction', 'Transportation', 'Energy', 'Media', 'Telecommunications',
  'Agriculture', 'Hospitality', 'Professional Services', 'Non-Profit', 'Government'
];

export const ACCOUNT_TYPES = ['Customer', 'Prospect', 'Partner', 'Competitor', 'Other'];

export interface CriteriaForm {
  states: string[];
  countries: string[];
  industries: string[];
  accountTypes: string[];
  minEmployees: string;
  maxEmployees: string;
  minRevenue: string;
  maxRevenue: string;
}

export const emptyCriteria: CriteriaForm = {
  states: [],
  countries: [],
  industries: [],
  accountTypes: [],
  minEmployees: '',
  maxEmployees: '',
  minRevenue: '',
  maxRevenue: '',
};

export const formatCurrency = (value: number | string | undefined | null) => {
  const num = Number(value) || 0;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
};

export const buildCriteria = (form: CriteriaForm) => {
  const criteria: Record<string, any> = {};
  if (form.states.length > 0) criteria.states = form.states;
  if (form.countries.length > 0) criteria.countries = form.countries;
  if (form.industries.length > 0) criteria.industries = form.industries;
  if (form.accountTypes.length > 0) criteria.accountTypes = form.accountTypes;
  if (form.minEmployees) criteria.minEmployees = parseInt(form.minEmployees);
  if (form.maxEmployees) criteria.maxEmployees = parseInt(form.maxEmployees);
  if (form.minRevenue) criteria.minRevenue = parseInt(form.minRevenue);
  if (form.maxRevenue) criteria.maxRevenue = parseInt(form.maxRevenue);
  return Object.keys(criteria).length > 0 ? criteria : undefined;
};

export const parseCriteria = (criteria: Record<string, any> | null | undefined): CriteriaForm => {
  if (!criteria) return emptyCriteria;
  return {
    states: criteria.states || [],
    countries: criteria.countries || [],
    industries: criteria.industries || [],
    accountTypes: criteria.accountTypes || [],
    minEmployees: criteria.minEmployees?.toString() || '',
    maxEmployees: criteria.maxEmployees?.toString() || '',
    minRevenue: criteria.minRevenue?.toString() || '',
    maxRevenue: criteria.maxRevenue?.toString() || '',
  };
};
