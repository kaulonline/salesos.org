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

  // Custom Fields
  customFields: {
    all: ['customFields'] as const,
    lists: () => [...queryKeys.customFields.all, 'list'] as const,
    list: (filters?: { entity?: string }) => [...queryKeys.customFields.lists(), filters] as const,
    byEntity: (entity: string) => [...queryKeys.customFields.all, 'entity', entity] as const,
    detail: (id: string) => [...queryKeys.customFields.all, 'detail', id] as const,
    stats: () => [...queryKeys.customFields.all, 'stats'] as const,
  },

  // Profiles & Permissions
  profiles: {
    all: ['profiles'] as const,
    lists: () => [...queryKeys.profiles.all, 'list'] as const,
    list: (filters?: { isSystem?: boolean }) => [...queryKeys.profiles.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.profiles.all, 'detail', id] as const,
    users: (profileId: string) => [...queryKeys.profiles.detail(profileId), 'users'] as const,
    modules: () => [...queryKeys.profiles.all, 'modules'] as const,
    stats: () => [...queryKeys.profiles.all, 'stats'] as const,
  },

  // Two-Factor Authentication
  twoFactor: {
    all: ['twoFactor'] as const,
    status: () => [...queryKeys.twoFactor.all, 'status'] as const,
    backupCodes: () => [...queryKeys.twoFactor.all, 'backupCodes'] as const,
    trustedDevices: () => [...queryKeys.twoFactor.all, 'trustedDevices'] as const,
    enforcementSettings: () => [...queryKeys.twoFactor.all, 'enforcement'] as const,
  },

  // Price Books
  priceBooks: {
    all: ['priceBooks'] as const,
    lists: () => [...queryKeys.priceBooks.all, 'list'] as const,
    list: (filters?: { isActive?: boolean; currency?: string }) => [...queryKeys.priceBooks.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.priceBooks.all, 'detail', id] as const,
    entries: (priceBookId: string) => [...queryKeys.priceBooks.detail(priceBookId), 'entries'] as const,
    standard: () => [...queryKeys.priceBooks.all, 'standard'] as const,
    stats: () => [...queryKeys.priceBooks.all, 'stats'] as const,
  },

  // Quotes
  quotes: {
    all: ['quotes'] as const,
    lists: () => [...queryKeys.quotes.all, 'list'] as const,
    list: (filters?: { status?: string; opportunityId?: string }) => [...queryKeys.quotes.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.quotes.all, 'detail', id] as const,
    byOpportunity: (opportunityId: string) => [...queryKeys.quotes.all, 'opportunity', opportunityId] as const,
    stats: () => [...queryKeys.quotes.all, 'stats'] as const,
  },

  // Email Templates
  emailTemplates: {
    all: ['emailTemplates'] as const,
    lists: () => [...queryKeys.emailTemplates.all, 'list'] as const,
    list: (filters?: { category?: string; isActive?: boolean }) => [...queryKeys.emailTemplates.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.emailTemplates.all, 'detail', id] as const,
    mergeFields: () => [...queryKeys.emailTemplates.all, 'mergeFields'] as const,
    stats: () => [...queryKeys.emailTemplates.all, 'stats'] as const,
  },

  // Email Tracking
  emailTracking: {
    all: ['emailTracking'] as const,
    lists: () => [...queryKeys.emailTracking.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...queryKeys.emailTracking.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.emailTracking.all, 'detail', id] as const,
    byEntity: (entityType: string, entityId: string) => [...queryKeys.emailTracking.all, 'entity', entityType, entityId] as const,
    stats: () => [...queryKeys.emailTracking.all, 'stats'] as const,
  },

  // Assignment Rules
  assignmentRules: {
    all: ['assignmentRules'] as const,
    lists: () => [...queryKeys.assignmentRules.all, 'list'] as const,
    list: (filters?: { entity?: string; isActive?: boolean }) => [...queryKeys.assignmentRules.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.assignmentRules.all, 'detail', id] as const,
    fields: (entity: string) => [...queryKeys.assignmentRules.all, 'fields', entity] as const,
    stats: () => [...queryKeys.assignmentRules.all, 'stats'] as const,
  },

  // Web Forms
  webForms: {
    all: ['webForms'] as const,
    lists: () => [...queryKeys.webForms.all, 'list'] as const,
    list: (filters?: { isActive?: boolean }) => [...queryKeys.webForms.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.webForms.all, 'detail', id] as const,
    submissions: (formId: string) => [...queryKeys.webForms.detail(formId), 'submissions'] as const,
    embedCode: (formId: string) => [...queryKeys.webForms.detail(formId), 'embedCode'] as const,
    stats: () => [...queryKeys.webForms.all, 'stats'] as const,
  },

  // API Keys
  apiKeys: {
    all: ['apiKeys'] as const,
    lists: () => [...queryKeys.apiKeys.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...queryKeys.apiKeys.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.apiKeys.all, 'detail', id] as const,
    usage: () => [...queryKeys.apiKeys.all, 'usage'] as const,
    keyUsage: (keyId: string) => [...queryKeys.apiKeys.detail(keyId), 'usage'] as const,
  },

  // Webhooks
  webhooks: {
    all: ['webhooks'] as const,
    lists: () => [...queryKeys.webhooks.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...queryKeys.webhooks.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.webhooks.all, 'detail', id] as const,
    logs: (webhookId: string) => [...queryKeys.webhooks.detail(webhookId), 'logs'] as const,
    events: () => [...queryKeys.webhooks.all, 'events'] as const,
    stats: () => [...queryKeys.webhooks.all, 'stats'] as const,
  },

  // Discount Rules
  discountRules: {
    all: ['discountRules'] as const,
    lists: () => [...queryKeys.discountRules.all, 'list'] as const,
    list: (filters?: { type?: string; isActive?: boolean }) => [...queryKeys.discountRules.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.discountRules.all, 'detail', id] as const,
    applicable: (quoteId: string) => [...queryKeys.discountRules.all, 'applicable', quoteId] as const,
    stats: () => [...queryKeys.discountRules.all, 'stats'] as const,
  },

  // Tax Rates
  taxRates: {
    all: ['taxRates'] as const,
    lists: () => [...queryKeys.taxRates.all, 'list'] as const,
    list: (filters?: { country?: string; taxType?: string; isActive?: boolean }) => [...queryKeys.taxRates.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.taxRates.all, 'detail', id] as const,
    byCountry: (country: string) => [...queryKeys.taxRates.all, 'country', country] as const,
    default: (country: string, region?: string) => [...queryKeys.taxRates.all, 'default', country, region] as const,
    stats: () => [...queryKeys.taxRates.all, 'stats'] as const,
  },

  // Approval Workflows
  approvalWorkflows: {
    all: ['approvalWorkflows'] as const,
    lists: () => [...queryKeys.approvalWorkflows.all, 'list'] as const,
    list: (filters?: { entity?: string; isActive?: boolean }) => [...queryKeys.approvalWorkflows.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.approvalWorkflows.all, 'detail', id] as const,
    byEntity: (entity: string) => [...queryKeys.approvalWorkflows.all, 'entity', entity] as const,
    check: (entityType: string, entityId: string) => [...queryKeys.approvalWorkflows.all, 'check', entityType, entityId] as const,
    stats: () => [...queryKeys.approvalWorkflows.all, 'stats'] as const,
  },

  // Approval Requests
  approvalRequests: {
    all: ['approvalRequests'] as const,
    lists: () => [...queryKeys.approvalRequests.all, 'list'] as const,
    list: (filters?: { entityType?: string; status?: string }) => [...queryKeys.approvalRequests.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.approvalRequests.all, 'detail', id] as const,
    pending: () => [...queryKeys.approvalRequests.all, 'pending'] as const,
    forEntity: (entityType: string, entityId: string) => [...queryKeys.approvalRequests.all, 'entity', entityType, entityId] as const,
    history: (entityType: string, entityId: string) => [...queryKeys.approvalRequests.all, 'history', entityType, entityId] as const,
  },

  // Quote Versions
  quoteVersions: {
    all: ['quoteVersions'] as const,
    list: (quoteId: string, filters?: { createdById?: string }) => [...queryKeys.quoteVersions.all, quoteId, 'list', filters] as const,
    detail: (quoteId: string, versionId: string) => [...queryKeys.quoteVersions.all, quoteId, 'detail', versionId] as const,
    latest: (quoteId: string) => [...queryKeys.quoteVersions.all, quoteId, 'latest'] as const,
    count: (quoteId: string) => [...queryKeys.quoteVersions.all, quoteId, 'count'] as const,
    changesSince: (quoteId: string, versionId: string) => [...queryKeys.quoteVersions.all, quoteId, 'changesSince', versionId] as const,
    stats: () => [...queryKeys.quoteVersions.all, 'stats'] as const,
  },

  // E-Signature (Phase 4)
  esignature: {
    all: ['esignature'] as const,
    lists: () => [...queryKeys.esignature.all, 'list'] as const,
    list: (filters?: { status?: string; provider?: string; quoteId?: string }) => [...queryKeys.esignature.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.esignature.all, 'detail', id] as const,
    byQuote: (quoteId: string) => [...queryKeys.esignature.all, 'quote', quoteId] as const,
    stats: () => [...queryKeys.esignature.all, 'stats'] as const,
    providers: () => [...queryKeys.esignature.all, 'providers'] as const,
    signingUrl: (requestId: string, signerId: string) => [...queryKeys.esignature.all, 'signingUrl', requestId, signerId] as const,
  },

  // Orders (Phase 4)
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: { status?: string; accountId?: string }) => [...queryKeys.orders.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
    byAccount: (accountId: string) => [...queryKeys.orders.all, 'account', accountId] as const,
    byQuote: (quoteId: string) => [...queryKeys.orders.all, 'quote', quoteId] as const,
    timeline: (id: string) => [...queryKeys.orders.detail(id), 'timeline'] as const,
    stats: () => [...queryKeys.orders.all, 'stats'] as const,
  },

  // CPQ Analytics (Phase 4)
  cpqAnalytics: {
    all: ['cpqAnalytics'] as const,
    dashboard: (filters?: { startDate?: string; endDate?: string }) => [...queryKeys.cpqAnalytics.all, 'dashboard', filters] as const,
    trends: (filters?: { startDate?: string; endDate?: string; groupBy?: string }) => [...queryKeys.cpqAnalytics.all, 'trends', filters] as const,
    quotePipeline: () => [...queryKeys.cpqAnalytics.all, 'quotePipeline'] as const,
    topProducts: (limit?: number, sortBy?: string) => [...queryKeys.cpqAnalytics.all, 'topProducts', limit, sortBy] as const,
    topAccounts: (limit?: number) => [...queryKeys.cpqAnalytics.all, 'topAccounts', limit] as const,
    salesRepPerformance: (filters?: { startDate?: string; endDate?: string }) => [...queryKeys.cpqAnalytics.all, 'salesRepPerformance', filters] as const,
    forecast: (periods?: number) => [...queryKeys.cpqAnalytics.all, 'forecast', periods] as const,
    snapshots: (filters?: { startDate?: string; endDate?: string }) => [...queryKeys.cpqAnalytics.all, 'snapshots', filters] as const,
    conversionFunnel: (filters?: { startDate?: string; endDate?: string }) => [...queryKeys.cpqAnalytics.all, 'conversionFunnel', filters] as const,
    winLoss: (filters?: { startDate?: string; endDate?: string }) => [...queryKeys.cpqAnalytics.all, 'winLoss', filters] as const,
  },
  // Territories
  territories: {
    all: ['territories'] as const,
    lists: () => [...queryKeys.territories.all, 'list'] as const,
    list: () => [...queryKeys.territories.lists()] as const,
    details: () => [...queryKeys.territories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.territories.details(), id] as const,
    accounts: (id: string) => [...queryKeys.territories.detail(id), 'accounts'] as const,
    stats: () => [...queryKeys.territories.all, 'stats'] as const,
  },

  // Playbooks
  playbooks: {
    all: ['playbooks'] as const,
    lists: () => [...queryKeys.playbooks.all, 'list'] as const,
    list: (filters?: { isActive?: boolean; trigger?: string }) => [...queryKeys.playbooks.lists(), filters] as const,
    details: () => [...queryKeys.playbooks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.playbooks.details(), id] as const,
    stats: () => [...queryKeys.playbooks.all, 'stats'] as const,
    executions: () => [...queryKeys.playbooks.all, 'executions'] as const,
    executionsList: (filters?: { playbookId?: string; dealId?: string; status?: string }) => [...queryKeys.playbooks.executions(), 'list', filters] as const,
    execution: (id: string) => [...queryKeys.playbooks.executions(), 'detail', id] as const,
  },
  // Duplicates
  duplicates: {
    all: ['duplicates'] as const,
    lists: () => [...queryKeys.duplicates.all, 'list'] as const,
    list: (filters?: { entityType?: string; status?: string }) => [...queryKeys.duplicates.lists(), filters] as const,
    details: () => [...queryKeys.duplicates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.duplicates.details(), id] as const,
  },

  // Entity field changes
  entityFieldChanges: {
    all: ['entityFieldChanges'] as const,
    list: (entityType: string, entityId: string) => [...queryKeys.entityFieldChanges.all, entityType, entityId] as const,
  },
} as const;

// Type helper for query key arrays
export type QueryKeys = typeof queryKeys;
