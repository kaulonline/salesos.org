import client from './client';

// Types for User Profile & Preferences
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  mobilePhone?: string;
  location?: string;
  timezone?: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  dashboardLayout?: Record<string, unknown>;
  sidebarCollapsed?: boolean;
  compactMode?: boolean;
  modelConfig?: {
    preferredModel?: string;
    temperature?: number;
  };
  crmDataSource?: string;
}

export interface EmailPreferences {
  emailsEnabled: boolean;
  newLeadAssigned: boolean;
  leadStatusChange: boolean;
  dealStageChange: boolean;
  dealWonLost: boolean;
  taskAssigned: boolean;
  taskDueReminder: boolean;
  meetingReminder: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  marketingEmails: boolean;
}

export interface PrivacyPreferences {
  analyticsEnabled: boolean;
  personalizationEnabled: boolean;
  aiTrainingConsent: boolean;
  thirdPartyDataSharing: boolean;
}

export interface QuotaProgress {
  period: 'monthly' | 'quarterly' | 'yearly';
  quota: number;
  achieved: number;
  percentage: number;
  commissionRate?: number;
  startDate: string;
  endDate: string;
}

export interface StorageUsage {
  total: number;
  used: number;
  breakdown: {
    chatMessages: number;
    cachedFiles: number;
    documents: number;
  };
}

export interface UpdateProfileDto {
  name?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  mobilePhone?: string;
  location?: string;
  timezone?: string;
}

export const usersApi = {
  // Profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await client.get<UserProfile>('/users/me');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileDto): Promise<UserProfile> => {
    const response = await client.put<UserProfile>('/users/me', data);
    return response.data;
  },

  // Avatar
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await client.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteAvatar: async (): Promise<void> => {
    await client.delete('/users/me/avatar');
  },

  // Preferences
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await client.get<UserPreferences>('/users/me/preferences');
    return response.data;
  },

  updatePreferences: async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
    const response = await client.patch<UserPreferences>('/users/me/preferences', data);
    return response.data;
  },

  // Email Preferences
  getEmailPreferences: async (): Promise<EmailPreferences> => {
    const response = await client.get<EmailPreferences>('/users/me/email-preferences');
    return response.data;
  },

  updateEmailPreferences: async (data: Partial<EmailPreferences>): Promise<EmailPreferences> => {
    const response = await client.patch<EmailPreferences>('/users/me/email-preferences', data);
    return response.data;
  },

  // Privacy
  getPrivacyPreferences: async (): Promise<PrivacyPreferences> => {
    const response = await client.get<PrivacyPreferences>('/users/me/privacy');
    return response.data;
  },

  updatePrivacyPreferences: async (data: Partial<PrivacyPreferences>): Promise<PrivacyPreferences> => {
    const response = await client.put<PrivacyPreferences>('/users/me/privacy', data);
    return response.data;
  },

  // Quota
  getQuotaProgress: async (period?: 'monthly' | 'quarterly' | 'yearly'): Promise<QuotaProgress> => {
    const response = await client.get<QuotaProgress>('/users/me/quota', {
      params: period ? { period } : undefined,
    });
    return response.data;
  },

  updateQuota: async (data: { quota: number; period: string }): Promise<QuotaProgress> => {
    const response = await client.put<QuotaProgress>('/users/me/quota', data);
    return response.data;
  },

  // Storage
  getStorageUsage: async (): Promise<StorageUsage> => {
    const response = await client.get<StorageUsage>('/users/me/storage');
    return response.data;
  },

  clearConversations: async (): Promise<void> => {
    await client.delete('/users/me/conversations');
  },

  clearCache: async (): Promise<void> => {
    await client.delete('/users/me/cache');
  },

  // Password Change
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await client.post('/auth/change-password', data);
  },
};

export default usersApi;
