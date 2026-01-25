import { useState, useEffect, useCallback } from 'react';
import { licensingApi } from '../api/licensing';
import type {
  LicensingDashboard,
  LicenseType,
  LicenseFeature,
  UserLicense,
  PreGeneratedKey,
  LicenseAuditLog,
  LicenseStatus,
  PreGeneratedKeyStatus,
} from '../api/licensing';

// Licensing Dashboard Hook
export function useLicensingDashboard() {
  const [dashboard, setDashboard] = useState<LicensingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await licensingApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to fetch licensing dashboard:', err);
      setError('Failed to load licensing dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { dashboard, loading, error, refetch: fetchDashboard };
}

// License Types (Plans) Hook
export function useLicenseTypes() {
  const [types, setTypes] = useState<LicenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await licensingApi.getLicenseTypes();
      setTypes(data);
    } catch (err) {
      console.error('Failed to fetch license types:', err);
      setError('Failed to load license types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const createType = async (data: Partial<LicenseType>) => {
    try {
      const created = await licensingApi.createLicenseType(data);
      setTypes(prev => [...prev, created]);
      return created;
    } catch (err) {
      console.error('Failed to create license type:', err);
      throw err;
    }
  };

  const updateType = async (id: string, data: Partial<LicenseType>) => {
    try {
      const updated = await licensingApi.updateLicenseType(id, data);
      setTypes(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      console.error('Failed to update license type:', err);
      throw err;
    }
  };

  const deleteType = async (id: string) => {
    try {
      await licensingApi.deleteLicenseType(id);
      setTypes(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete license type:', err);
      throw err;
    }
  };

  return { types, loading, error, refetch: fetchTypes, createType, updateType, deleteType };
}

// License Features Hook
export function useLicenseFeatures(category?: string) {
  const [features, setFeatures] = useState<LicenseFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await licensingApi.getLicenseFeatures(category);
      setFeatures(data);
    } catch (err) {
      console.error('Failed to fetch license features:', err);
      setError('Failed to load license features');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const createFeature = async (data: Partial<LicenseFeature>) => {
    try {
      const created = await licensingApi.createLicenseFeature(data);
      setFeatures(prev => [...prev, created]);
      return created;
    } catch (err) {
      console.error('Failed to create license feature:', err);
      throw err;
    }
  };

  const updateFeature = async (id: string, data: Partial<LicenseFeature>) => {
    try {
      const updated = await licensingApi.updateLicenseFeature(id, data);
      setFeatures(prev => prev.map(f => f.id === id ? updated : f));
      return updated;
    } catch (err) {
      console.error('Failed to update license feature:', err);
      throw err;
    }
  };

  const deleteFeature = async (id: string) => {
    try {
      await licensingApi.deleteLicenseFeature(id);
      setFeatures(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Failed to delete license feature:', err);
      throw err;
    }
  };

  return { features, loading, error, refetch: fetchFeatures, createFeature, updateFeature, deleteFeature };
}

// User Licenses Hook
export function useUserLicenses(initialParams?: {
  page?: number;
  limit?: number;
  status?: LicenseStatus;
  licenseTypeId?: string;
  search?: string;
}) {
  const [licenses, setLicenses] = useState<UserLicense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLicenses = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await licensingApi.getUserLicenses({
        page: params?.page || page,
        limit: params?.limit || 20,
        status: params?.status,
        licenseTypeId: params?.licenseTypeId,
        search: params?.search,
      });
      setLicenses(response.data || response.items || []);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch user licenses:', err);
      setError('Failed to load user licenses');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLicenses(initialParams);
  }, []);

  const assignLicense = async (data: {
    userId: string;
    licenseTypeId: string;
    startDate?: string;
    endDate?: string;
    isTrial?: boolean;
    autoRenew?: boolean;
  }) => {
    try {
      const created = await licensingApi.assignLicense(data);
      setLicenses(prev => [...prev, created]);
      setTotal(prev => prev + 1);
      return created;
    } catch (err) {
      console.error('Failed to assign license:', err);
      throw err;
    }
  };

  const updateLicense = async (id: string, data: Partial<UserLicense>) => {
    try {
      const updated = await licensingApi.updateUserLicense(id, data);
      setLicenses(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('Failed to update license:', err);
      throw err;
    }
  };

  const renewLicense = async (id: string) => {
    try {
      const updated = await licensingApi.renewLicense(id);
      setLicenses(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('Failed to renew license:', err);
      throw err;
    }
  };

  const revokeLicense = async (id: string, reason?: string) => {
    try {
      const updated = await licensingApi.revokeLicense(id, reason);
      setLicenses(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('Failed to revoke license:', err);
      throw err;
    }
  };

  const suspendLicense = async (id: string, reason?: string) => {
    try {
      const updated = await licensingApi.suspendLicense(id, reason);
      setLicenses(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('Failed to suspend license:', err);
      throw err;
    }
  };

  const resumeLicense = async (id: string) => {
    try {
      const updated = await licensingApi.resumeLicense(id);
      setLicenses(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('Failed to resume license:', err);
      throw err;
    }
  };

  const changeLicenseType = async (id: string, newLicenseTypeId: string) => {
    try {
      const updated = await licensingApi.changeLicenseType(id, newLicenseTypeId);
      setLicenses(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('Failed to change license type:', err);
      throw err;
    }
  };

  return {
    licenses,
    total,
    page,
    setPage,
    loading,
    error,
    refetch: fetchLicenses,
    assignLicense,
    updateLicense,
    renewLicense,
    revokeLicense,
    suspendLicense,
    resumeLicense,
    changeLicenseType,
  };
}

// Pre-Generated Keys Hook
export function usePreGeneratedKeys(initialParams?: {
  page?: number;
  limit?: number;
  status?: PreGeneratedKeyStatus;
  licenseTypeId?: string;
}) {
  const [keys, setKeys] = useState<PreGeneratedKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await licensingApi.getPreGeneratedKeys({
        page: params?.page || page,
        limit: params?.limit || 20,
        status: params?.status,
        licenseTypeId: params?.licenseTypeId,
      });
      setKeys(response.data || response.items || []);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch pre-generated keys:', err);
      setError('Failed to load license keys');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchKeys(initialParams);
  }, []);

  const generateKeys = async (data: {
    licenseTypeId: string;
    count: number;
    durationDays?: number;
    isTrial?: boolean;
    expiresAt?: string;
    notes?: string;
  }) => {
    try {
      const newKeys = await licensingApi.generateKeys(data);
      setKeys(prev => [...newKeys, ...prev]);
      setTotal(prev => prev + newKeys.length);
      return newKeys;
    } catch (err) {
      console.error('Failed to generate keys:', err);
      throw err;
    }
  };

  const assignKeyToUser = async (licenseKey: string, userId: string) => {
    try {
      const license = await licensingApi.assignKeyToUser({ licenseKey, userId });
      // Update the key status in local state
      setKeys(prev => prev.map(k =>
        k.licenseKey === licenseKey
          ? { ...k, status: 'CLAIMED' as PreGeneratedKeyStatus, claimedByUserId: userId, claimedAt: new Date().toISOString() }
          : k
      ));
      return license;
    } catch (err) {
      console.error('Failed to assign key to user:', err);
      throw err;
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await licensingApi.revokeKey(id);
      setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'REVOKED' as PreGeneratedKeyStatus } : k));
    } catch (err) {
      console.error('Failed to revoke key:', err);
      throw err;
    }
  };

  return {
    keys,
    total,
    page,
    setPage,
    loading,
    error,
    refetch: fetchKeys,
    generateKeys,
    assignKeyToUser,
    revokeKey,
  };
}

// License Audit Logs Hook
export function useLicenseAuditLogs(initialParams?: {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
}) {
  const [logs, setLogs] = useState<LicenseAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await licensingApi.getAuditLogs({
        page: params?.page || page,
        limit: params?.limit || 50,
        action: params?.action,
        entityType: params?.entityType,
      });
      setLogs(response.data || response.items || []);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch license audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs(initialParams);
  }, []);

  return { logs, total, page, setPage, loading, error, refetch: fetchLogs };
}

// My License Hook (for current user)
export function useMyLicense() {
  const [license, setLicense] = useState<UserLicense | null>(null);
  const [features, setFeatures] = useState<LicenseFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLicense = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [licenseData, featuresData] = await Promise.all([
        licensingApi.getMyLicense(),
        licensingApi.getMyFeatures(),
      ]);
      setLicense(licenseData);
      setFeatures(featuresData);
    } catch (err) {
      console.error('Failed to fetch my license:', err);
      setError('Failed to load license information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const applyKey = async (licenseKey: string) => {
    try {
      const newLicense = await licensingApi.applyKey(licenseKey);
      setLicense(newLicense);
      // Refetch features with new license
      const featuresData = await licensingApi.getMyFeatures();
      setFeatures(featuresData);
      return newLicense;
    } catch (err) {
      console.error('Failed to apply license key:', err);
      throw err;
    }
  };

  const checkAccess = async (featureKey: string) => {
    try {
      return await licensingApi.checkAccess(featureKey);
    } catch (err) {
      console.error('Failed to check feature access:', err);
      return { hasAccess: false };
    }
  };

  return { license, features, loading, error, refetch: fetchLicense, applyKey, checkAccess };
}
