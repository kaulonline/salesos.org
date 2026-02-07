import { useState, useCallback, useEffect } from 'react';
import { outcomeBillingApi, adminOutcomeBillingApi } from '../api';
import type {
  OutcomePricingPlan,
  OutcomeEvent,
  OutcomeBillingStats,
  AdminDashboardStats,
  OutcomeEventStatus,
  CreateOutcomePricingPlanDto,
  UpdateOutcomePricingPlanDto,
  ListOutcomeEventsParams,
  ListOutcomePlansParams,
} from '../api/outcomeBilling';
import { logger } from '../lib/logger';

// ============= Organization Hooks (User's own org) =============

/**
 * Hook to fetch the current organization's outcome pricing plan
 */
export function useMyOutcomePlan() {
  const [plan, setPlan] = useState<OutcomePricingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await outcomeBillingApi.getMyPlan();
      setPlan(data);
    } catch (err) {
      logger.error('Failed to fetch outcome pricing plan:', err);
      setError('Failed to load pricing plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    plan,
    loading,
    error,
    refetch: fetchPlan,
  };
}

/**
 * Hook to fetch outcome events for the current organization
 */
export function useMyOutcomeEvents(initialParams?: ListOutcomeEventsParams) {
  const [events, setEvents] = useState<OutcomeEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (params?: ListOutcomeEventsParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await outcomeBillingApi.getMyEvents({
        page: params?.page || page,
        limit: params?.limit || 20,
        status: params?.status,
        startDate: params?.startDate,
        endDate: params?.endDate,
      });
      setEvents(response.data);
      setTotal(response.total);
      if (params?.page) setPage(params.page);
    } catch (err) {
      logger.error('Failed to fetch outcome events:', err);
      setError('Failed to load outcome events');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    total,
    page,
    setPage: (newPage: number) => fetchEvents({ page: newPage }),
    loading,
    error,
    refetch: fetchEvents,
  };
}

/**
 * Hook to fetch billing stats for the current organization
 */
export function useMyOutcomeBillingStats() {
  const [stats, setStats] = useState<OutcomeBillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await outcomeBillingApi.getMyStats();
      setStats(data);
    } catch (err) {
      logger.error('Failed to fetch outcome billing stats:', err);
      setError('Failed to load billing statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

// ============= Admin Hooks =============

/**
 * Hook to fetch admin dashboard stats for outcome billing
 */
export function useAdminOutcomeDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminOutcomeBillingApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      logger.error('Failed to fetch outcome billing dashboard:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboard,
    loading,
    error,
    refetch: fetchDashboard,
  };
}

/**
 * Hook to manage outcome pricing plans (admin)
 */
export function useAdminOutcomePlans(initialParams?: ListOutcomePlansParams) {
  const [plans, setPlans] = useState<OutcomePricingPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async (params?: ListOutcomePlansParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminOutcomeBillingApi.listPlans({
        page: params?.page || page,
        limit: params?.limit || 20,
        isActive: params?.isActive,
      });
      setPlans(response.data);
      setTotal(response.total);
      if (params?.page) setPage(params.page);
    } catch (err) {
      logger.error('Failed to fetch outcome pricing plans:', err);
      setError('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (data: CreateOutcomePricingPlanDto) => {
    try {
      const newPlan = await adminOutcomeBillingApi.createPlan(data);
      setPlans((prev) => [newPlan, ...prev]);
      setTotal((prev) => prev + 1);
      return newPlan;
    } catch (err) {
      logger.error('Failed to create pricing plan:', err);
      throw err;
    }
  };

  const updatePlan = async (id: string, data: UpdateOutcomePricingPlanDto) => {
    try {
      const updated = await adminOutcomeBillingApi.updatePlan(id, data);
      setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err) {
      logger.error('Failed to update pricing plan:', err);
      throw err;
    }
  };

  const deletePlan = async (id: string) => {
    try {
      await adminOutcomeBillingApi.deletePlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      logger.error('Failed to delete pricing plan:', err);
      throw err;
    }
  };

  return {
    plans,
    total,
    page,
    setPage: (newPage: number) => fetchPlans({ page: newPage }),
    loading,
    error,
    refetch: fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  };
}

/**
 * Hook to manage outcome events (admin)
 */
export function useAdminOutcomeEvents(initialParams?: ListOutcomeEventsParams) {
  const [events, setEvents] = useState<OutcomeEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (params?: ListOutcomeEventsParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminOutcomeBillingApi.listEvents({
        page: params?.page || page,
        limit: params?.limit || 20,
        status: params?.status,
        organizationId: params?.organizationId,
        startDate: params?.startDate,
        endDate: params?.endDate,
      });
      setEvents(response.data);
      setTotal(response.total);
      if (params?.page) setPage(params.page);
    } catch (err) {
      logger.error('Failed to fetch outcome events:', err);
      setError('Failed to load outcome events');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const waiveEvent = async (id: string, reason: string) => {
    try {
      const updated = await adminOutcomeBillingApi.waiveEvent(id, reason);
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    } catch (err) {
      logger.error('Failed to waive event:', err);
      throw err;
    }
  };

  const voidEvent = async (id: string, reason: string) => {
    try {
      const updated = await adminOutcomeBillingApi.voidEvent(id, reason);
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    } catch (err) {
      logger.error('Failed to void event:', err);
      throw err;
    }
  };

  const resolveReview = async (id: string, action: 'approve' | 'void' | 'waive', reason?: string) => {
    try {
      const updated = await adminOutcomeBillingApi.resolveReview(id, action, reason);
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    } catch (err) {
      logger.error('Failed to resolve review:', err);
      throw err;
    }
  };

  const generateInvoice = async (orgId: string) => {
    try {
      const result = await adminOutcomeBillingApi.generateInvoice(orgId);
      return result;
    } catch (err) {
      logger.error('Failed to generate invoice:', err);
      throw err;
    }
  };

  const processBilling = async () => {
    try {
      const result = await adminOutcomeBillingApi.processBilling();
      return result;
    } catch (err) {
      logger.error('Failed to process billing:', err);
      throw err;
    }
  };

  return {
    events,
    total,
    page,
    setPage: (newPage: number) => fetchEvents({ page: newPage }),
    loading,
    error,
    refetch: fetchEvents,
    waiveEvent,
    voidEvent,
    resolveReview,
    generateInvoice,
    processBilling,
  };
}

/**
 * Hook to get stats for a specific organization (admin)
 */
export function useAdminOrganizationOutcomeStats(organizationId: string | null) {
  const [stats, setStats] = useState<OutcomeBillingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!organizationId) {
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await adminOutcomeBillingApi.getOrganizationStats(organizationId);
      setStats(data);
    } catch (err) {
      logger.error('Failed to fetch organization outcome stats:', err);
      setError('Failed to load organization statistics');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
