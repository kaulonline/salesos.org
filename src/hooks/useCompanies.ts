import { useState, useCallback, useEffect } from 'react';
import { accountsApi, AccountFilters } from '../api/accounts';
import type { Account, CreateAccountDto, UpdateAccountDto, AccountStats } from '../types';

interface UseCompaniesReturn {
  companies: Account[];
  stats: AccountStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchStats: () => Promise<void>;
  create: (data: CreateAccountDto) => Promise<Account>;
  update: (id: string, data: UpdateAccountDto) => Promise<Account>;
  remove: (id: string) => Promise<void>;
}

export function useCompanies(initialFilters?: AccountFilters): UseCompaniesReturn {
  const [companies, setCompanies] = useState<Account[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<AccountFilters | undefined>(initialFilters);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getAll(filters);
      setCompanies(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await accountsApi.getStats();
      setStats(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Failed to fetch account stats:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const create = useCallback(async (data: CreateAccountDto): Promise<Account> => {
    const company = await accountsApi.create(data);
    setCompanies((prev) => [company, ...prev]);
    return company;
  }, []);

  const update = useCallback(async (id: string, data: UpdateAccountDto): Promise<Account> => {
    const updated = await accountsApi.update(id, data);
    setCompanies((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await accountsApi.delete(id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    companies,
    stats,
    loading,
    error,
    refetch: fetchCompanies,
    fetchStats,
    create,
    update,
    remove,
  };
}

export function useCompany(id: string | undefined) {
  const [company, setCompany] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    if (!id) {
      setCompany(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getById(id);
      setCompany(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch company');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return { company, loading, error, refetch: fetchCompany };
}
