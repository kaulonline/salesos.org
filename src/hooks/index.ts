// Core data hooks (TanStack Query powered)
export { useLeads, useLead } from './useLeads';
export { useDeals, useDeal, useOpportunityContacts } from './useDeals';
export { useCompanies, useCompany } from './useCompanies';
export { useContacts, useContact } from './useContacts';
export { useTasks } from './useTasks';
export { useActivities } from './useActivities';
export { useChat } from './useChat';
export { useDashboard } from './useDashboard';
export { useMeetings, useMeeting, useCalendarMeetings } from './useMeetings';
export { useCampaigns, useCampaign, useCampaignOpportunities, useCampaignLeads } from './useCampaigns';

// Admin hooks
export {
  useAdminDashboard,
  useAdminUsers,
  useFeatureFlags,
  useSystemConfig,
  useAuditLogs,
  useIntegrations,
} from './useAdmin';

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
export {
  useMeetingBriefing,
  useMeetingAnalysis,
  useUpcomingMeetingsForPrep,
} from './useMeetingIntelligence';

// Offline support hooks
export { useOfflineSync, useOfflineStatus, useStorageStats } from './useOfflineSync';
