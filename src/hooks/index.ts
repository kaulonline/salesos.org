export { useLeads, useLead } from './useLeads';
export { useDeals, useDeal } from './useDeals';
export { useCompanies, useCompany } from './useCompanies';
export { useContacts, useContact } from './useContacts';
export { useTasks } from './useTasks';
export { useActivities } from './useActivities';
export { useChat } from './useChat';
export { useDashboard } from './useDashboard';
export { useMeetings, useMeeting, useCalendarMeetings } from './useMeetings';

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
