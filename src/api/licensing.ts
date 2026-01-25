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
  maxConversations?: number;
  maxMeetings?: number;
  maxDocuments?: number;
  maxApiCalls?: number;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  features?: LicenseFeature[];
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
  revenue: {
    monthly: number;
    yearly: number;
    total: number;
  };
  byTier: Record<LicenseTier, number>;
  byStatus: Record<LicenseStatus, number>;
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
    const response = await client.get<LicensingDashboard>('/licensing/dashboard');
    return response.data;
  },

  // License Types (Plans)
  getLicenseTypes: async (): Promise<LicenseType[]> => {
    const response = await client.get<LicenseType[]>('/licensing/types');
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
    const response = await client.get<PaginatedResponse<UserLicense>>('/licensing/user-licenses', { params });
    // Handle both 'data' and 'items' response formats
    const items = response.data.data || response.data.items || [];
    return { ...response.data, data: items, items };
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
    const response = await client.get<PaginatedResponse<PreGeneratedKey>>('/licensing/pre-generated-keys', { params });
    const items = response.data.data || response.data.items || [];
    return { ...response.data, data: items, items };
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
    const response = await client.get<PaginatedResponse<LicenseAuditLog>>('/licensing/audit-logs', { params });
    const items = response.data.data || response.data.items || [];
    return { ...response.data, data: items, items };
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
