import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';
import type {
  AdminDashboardStats,
  AdminUser,
  SystemConfig,
  FeatureFlag,
  AuditLog,
  Integration,
} from '../api/admin';

// Admin Dashboard Stats Hook
export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch admin dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// Admin Users Hook
export function useAdminUsers(initialParams?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getUsers({
        page: params?.page || page,
        limit: params?.limit || 20,
        search: params?.search,
        role: params?.role,
        status: params?.status,
      });
      // Handle both 'items' and 'data' response formats
      setUsers(response.items || response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers(initialParams);
  }, []);

  const updateUser = async (id: string, data: Partial<AdminUser>) => {
    try {
      const updated = await adminApi.updateUser(id, data);
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err) {
      console.error('Failed to update user:', err);
      throw err;
    }
  };

  const suspendUser = async (id: string) => {
    try {
      const updated = await adminApi.suspendUser(id);
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err) {
      console.error('Failed to suspend user:', err);
      throw err;
    }
  };

  const activateUser = async (id: string) => {
    try {
      const updated = await adminApi.activateUser(id);
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      return updated;
    } catch (err) {
      console.error('Failed to activate user:', err);
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await adminApi.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  };

  const resetPassword = async (id: string) => {
    try {
      await adminApi.resetUserPassword(id);
    } catch (err) {
      console.error('Failed to reset password:', err);
      throw err;
    }
  };

  return {
    users,
    total,
    page,
    setPage,
    loading,
    error,
    refetch: fetchUsers,
    updateUser,
    suspendUser,
    activateUser,
    deleteUser,
    resetPassword,
  };
}

// Feature Flags Hook
export function useFeatureFlags(category?: string) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getFeatureFlags(category);
      setFlags(data);
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
      setError('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const toggleFlag = async (key: string) => {
    try {
      const updated = await adminApi.toggleFeatureFlag(key);
      setFlags(prev => prev.map(f => f.key === key ? updated : f));
      return updated;
    } catch (err) {
      console.error('Failed to toggle feature flag:', err);
      throw err;
    }
  };

  return { flags, loading, error, refetch: fetchFlags, toggleFlag };
}

// System Config Hook
export function useSystemConfig(category?: string) {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getConfigs(category);
      setConfigs(data);
    } catch (err) {
      console.error('Failed to fetch system config:', err);
      setError('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const updateConfig = async (key: string, value: string) => {
    try {
      const updated = await adminApi.updateConfig(key, value);
      setConfigs(prev => prev.map(c => c.key === key ? updated : c));
      return updated;
    } catch (err) {
      console.error('Failed to update config:', err);
      throw err;
    }
  };

  return { configs, loading, error, refetch: fetchConfigs, updateConfig };
}

// Audit Logs Hook
export function useAuditLogs(initialParams?: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAuditLogs({
        page: params?.page || page,
        limit: params?.limit || 50,
        ...params,
      });
      // Handle both 'items' and 'data' response formats
      setLogs(response.items || response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs(initialParams);
  }, []);

  return { logs, total, page, setPage, loading, error, refetch: fetchLogs };
}

// Integrations Hook
export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const updateIntegration = async (provider: string, config: Record<string, unknown>) => {
    try {
      const updated = await adminApi.updateIntegration(provider, config);
      setIntegrations(prev => prev.map(i => i.provider === provider ? updated : i));
      return updated;
    } catch (err) {
      console.error('Failed to update integration:', err);
      throw err;
    }
  };

  return { integrations, loading, error, refetch: fetchIntegrations, updateIntegration };
}
