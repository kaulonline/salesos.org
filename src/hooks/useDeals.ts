import { useState, useCallback, useEffect } from 'react';
import { opportunitiesApi, OpportunityFilters } from '../api/opportunities';
import type {
  Opportunity,
  CreateOpportunityDto,
  UpdateOpportunityDto,
  CloseLostDto,
  CloseWonDto,
  PipelineStats,
  SalesForecast,
  OpportunityAnalysis,
} from '../types';

interface UseDealsReturn {
  deals: Opportunity[];
  pipelineStats: PipelineStats | null;
  forecast: SalesForecast | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchPipelineStats: () => Promise<void>;
  fetchForecast: () => Promise<void>;
  create: (data: CreateOpportunityDto) => Promise<Opportunity>;
  update: (id: string, data: UpdateOpportunityDto) => Promise<Opportunity>;
  advanceStage: (id: string, notes?: string) => Promise<Opportunity>;
  closeWon: (id: string, data?: CloseWonDto) => Promise<Opportunity>;
  closeLost: (id: string, data: CloseLostDto) => Promise<Opportunity>;
  analyze: (id: string) => Promise<OpportunityAnalysis>;
}

export function useDeals(initialFilters?: OpportunityFilters): UseDealsReturn {
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<OpportunityFilters | undefined>(initialFilters);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await opportunitiesApi.getAll(filters);
      setDeals(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchPipelineStats = useCallback(async () => {
    try {
      const data = await opportunitiesApi.getPipelineStats();
      setPipelineStats(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Failed to fetch pipeline stats:', e.message);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    try {
      const data = await opportunitiesApi.getForecast();
      setForecast(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Failed to fetch forecast:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const create = useCallback(async (data: CreateOpportunityDto): Promise<Opportunity> => {
    const deal = await opportunitiesApi.create(data);
    setDeals((prev) => [deal, ...prev]);
    return deal;
  }, []);

  const update = useCallback(async (id: string, data: UpdateOpportunityDto): Promise<Opportunity> => {
    const updated = await opportunitiesApi.update(id, data);
    setDeals((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }, []);

  const advanceStage = useCallback(async (id: string, notes?: string): Promise<Opportunity> => {
    const updated = await opportunitiesApi.advanceStage(id, notes ? { notes } : undefined);
    setDeals((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }, []);

  const closeWon = useCallback(async (id: string, data?: CloseWonDto): Promise<Opportunity> => {
    const updated = await opportunitiesApi.closeWon(id, data);
    setDeals((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }, []);

  const closeLost = useCallback(async (id: string, data: CloseLostDto): Promise<Opportunity> => {
    const updated = await opportunitiesApi.closeLost(id, data);
    setDeals((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }, []);

  const analyze = useCallback(async (id: string): Promise<OpportunityAnalysis> => {
    return await opportunitiesApi.analyze(id);
  }, []);

  return {
    deals,
    pipelineStats,
    forecast,
    loading,
    error,
    refetch: fetchDeals,
    fetchPipelineStats,
    fetchForecast,
    create,
    update,
    advanceStage,
    closeWon,
    closeLost,
    analyze,
  };
}

export function useDeal(id: string | undefined) {
  const [deal, setDeal] = useState<Opportunity | null>(null);
  const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeal = useCallback(async () => {
    if (!id) {
      setDeal(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await opportunitiesApi.getById(id);
      setDeal(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch deal');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAnalysis = useCallback(async () => {
    if (!id) return;
    try {
      const data = await opportunitiesApi.analyze(id);
      setAnalysis(data);
    } catch (err: unknown) {
      console.error('Failed to fetch analysis');
    }
  }, [id]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  return { deal, analysis, loading, error, refetch: fetchDeal, fetchAnalysis };
}
