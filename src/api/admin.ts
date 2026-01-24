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
  provider: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  config?: Record<string, unknown>;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminApi = {
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
    const response = await client.get<PaginatedResponse<AdminUser>>('/admin/users', { params });
    return response.data;
  },

  getUser: async (id: string): Promise<AdminUser> => {
    const response = await client.get<AdminUser>(`/admin/users/${id}`);
    return response.data;
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
    return response.data;
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
};

export default adminApi;
