import type { OpportunityFilters } from '../api/opportunities';
import type { LeadFilters } from '../api/leads';
import type { ContactFilters } from '../api/contacts';
import type { AccountFilters } from '../api/accounts';
import type { TaskFilters } from '../api/tasks';
import type { MeetingFilters } from '../api/meetings';
import type { CampaignFilters } from '../api/campaigns';
import type { ProductFilters } from '../api/products';
import type { ActivityFilters } from '../types';

// Query keys factory for cache management
// This pattern ensures consistent cache keys across the application
// and enables fine-grained cache invalidation

export const queryKeys = {
  // Deals/Opportunities
  deals: {
    all: ['deals'] as const,
    lists: () => [...queryKeys.deals.all, 'list'] as const,
    list: (filters?: OpportunityFilters) => [...queryKeys.deals.lists(), filters] as const,
    details: () => [...queryKeys.deals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.deals.details(), id] as const,
    pipelineStats: () => [...queryKeys.deals.all, 'pipelineStats'] as const,
    forecast: () => [...queryKeys.deals.all, 'forecast'] as const,
    analysis: (id: string) => [...queryKeys.deals.all, 'analysis', id] as const,
    // Opportunity Contacts (Buyer Committee)
    contacts: (opportunityId: string) => [...queryKeys.deals.detail(opportunityId), 'contacts'] as const,
  },

  // Pipelines
  pipelines: {
    all: ['pipelines'] as const,
    lists: () => [...queryKeys.pipelines.all, 'list'] as const,
    list: () => [...queryKeys.pipelines.lists()] as const,
    details: () => [...queryKeys.pipelines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pipelines.details(), id] as const,
    default: () => [...queryKeys.pipelines.all, 'default'] as const,
    stages: (pipelineId: string) => [...queryKeys.pipelines.detail(pipelineId), 'stages'] as const,
  },

  // Leads
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (filters?: LeadFilters) => [...queryKeys.leads.lists(), filters] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
    stats: () => [...queryKeys.leads.all, 'stats'] as const,
  },

  // Contacts
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    list: (filters?: ContactFilters) => [...queryKeys.contacts.lists(), filters] as const,
    details: () => [...queryKeys.contacts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
    stats: () => [...queryKeys.contacts.all, 'stats'] as const,
    opportunities: (id: string) => [...queryKeys.contacts.detail(id), 'opportunities'] as const,
  },

  // Companies/Accounts
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (filters?: AccountFilters) => [...queryKeys.companies.lists(), filters] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    stats: () => [...queryKeys.companies.all, 'stats'] as const,
    hierarchy: (id: string) => [...queryKeys.companies.detail(id), 'hierarchy'] as const,
    revenue: (id: string) => [...queryKeys.companies.detail(id), 'revenue'] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters?: TaskFilters) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },

  // Meetings
  meetings: {
    all: ['meetings'] as const,
    lists: () => [...queryKeys.meetings.all, 'list'] as const,
    list: (filters?: MeetingFilters) => [...queryKeys.meetings.lists(), filters] as const,
    details: () => [...queryKeys.meetings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.meetings.details(), id] as const,
    calendar: (year: number, month: number) => [...queryKeys.meetings.all, 'calendar', year, month] as const,
    analysis: (id: string) => [...queryKeys.meetings.detail(id), 'analysis'] as const,
    insights: (id: string) => [...queryKeys.meetings.detail(id), 'insights'] as const,
  },

  // Activities
  activities: {
    all: ['activities'] as const,
    lists: () => [...queryKeys.activities.all, 'list'] as const,
    list: (filters?: ActivityFilters) => [...queryKeys.activities.lists(), filters] as const,
  },

  // Campaigns
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...queryKeys.campaigns.all, 'list'] as const,
    list: (filters?: CampaignFilters) => [...queryKeys.campaigns.lists(), filters] as const,
    details: () => [...queryKeys.campaigns.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.campaigns.details(), id] as const,
    stats: () => [...queryKeys.campaigns.all, 'stats'] as const,
    members: (campaignId: string) => [...queryKeys.campaigns.detail(campaignId), 'members'] as const,
    performance: (campaignId: string) => [...queryKeys.campaigns.detail(campaignId), 'performance'] as const,
    opportunities: (campaignId: string) => [...queryKeys.campaigns.detail(campaignId), 'opportunities'] as const,
    leads: (campaignId: string) => [...queryKeys.campaigns.detail(campaignId), 'leads'] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: ProductFilters) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    stats: () => [...queryKeys.products.all, 'stats'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    overview: () => [...queryKeys.dashboard.all, 'overview'] as const,
  },

  // AI Insights
  aiInsights: {
    all: ['aiInsights'] as const,
    deals: () => [...queryKeys.aiInsights.all, 'deals'] as const,
    leads: () => [...queryKeys.aiInsights.all, 'leads'] as const,
    dashboard: () => [...queryKeys.aiInsights.all, 'dashboard'] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    auditLogs: () => [...queryKeys.admin.all, 'auditLogs'] as const,
    systemConfig: () => [...queryKeys.admin.all, 'systemConfig'] as const,
    featureFlags: () => [...queryKeys.admin.all, 'featureFlags'] as const,
  },
} as const;

// Type helper for query key arrays
export type QueryKeys = typeof queryKeys;
