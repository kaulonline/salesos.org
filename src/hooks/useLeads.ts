import { useState, useCallback, useEffect } from 'react';
import { leadsApi, LeadFilters } from '../api/leads';
import type { Lead, CreateLeadDto, UpdateLeadDto, ConvertLeadDto, LeadStats } from '../types';

interface UseLeadsReturn {
  leads: Lead[];
  stats: LeadStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchStats: () => Promise<void>;
  create: (data: CreateLeadDto) => Promise<Lead>;
  update: (id: string, data: UpdateLeadDto) => Promise<Lead>;
  remove: (id: string) => Promise<void>;
  score: (id: string) => Promise<void>;
  convert: (id: string, data: ConvertLeadDto) => Promise<{ accountId?: string; contactId?: string; opportunityId?: string }>;
}

export function useLeads(initialFilters?: LeadFilters): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters | undefined>(initialFilters);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getAll(filters);
      setLeads(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await leadsApi.getStats();
      setStats(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Failed to fetch lead stats:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const create = useCallback(async (data: CreateLeadDto): Promise<Lead> => {
    const lead = await leadsApi.create(data);
    setLeads((prev) => [lead, ...prev]);
    return lead;
  }, []);

  const update = useCallback(async (id: string, data: UpdateLeadDto): Promise<Lead> => {
    const updated = await leadsApi.update(id, data);
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await leadsApi.delete(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const score = useCallback(async (id: string): Promise<void> => {
    const result = await leadsApi.score(id);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, leadScore: result.score } : l))
    );
  }, []);

  const convert = useCallback(async (id: string, data: ConvertLeadDto) => {
    const result = await leadsApi.convert(id, data);
    // Remove converted lead from list
    setLeads((prev) => prev.filter((l) => l.id !== id));
    return result;
  }, []);

  return {
    leads,
    stats,
    loading,
    error,
    refetch: fetchLeads,
    fetchStats,
    create,
    update,
    remove,
    score,
    convert,
  };
}

export function useLead(id: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!id) {
      setLead(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getById(id);
      setLead(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return { lead, loading, error, refetch: fetchLead };
}
