import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api';
import type {
  UserProfile,
  UserPreferences,
  EmailPreferences,
  PrivacyPreferences,
  QuotaProgress,
  StorageUsage,
  UpdateProfileDto,
} from '../api/users';
import { logger } from '../lib/logger';

// User Profile Hook
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getProfile();
      setProfile(data);
    } catch (err) {
      logger.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (data: UpdateProfileDto) => {
    try {
      setSaving(true);
      const updated = await usersApi.updateProfile(data);
      setProfile(updated);
      return updated;
    } catch (err) {
      logger.error('Failed to update profile:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setSaving(true);
      const result = await usersApi.uploadAvatar(file);
      setProfile(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);
      return result;
    } catch (err) {
      logger.error('Failed to upload avatar:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      setSaving(true);
      await usersApi.deleteAvatar();
      setProfile(prev => prev ? { ...prev, avatarUrl: undefined } : null);
    } catch (err) {
      logger.error('Failed to delete avatar:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    loading,
    error,
    saving,
    refetch: fetchProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  };
}

// User Preferences Hook
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getPreferences();
      setPreferences(data);
    } catch (err) {
      logger.error('Failed to fetch preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (data: Partial<UserPreferences>) => {
    try {
      setSaving(true);
      const updated = await usersApi.updatePreferences(data);
      setPreferences(updated);
      return updated;
    } catch (err) {
      logger.error('Failed to update preferences:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { preferences, loading, error, saving, refetch: fetchPreferences, updatePreferences };
}

// Email Preferences Hook
export function useEmailPreferences() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getEmailPreferences();
      setPreferences(data);
    } catch (err) {
      logger.error('Failed to fetch email preferences:', err);
      setError('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (data: Partial<EmailPreferences>) => {
    try {
      setSaving(true);
      const updated = await usersApi.updateEmailPreferences(data);
      setPreferences(updated);
      return updated;
    } catch (err) {
      logger.error('Failed to update email preferences:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { preferences, loading, error, saving, refetch: fetchPreferences, updatePreferences };
}

// Privacy Preferences Hook
export function usePrivacyPreferences() {
  const [preferences, setPreferences] = useState<PrivacyPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getPrivacyPreferences();
      setPreferences(data);
    } catch (err) {
      logger.error('Failed to fetch privacy preferences:', err);
      setError('Failed to load privacy preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (data: Partial<PrivacyPreferences>) => {
    try {
      setSaving(true);
      const updated = await usersApi.updatePrivacyPreferences(data);
      setPreferences(updated);
      return updated;
    } catch (err) {
      logger.error('Failed to update privacy preferences:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { preferences, loading, error, saving, refetch: fetchPreferences, updatePreferences };
}

// Quota Progress Hook
export function useQuotaProgress(period?: 'monthly' | 'quarterly' | 'yearly') {
  const [quota, setQuota] = useState<QuotaProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getQuotaProgress(period);
      setQuota(data);
    } catch (err) {
      logger.error('Failed to fetch quota progress:', err);
      setError('Failed to load quota progress');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const updateQuota = async (data: { quota: number; period: string }) => {
    try {
      const updated = await usersApi.updateQuota(data);
      setQuota(updated);
      return updated;
    } catch (err) {
      logger.error('Failed to update quota:', err);
      throw err;
    }
  };

  return { quota, loading, error, refetch: fetchQuota, updateQuota };
}

// Storage Usage Hook
export function useStorageUsage() {
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getStorageUsage();
      setStorage(data);
    } catch (err) {
      logger.error('Failed to fetch storage usage:', err);
      setError('Failed to load storage usage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorage();
  }, [fetchStorage]);

  const clearConversations = async () => {
    try {
      await usersApi.clearConversations();
      await fetchStorage();
    } catch (err) {
      logger.error('Failed to clear conversations:', err);
      throw err;
    }
  };

  const clearCache = async () => {
    try {
      await usersApi.clearCache();
      await fetchStorage();
    } catch (err) {
      logger.error('Failed to clear cache:', err);
      throw err;
    }
  };

  return { storage, loading, error, refetch: fetchStorage, clearConversations, clearCache };
}

// Password Change Hook
export function usePasswordChange() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      await usersApi.changePassword({ currentPassword, newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to change password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading, error, success, clearError: () => setError(null) };
}
