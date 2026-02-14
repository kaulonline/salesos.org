import client from './client';

// Types for Admin API
export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    byRole: Record<string, number>;
  };
  conversations: {
    total: number;
    thisMonth: number;
    avgPerUser: number;
  };
  meetings: {
    total: number;
    thisMonth: number;
    withInsights: number;
  };
  crm: {
    leads: number;
    opportunities: number;
    accounts: number;
    contacts: number;
    pipelineValue: number;
  };
  ai: {
    totalTokensUsed: number;
    avgResponseTime: number;
    successRate: number;
  };
  system: {
    uptime: number;
    version: string;
    lastBackup?: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  location?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    conversationsCount: number;
    leadsCount: number;
    opportunitiesCount: number;
  };
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
  allowedRoles?: string[];
  allowedUsers?: string[];
  rolloutPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  resourceType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    email: string;
    name: string;
  };
}

export interface ApplicationLog {
  id: string;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;
  source: string;
  message: string;
  errorType?: string;
  errorCode?: string;
  stackTrace?: string;
  userId?: string;
  correlationId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Integration {
  id: string;
  provider?: string;
  name: string;
  description?: string;
  logo?: string;
  category?: 'email' | 'calendar' | 'communication' | 'payment' | 'storage' | 'analytics' | 'security';
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | string;
  config?: Record<string, unknown>;
  lastSyncAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // UI-specific fields
  integrationType?: string;
  configType?: string;
  configured?: boolean;
  popular?: boolean;
  oauthBased?: boolean;
  [key: string]: any;
}

// Database Backup Types
export type BackupStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'DELETED';
export type BackupType = 'FULL' | 'INCREMENTAL' | 'SCHEMA_ONLY' | 'DATA_ONLY';

export interface DatabaseBackup {
  id: string;
  type: BackupType;
  status: BackupStatus;
  filename: string;
  filePath?: string;
  size: string; // BigInt as string for JSON serialization
  checksum?: string;
  description?: string;
  compressed: boolean;
  encrypted: boolean;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  expiresAt?: string;
  retentionDays: number;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  databaseName?: string;
  tableCount?: number;
  rowCount?: string;
}

export interface BackupSchedule {
  id: string;
  name: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  backupType: BackupType;
  compressed: boolean;
  retentionDays: number;
  lastRunAt?: string;
  lastRunStatus?: BackupStatus;
  nextRunAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupStats {
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalSizeBytes: string;
  oldestBackup: string | null;
  newestBackup: string | null;
  scheduledBackups: number;
}

export interface CreateBackupRequest {
  type?: BackupType;
  description?: string;
  compressed?: boolean;
  retentionDays?: number;
}

export interface CreateBackupScheduleRequest {
  name: string;
  cronExpression?: string;
  backupType?: BackupType;
  retentionDays?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
  pageSize?: number;
  totalPages: number;
}

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  estimatedEnd: string | null;
}

export const adminApi = {
  // Maintenance Mode
  getMaintenanceStatus: async (): Promise<MaintenanceStatus> => {
    // Use fetch directly — this endpoint is public (no auth token needed)
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${baseUrl}/admin/maintenance-status`);
    if (!response.ok) {
      throw new Error('Failed to fetch maintenance status');
    }
    return response.json();
  },

  updateMaintenanceMode: async (config: {
    enabled?: boolean;
    message?: string;
    estimatedEnd?: string | null;
  }): Promise<{ success: boolean } & MaintenanceStatus> => {
    const response = await client.put('/admin/maintenance', config);
    return response.data;
  },

  // Dashboard
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await client.get<AdminDashboardStats>('/admin/dashboard');
    return response.data;
  },

  // User Management
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<PaginatedResponse<AdminUser>> => {
    const response = await client.get<PaginatedResponse<any>>('/admin/users', { params });
    // Handle both 'items' and 'data' response formats, with safety checks
    const rawItems = response.data?.items || response.data?.data || [];
    const mappedItems = rawItems.map((user: any) => ({
      ...user,
      stats: {
        conversationsCount: user.conversationCount ?? user._count?.conversations ?? 0,
        leadsCount: user.leadCount ?? user._count?.leads ?? 0,
        opportunitiesCount: user.opportunityCount ?? user._count?.opportunities ?? 0,
      },
    }));
    return {
      ...response.data,
      items: mappedItems,
      data: mappedItems, // Provide both for compatibility
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      limit: response.data?.limit || response.data?.pageSize || 20,
      totalPages: response.data?.totalPages || 1,
    };
  },

  getUser: async (id: string): Promise<AdminUser> => {
    const response = await client.get<any>(`/admin/users/${id}`);
    // Map backend field names to frontend expected structure
    const user = response.data;
    return {
      ...user,
      stats: {
        conversationsCount: user.conversationCount ?? user._count?.conversations ?? 0,
        leadsCount: user.leadCount ?? user._count?.leads ?? 0,
        opportunitiesCount: user.opportunityCount ?? user._count?.opportunities ?? 0,
      },
    };
  },

  updateUser: async (id: string, data: Partial<AdminUser>): Promise<AdminUser> => {
    const response = await client.put<AdminUser>(`/admin/users/${id}`, data);
    return response.data;
  },

  suspendUser: async (id: string): Promise<AdminUser> => {
    const response = await client.post<AdminUser>(`/admin/users/${id}/suspend`);
    return response.data;
  },

  activateUser: async (id: string): Promise<AdminUser> => {
    const response = await client.post<AdminUser>(`/admin/users/${id}/activate`);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await client.delete(`/admin/users/${id}`);
  },

  resetUserPassword: async (id: string): Promise<void> => {
    await client.post(`/admin/users/${id}/reset-password`);
  },

  // System Configuration
  getConfigs: async (category?: string): Promise<SystemConfig[]> => {
    const response = await client.get<SystemConfig[]>('/admin/config', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  getConfig: async (key: string): Promise<SystemConfig> => {
    const response = await client.get<SystemConfig>(`/admin/config/${key}`);
    return response.data;
  },

  updateConfig: async (key: string, value: string): Promise<SystemConfig> => {
    const response = await client.put<SystemConfig>(`/admin/config/${key}`, { value });
    return response.data;
  },

  // Feature Flags
  getFeatureFlags: async (category?: string): Promise<FeatureFlag[]> => {
    const response = await client.get<FeatureFlag[]>('/admin/features', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  toggleFeatureFlag: async (key: string): Promise<FeatureFlag> => {
    const response = await client.patch<FeatureFlag>(`/admin/features/${key}/toggle`);
    return response.data;
  },

  updateFeatureFlag: async (key: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> => {
    const response = await client.put<FeatureFlag>(`/admin/features/${key}`, data);
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<AuditLog>> => {
    const response = await client.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', { params });
    // Handle both 'items' and 'data' response formats
    const items = response.data?.items || response.data?.data || [];
    return {
      ...response.data,
      items,
      data: items,
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      limit: response.data?.limit || response.data?.pageSize || 50,
      totalPages: response.data?.totalPages || 1,
    };
  },

  // Application Logs
  getApplicationLogs: async (params?: {
    page?: number;
    limit?: number;
    level?: string;
    category?: string;
    source?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<ApplicationLog>> => {
    const response = await client.get<PaginatedResponse<ApplicationLog>>('/admin/application-logs', { params });
    return response.data;
  },

  getLogStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    dailyBreakdown: { date: string; count: number; errors: number }[];
  }> => {
    const response = await client.get('/admin/application-logs/stats', { params });
    return response.data;
  },

  // Integrations
  getIntegrations: async (): Promise<Integration[]> => {
    const response = await client.get<Integration[]>('/admin/integrations');
    return response.data;
  },

  getIntegration: async (provider: string): Promise<Integration> => {
    const response = await client.get<Integration>(`/admin/integrations/${provider}`);
    return response.data;
  },

  updateIntegration: async (provider: string, config: Record<string, unknown>): Promise<Integration> => {
    const response = await client.put<Integration>(`/admin/integrations/${provider}`, config);
    return response.data;
  },

  // Settings
  getSettings: async (): Promise<Record<string, unknown>> => {
    const response = await client.get('/admin/settings');
    return response.data;
  },

  updateSetting: async (key: string, value: unknown): Promise<void> => {
    await client.put(`/admin/settings/${key}`, { value });
  },

  // Database Backups
  getBackups: async (params?: {
    status?: BackupStatus;
    type?: BackupType;
    limit?: number;
    offset?: number;
  }): Promise<{ backups: DatabaseBackup[]; total: number }> => {
    const response = await client.get('/admin/backups', { params });
    return response.data;
  },

  getBackup: async (id: string): Promise<DatabaseBackup> => {
    const response = await client.get(`/admin/backups/${id}`);
    return response.data;
  },

  createBackup: async (data: CreateBackupRequest): Promise<DatabaseBackup> => {
    const response = await client.post('/admin/backups', data);
    return response.data;
  },

  deleteBackup: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await client.delete(`/admin/backups/${id}`);
    return response.data;
  },

  getBackupStats: async (): Promise<BackupStats> => {
    const response = await client.get('/admin/backups/stats');
    return response.data;
  },

  downloadBackup: (id: string): string => {
    // Return the URL for downloading - browser will handle the download
    return `/api/admin/backups/${id}/download`;
  },

  cleanupExpiredBackups: async (): Promise<{ deleted: number }> => {
    const response = await client.post('/admin/backups/cleanup');
    return response.data;
  },

  // Backup Schedules
  getBackupSchedules: async (): Promise<BackupSchedule[]> => {
    const response = await client.get('/admin/backups/schedules');
    return response.data;
  },

  createBackupSchedule: async (data: CreateBackupScheduleRequest): Promise<BackupSchedule> => {
    const response = await client.post('/admin/backups/schedules', data);
    return response.data;
  },

  updateBackupSchedule: async (id: string, data: Partial<BackupSchedule>): Promise<BackupSchedule> => {
    const response = await client.patch(`/admin/backups/schedules/${id}`, data);
    return response.data;
  },

  deleteBackupSchedule: async (id: string): Promise<void> => {
    await client.delete(`/admin/backups/schedules/${id}`);
  },

  // Looker Dashboards
  getLookerDashboards: async (): Promise<{
    connected: boolean;
    dashboards: { id: string; title: string; url: string }[];
    looks: { id: string; title: string; url: string }[];
  }> => {
    const response = await client.get('/admin/looker/dashboards');
    return response.data;
  },

  // SSO User Sync (Okta / Auth0)
  getSSOUsers: async (provider: 'okta' | 'auth0'): Promise<{
    connected: boolean;
    users: { id: string; email: string; name: string; status: string; lastLogin?: string }[];
  }> => {
    const response = await client.get(`/admin/sso/users/${provider}`);
    return response.data;
  },

  syncUsersFromSSO: async (provider: 'okta' | 'auth0'): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> => {
    const response = await client.post(`/admin/sso/sync/${provider}`);
    return response.data;
  },

  // Integration Sync Logs
  getIntegrationSyncLogs: async (params?: {
    provider?: string;
    eventType?: string;
    status?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: IntegrationSyncLog[]; total: number; limit: number; offset: number }> => {
    const response = await client.get('/admin/integration-sync-logs', { params });
    return response.data;
  },

  // Integration Entity Mappings
  getIntegrationMappings: async (entityType: string, entityId: string): Promise<IntegrationEntityMapping[]> => {
    const response = await client.get(`/admin/integration-mappings/${entityType}/${entityId}`);
    return response.data;
  },

  // Integration Attachments
  getIntegrationAttachments: async (entityType: string, entityId: string): Promise<IntegrationAttachment[]> => {
    const response = await client.get(`/admin/integration-attachments/${entityType}/${entityId}`);
    return response.data;
  },

  // Entity Field Change History
  getEntityFieldChanges: async (entityType: string, entityId: string): Promise<EntityFieldChange[]> => {
    const response = await client.get(`/admin/entity-changes/${entityType}/${entityId}`);
    return response.data;
  },
};

// Integration persistence types
export interface IntegrationSyncLog {
  id: string;
  organizationId: string;
  provider: string;
  eventType: string;
  entityType: string;
  entityId: string;
  status: 'pending' | 'success' | 'failed';
  externalId?: string;
  responseData?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

export interface IntegrationEntityMapping {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  provider: string;
  externalId: string;
  externalUrl?: string;
  lastSyncedAt: string;
  syncDirection: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationAttachment {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  provider: string;
  externalId?: string;
  fileName: string;
  fileUrl?: string;
  fileType?: string;
  fileSizeBytes?: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface EntityFieldChange {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export default adminApi;
