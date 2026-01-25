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
export { default as importExportApi } from './importExport';
export { default as campaignsApi } from './campaigns';
export { default as productsApi } from './products';
export { default as notificationsApi } from './notifications';
export { default as teamMessagesApi } from './teamMessages';

// Re-export filter types
export type { LeadFilters } from './leads';
export type { OpportunityFilters } from './opportunities';
export type { AccountFilters } from './accounts';
export type { ContactFilters } from './contacts';
export type { TaskFilters } from './tasks';
export type { MeetingFilters } from './meetings';
export type { DashboardStats } from './dashboard';
export type { CampaignFilters } from './campaigns';
export type { ProductFilters, ProductStats, Product, CreateProductDto, UpdateProductDto, ProductType, ProductCategory, BillingFrequency } from './products';
export type { Notification, NotificationFilters, NotificationType, NotificationPriority, NotificationStatus } from './notifications';

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

// Re-export import/export types
export type {
  ImportEntityType,
  ExportEntityType,
  ExportFormat,
  FieldMapping,
  ImportOptions,
  ImportPreviewResult,
  ImportResult,
  ExportRequest,
  ExportResult,
  ExportFieldDefinition,
} from './importExport';
