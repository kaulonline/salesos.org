export { default as client } from './client';
export { default as authApi } from './auth';
export { default as leadsApi } from './leads';
export { default as opportunitiesApi } from './opportunities';
export { default as accountsApi } from './accounts';
export { default as contactsApi } from './contacts';
export { default as tasksApi } from './tasks';
export { default as activitiesApi } from './activities';
export { default as conversationsApi } from './conversations';
export { default as meetingsApi } from './meetings';
export { default as dashboardApi } from './dashboard';
export { default as adminApi } from './admin';
export { default as usersApi } from './users';

// Re-export filter types
export type { LeadFilters } from './leads';
export type { OpportunityFilters } from './opportunities';
export type { AccountFilters } from './accounts';
export type { ContactFilters } from './contacts';
export type { TaskFilters } from './tasks';
export type { MeetingFilters } from './meetings';
export type { DashboardStats } from './dashboard';

// Re-export admin types
export type {
  AdminDashboardStats,
  AdminUser,
  SystemConfig,
  FeatureFlag,
  AuditLog,
  ApplicationLog,
  Integration,
} from './admin';

// Re-export user types
export type {
  UserProfile,
  UserPreferences,
  EmailPreferences,
  PrivacyPreferences,
  QuotaProgress,
  StorageUsage,
} from './users';
