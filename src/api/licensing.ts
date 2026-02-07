import client from './client';

// Types for Licensing/Billing API
export type LicenseTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'PENDING' | 'TRIAL';
export type PreGeneratedKeyStatus = 'AVAILABLE' | 'CLAIMED' | 'EXPIRED' | 'REVOKED';

export interface LicenseType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tier: LicenseTier;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents
  currency: string;
  defaultDurationDays: number;
  trialDurationDays?: number;
  maxUsers?: number;
  maxLeads?: number;
  maxConversations?: number;
  maxMeetings?: number;
  maxDocuments?: number;
  maxApiCalls?: number;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  features?: LicenseFeature[];
  userCount?: number;
  _count?: {
    userLicenses: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LicenseFeature {
  id: string;
  featureKey: string;
  name: string;
  description?: string;
  category: string;
  isEnabled: boolean;
  requiresLicense: boolean;
  defaultLimit?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserLicense {
  id: string;
  userId: string;
  licenseTypeId: string;
  organizationId?: string;
  startDate: string;
  endDate?: string;
  status: LicenseStatus;
  licenseKey: string;
  isTrial: boolean;
  trialEndDate?: string;
  autoRenew: boolean;
  customLimits?: Record<string, number>;
  assignedBy?: string;
  lastVerifiedAt?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  licenseType?: LicenseType;
  createdAt: string;
  updatedAt: string;
}

export interface PreGeneratedKey {
  id: string;
  licenseKey: string;
  licenseTypeId: string;
  status: PreGeneratedKeyStatus;
  durationDays: number;
  isTrial: boolean;
  expiresAt?: string;
  claimedByUserId?: string;
  claimedAt?: string;
  userLicenseId?: string;
  generatedBy?: string;
  notes?: string;
  licenseType?: LicenseType;
  claimedBy?: {
    id: string;
    email: string;
    name?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LicenseUsage {
  id: string;
  userLicenseId: string;
  featureKey: string;
  usageCount: number;
  usageDate: string;
  action?: string;
  resourceId?: string;
  resourceType?: string;
}

export interface LicenseAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy?: string;
  performedByName?: string;
  performedByEmail?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LicensingDashboard {
  totalLicenses: number;
  activeLicenses: number;
  trialLicenses: number;
  expiredLicenses: number;
  expiringLicenses?: number;
  recentAssignments?: number;
  revenue: {
    monthly: number;
    yearly: number;
    total: number;
  };
  byTier: Record<LicenseTier, number>;
  byStatus: Record<LicenseStatus, number>;
  tierBreakdown?: Array<{ tier: LicenseTier; count: number; name?: string }>;
  statusBreakdown?: Array<{ status: LicenseStatus; count: number }>;
  recentActivity: LicenseAuditLog[];
}

export interface PaginatedResponse<T> {
  data: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const licensingApi = {
  // Dashboard
  getDashboard: async (): Promise<LicensingDashboard> => {
    const response = await client.get<any>('/licensing/dashboard');
    const data = response.data;

    // Transform tierBreakdown array to byTier record
    const byTier: Record<LicenseTier, number> = {
      FREE: 0, STARTER: 0, PROFESSIONAL: 0, ENTERPRISE: 0, CUSTOM: 0
    };
    if (data.tierBreakdown && Array.isArray(data.tierBreakdown)) {
      data.tierBreakdown.forEach((item: { tier: LicenseTier; count: number }) => {
        if (item.tier && byTier.hasOwnProperty(item.tier)) {
          byTier[item.tier] = item.count || 0;
        }
      });
    }

    // Transform statusBreakdown array to byStatus record
    const byStatus: Record<LicenseStatus, number> = {
      ACTIVE: 0, EXPIRED: 0, SUSPENDED: 0, CANCELLED: 0, PENDING: 0, TRIAL: 0
    };
    if (data.statusBreakdown && Array.isArray(data.statusBreakdown)) {
      data.statusBreakdown.forEach((item: { status: LicenseStatus; count: number }) => {
        if (item.status && byStatus.hasOwnProperty(item.status)) {
          byStatus[item.status] = item.count || 0;
        }
      });
    }

    return {
      totalLicenses: data.totalLicenses || 0,
      activeLicenses: data.activeLicenses || 0,
      trialLicenses: data.trialLicenses || 0,
      expiredLicenses: data.expiredLicenses || 0,
      expiringLicenses: data.expiringLicenses || 0,
      recentAssignments: data.recentAssignments || 0,
      revenue: data.revenue || { monthly: 0, yearly: 0, total: 0 },
      byTier,
      byStatus,
      tierBreakdown: data.tierBreakdown || [],
      statusBreakdown: data.statusBreakdown || [],
      recentActivity: data.recentActivity || [],
    };
  },

  // License Types (Plans) - Uses public endpoint for unauthenticated access
  getLicenseTypes: async (): Promise<LicenseType[]> => {
    const response = await client.get<LicenseType[]>('/licensing/public/types');
    return response.data;
  },

  getLicenseType: async (id: string): Promise<LicenseType> => {
    const response = await client.get<LicenseType>(`/licensing/types/${id}`);
    return response.data;
  },

  createLicenseType: async (data: Partial<LicenseType>): Promise<LicenseType> => {
    const response = await client.post<LicenseType>('/licensing/types', data);
    return response.data;
  },

  updateLicenseType: async (id: string, data: Partial<LicenseType>): Promise<LicenseType> => {
    const response = await client.put<LicenseType>(`/licensing/types/${id}`, data);
    return response.data;
  },

  deleteLicenseType: async (id: string): Promise<void> => {
    await client.delete(`/licensing/types/${id}`);
  },

  // License Features
  getLicenseFeatures: async (category?: string): Promise<LicenseFeature[]> => {
    const response = await client.get<LicenseFeature[]>('/licensing/features', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  createLicenseFeature: async (data: Partial<LicenseFeature>): Promise<LicenseFeature> => {
    const response = await client.post<LicenseFeature>('/licensing/features', data);
    return response.data;
  },

  updateLicenseFeature: async (id: string, data: Partial<LicenseFeature>): Promise<LicenseFeature> => {
    const response = await client.put<LicenseFeature>(`/licensing/features/${id}`, data);
    return response.data;
  },

  deleteLicenseFeature: async (id: string): Promise<void> => {
    await client.delete(`/licensing/features/${id}`);
  },

  // User Licenses
  getUserLicenses: async (params?: {
    page?: number;
    limit?: number;
    status?: LicenseStatus;
    licenseTypeId?: string;
    search?: string;
  }): Promise<PaginatedResponse<UserLicense>> => {
    // Backend expects 'pageSize' not 'limit'
    const backendParams = {
      page: params?.page,
      pageSize: params?.limit,
      status: params?.status,
      search: params?.search,
    };
    const response = await client.get<any>('/licensing/user-licenses', { params: backendParams });
    // Backend returns { licenses, pagination: { page, pageSize, total, totalPages } }
    const items = response.data.licenses || response.data.data || response.data.items || [];
    const pagination = response.data.pagination || {};
    return {
      data: items,
      items,
      total: pagination.total || response.data.total || 0,
      page: pagination.page || response.data.page || 1,
      limit: pagination.pageSize || response.data.limit || 20,
      totalPages: pagination.totalPages || response.data.totalPages || 1,
    };
  },

  getUserLicense: async (id: string): Promise<UserLicense> => {
    const response = await client.get<UserLicense>(`/licensing/user-licenses/${id}`);
    return response.data;
  },

  assignLicense: async (data: {
    userId: string;
    licenseTypeId: string;
    startDate?: string;
    endDate?: string;
    isTrial?: boolean;
    autoRenew?: boolean;
    customLimits?: Record<string, number>;
  }): Promise<UserLicense> => {
    const response = await client.post<UserLicense>('/licensing/user-licenses', data);
    return response.data;
  },

  updateUserLicense: async (id: string, data: Partial<UserLicense>): Promise<UserLicense> => {
    const response = await client.put<UserLicense>(`/licensing/user-licenses/${id}`, data);
    return response.data;
  },

  renewLicense: async (id: string): Promise<UserLicense> => {
    const response = await client.post<UserLicense>(`/licensing/user-licenses/${id}/renew`);
    return response.data;
  },

  revokeLicense: async (id: string, reason?: string): Promise<UserLicense> => {
    const response = await client.post<UserLicense>(`/licensing/user-licenses/${id}/revoke`, { reason });
    return response.data;
  },

  suspendLicense: async (id: string, reason?: string): Promise<UserLicense> => {
    const response = await client.post<UserLicense>(`/licensing/user-licenses/${id}/suspend`, { reason });
    return response.data;
  },

  resumeLicense: async (id: string): Promise<UserLicense> => {
    const response = await client.post<UserLicense>(`/licensing/user-licenses/${id}/resume`);
    return response.data;
  },

  changeLicenseType: async (id: string, newLicenseTypeId: string): Promise<UserLicense> => {
    const response = await client.post<UserLicense>(`/licensing/user-licenses/${id}/change-type`, {
      newLicenseTypeId,
    });
    return response.data;
  },

  // Pre-Generated License Keys
  getPreGeneratedKeys: async (params?: {
    page?: number;
    limit?: number;
    status?: PreGeneratedKeyStatus;
    licenseTypeId?: string;
  }): Promise<PaginatedResponse<PreGeneratedKey>> => {
    // Backend only supports status and licenseTypeId filters, returns plain array
    const backendParams = {
      status: params?.status,
      licenseTypeId: params?.licenseTypeId,
    };
    const response = await client.get<any>('/licensing/pre-generated-keys', { params: backendParams });
    // Backend returns a plain array, not paginated
    const items = Array.isArray(response.data) ? response.data : (response.data.data || response.data.items || []);
    // Apply client-side pagination
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);
    return {
      data: paginatedItems,
      items: paginatedItems,
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit),
    };
  },

  generateKeys: async (data: {
    licenseTypeId: string;
    count: number;
    durationDays?: number;
    isTrial?: boolean;
    expiresAt?: string;
    notes?: string;
  }): Promise<PreGeneratedKey[]> => {
    const response = await client.post<PreGeneratedKey[]>('/licensing/generate-keys', data);
    return response.data;
  },

  assignKeyToUser: async (data: {
    licenseKey: string;
    userId: string;
  }): Promise<UserLicense> => {
    const response = await client.post<UserLicense>('/licensing/assign-key-to-user', data);
    return response.data;
  },

  revokeKey: async (id: string): Promise<void> => {
    await client.delete(`/licensing/pre-generated-keys/${id}`);
  },

  // License Validation
  validateKey: async (licenseKey: string): Promise<{ valid: boolean; message?: string }> => {
    const response = await client.get<{ valid: boolean; message?: string }>(`/licensing/validate/${licenseKey}`);
    return response.data;
  },

  applyKey: async (licenseKey: string): Promise<UserLicense> => {
    const response = await client.post<UserLicense>('/licensing/apply-key', { licenseKey });
    return response.data;
  },

  // Current User License
  getMyLicense: async (): Promise<UserLicense | null> => {
    try {
      const response = await client.get<UserLicense>('/licensing/my-license');
      return response.data;
    } catch {
      return null;
    }
  },

  getMyFeatures: async (): Promise<LicenseFeature[]> => {
    const response = await client.get<LicenseFeature[]>('/licensing/my-features');
    return response.data;
  },

  // Feature Access Check
  checkAccess: async (featureKey: string): Promise<{ hasAccess: boolean; limit?: number; currentUsage?: number }> => {
    const response = await client.post<{ hasAccess: boolean; limit?: number; currentUsage?: number }>(
      '/licensing/check-access',
      { featureKey }
    );
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
  }): Promise<PaginatedResponse<LicenseAuditLog>> => {
    // Backend expects 'pageSize' not 'limit'
    const backendParams = {
      page: params?.page,
      pageSize: params?.limit,
      action: params?.action,
      entityType: params?.entityType,
    };
    const response = await client.get<any>('/licensing/audit-logs', { params: backendParams });
    // Backend returns { logs, pagination: { page, pageSize, total, totalPages } }
    const items = response.data.logs || response.data.data || response.data.items || [];
    const pagination = response.data.pagination || {};
    return {
      data: items,
      items,
      total: pagination.total || response.data.total || 0,
      page: pagination.page || response.data.page || 1,
      limit: pagination.pageSize || response.data.limit || 50,
      totalPages: pagination.totalPages || response.data.totalPages || 1,
    };
  },

  // Revenue Forecast
  getForecast: async (): Promise<{
    currentMRR: number;
    projectedMRR: number;
    churnRate: number;
    growthRate: number;
    forecast: { month: string; revenue: number }[];
  }> => {
    const response = await client.post('/licensing/forecast');
    return response.data;
  },
};

export default licensingApi;
