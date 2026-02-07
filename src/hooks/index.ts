// Core data hooks (TanStack Query powered)
export { useLeads, useLead, useLeadsInfinite } from './useLeads';
export { useDeals, useDeal, useOpportunityContacts, useDealsInfinite } from './useDeals';
export { usePipelines, usePipeline } from './usePipelines';
export { useCompanies, useCompany } from './useCompanies';
export { useContacts, useContact } from './useContacts';
export { useTasks } from './useTasks';
export { useActivities } from './useActivities';
export { useChat } from './useChat';
export { useDashboard } from './useDashboard';
export { useMeetings, useMeeting, useCalendarMeetings } from './useMeetings';
export { useCampaigns, useCampaign, useCampaignOpportunities, useCampaignLeads } from './useCampaigns';
export { useProducts, useProduct } from './useProducts';
export { useNotifications } from './useNotifications';
export { useTeamChannels, useChannelMessages, useDirectConversations, useDirectMessages, useUserSearch } from './useTeamMessages';

// Admin hooks
export {
  useAdminDashboard,
  useAdminUsers,
  useFeatureFlags,
  useSystemConfig,
  useAuditLogs,
  useIntegrations,
} from './useAdmin';

// Licensing/Billing hooks
export {
  useLicensingDashboard,
  useLicenseTypes,
  useLicenseFeatures,
  useUserLicenses,
  usePreGeneratedKeys,
  useLicenseAuditLogs,
  useMyLicense,
} from './useLicensing';

// Payment & Billing hooks
export {
  useBillingCustomer,
  useSubscriptions,
  useInvoices,
  usePaymentMethods,
  useCheckout,
  usePaymentsDashboard,
  useTransactions,
  useCoupons,
  useGatewayConfigs,
} from './useBilling';

// Outcome-Based Billing hooks
export {
  useMyOutcomePlan,
  useMyOutcomeEvents,
  useMyOutcomeBillingStats,
  useAdminOutcomeDashboard,
  useAdminOutcomePlans,
  useAdminOutcomeEvents,
  useAdminOrganizationOutcomeStats,
} from './useOutcomeBilling';

// User settings hooks
export {
  useUserProfile,
  useUserPreferences,
  useEmailPreferences,
  usePrivacyPreferences,
  useQuotaProgress,
  useStorageUsage,
  usePasswordChange,
} from './useUserSettings';

// Pagination hooks
export { usePagination, useCursorPagination } from './usePagination';

// Search and utility hooks
export { useDebounce, useDebouncedCallback, useThrottle } from './useDebounce';
export { useServerSearch, useGlobalSearch, useSearchSuggestions } from './useServerSearch';

// Form validation hooks
export { useFormValidation } from './useFormValidation';

// Real-time sync hooks
export {
  useWebSocketConnection,
  useWebSocketMessage,
  useEntityUpdates,
  usePresence,
  useRealtimeNotifications,
  useTypingIndicator,
} from './useRealtimeSync';

// AI Experience hooks
export { useCommandCenter } from './useCommandCenter';
export { useAIInsights, useDealInsights, useLeadInsights } from './useAIInsights';
export { useSmartCapture } from './useSmartCapture';
export { useAgentAlerts, useAgentQueue, useAgentTrigger, agentAlertKeys } from './useAgentAlerts';

// Knowledge Base / PageIndex hooks
export {
  usePageIndexHealth,
  usePageIndexDocuments,
  usePageIndexDocument,
  usePageIndexStatus,
  useUploadDocument,
  useDeleteDocument,
  useSearchDocument,
  useSearchMutation,
  useSearchAllMutation,
  pageIndexKeys,
} from './usePageIndex';
export {
  useMeetingBriefing,
  useMeetingAnalysis,
  useUpcomingMeetingsForPrep,
} from './useMeetingIntelligence';

// Offline support hooks
export { useOfflineSync, useOfflineStatus, useStorageStats } from './useOfflineSync';

// Reporting & Analytics hooks
export {
  useWinRateReport,
  usePipelineReport,
  useForecastData,
  useCpqDashboard,
} from './useReporting';

// Territory Management hooks
export { useTerritories, useTerritory } from './useTerritories';

// Playbook Management hooks
export {
  usePlaybooks,
  usePlaybook,
  usePlaybookExecutions,
  usePlaybookExecution,
} from './usePlaybooks';

// Real-time Collaboration hooks
export { useEntityLock } from './useEntityLock';
export { useEntityPresence } from './useEntityPresence';
