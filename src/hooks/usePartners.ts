import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  partnersApi,
  portalApi,
  PartnerFilters,
  DealRegistrationFilters,
} from '../api/partners';
import type {
  Partner,
  CreatePartnerDto,
  UpdatePartnerDto,
  AddPartnerUserDto,
  AssignAccountDto,
  CreateDealRegistrationDto,
  UpdateDealRegistrationDto,
  DealRegistration,
  DealRegistrationStatus,
} from '../types/partner';

// Query keys for partners
export const partnerKeys = {
  all: ['partners'] as const,
  lists: () => [...partnerKeys.all, 'list'] as const,
  list: (filters?: PartnerFilters) => [...partnerKeys.lists(), filters] as const,
  detail: (id: string) => [...partnerKeys.all, 'detail', id] as const,
  users: (partnerId: string) => [...partnerKeys.all, 'users', partnerId] as const,
  accounts: (partnerId: string) => [...partnerKeys.all, 'accounts', partnerId] as const,
  registrations: (partnerId: string) => [...partnerKeys.all, 'registrations', partnerId] as const,
  stats: () => [...partnerKeys.all, 'stats'] as const,
};

export const dealRegKeys = {
  all: ['dealRegistrations'] as const,
  lists: () => [...dealRegKeys.all, 'list'] as const,
  list: (filters?: DealRegistrationFilters) => [...dealRegKeys.lists(), filters] as const,
  stats: () => [...dealRegKeys.all, 'stats'] as const,
};

export const portalKeys = {
  all: ['portal'] as const,
  me: () => [...portalKeys.all, 'me'] as const,
  dashboard: () => [...portalKeys.all, 'dashboard'] as const,
  accounts: (search?: string) => [...portalKeys.all, 'accounts', search] as const,
  registrations: (status?: DealRegistrationStatus) => [...portalKeys.all, 'registrations', status] as const,
  registration: (id: string) => [...portalKeys.all, 'registration', id] as const,
  deals: (status?: string) => [...portalKeys.all, 'deals', status] as const,
};

// ============================================
// Admin Partner Hooks
// ============================================

/**
 * Hook for listing and managing partners (admin)
 */
export function usePartners(filters?: PartnerFilters) {
  const queryClient = useQueryClient();

  const partnersQuery = useQuery({
    queryKey: partnerKeys.list(filters),
    queryFn: () => partnersApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: partnerKeys.stats(),
    queryFn: () => partnersApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePartnerDto) => partnersApi.create(data),
    onSuccess: (newPartner) => {
      queryClient.setQueryData<Partner[]>(
        partnerKeys.list(filters),
        (old) => (old ? [newPartner, ...old] : [newPartner])
      );
      queryClient.invalidateQueries({ queryKey: partnerKeys.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePartnerDto }) =>
      partnersApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Partner[]>(
        partnerKeys.list(filters),
        (old) => old?.map((p) => (p.id === updated.id ? updated : p))
      );
      queryClient.invalidateQueries({ queryKey: partnerKeys.detail(updated.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partnersApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Partner[]>(
        partnerKeys.list(filters),
        (old) => old?.filter((p) => p.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: partnerKeys.stats() });
    },
  });

  return {
    partners: partnersQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: partnersQuery.isLoading,
    error: partnersQuery.error?.message ?? null,
    refetch: partnersQuery.refetch,
    create: (data: CreatePartnerDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdatePartnerDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for getting a single partner with details (admin)
 */
export function usePartner(id: string | undefined) {
  const queryClient = useQueryClient();

  const partnerQuery = useQuery({
    queryKey: partnerKeys.detail(id!),
    queryFn: () => partnersApi.getById(id!),
    enabled: !!id,
  });

  // User management
  const addUserMutation = useMutation({
    mutationFn: (data: AddPartnerUserDto) => partnersApi.addUser(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.detail(id!) });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ partnerUserId, data }: { partnerUserId: string; data: Partial<AddPartnerUserDto> }) =>
      partnersApi.updateUser(id!, partnerUserId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.detail(id!) });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (partnerUserId: string) => partnersApi.removeUser(id!, partnerUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.detail(id!) });
    },
  });

  // Account management
  const assignAccountMutation = useMutation({
    mutationFn: (data: AssignAccountDto) => partnersApi.assignAccount(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.accounts(id!) });
    },
  });

  const unassignAccountMutation = useMutation({
    mutationFn: (accountId: string) => partnersApi.unassignAccount(id!, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.accounts(id!) });
    },
  });

  return {
    partner: partnerQuery.data ?? null,
    loading: partnerQuery.isLoading,
    error: partnerQuery.error?.message ?? null,
    refetch: partnerQuery.refetch,
    addUser: (data: AddPartnerUserDto) => addUserMutation.mutateAsync(data),
    updateUser: (partnerUserId: string, data: Partial<AddPartnerUserDto>) =>
      updateUserMutation.mutateAsync({ partnerUserId, data }),
    removeUser: (partnerUserId: string) => removeUserMutation.mutateAsync(partnerUserId),
    assignAccount: (data: AssignAccountDto) => assignAccountMutation.mutateAsync(data),
    unassignAccount: (accountId: string) => unassignAccountMutation.mutateAsync(accountId),
  };
}

/**
 * Hook for managing deal registrations (admin)
 */
export function useDealRegistrations(filters?: DealRegistrationFilters) {
  const queryClient = useQueryClient();

  const registrationsQuery = useQuery({
    queryKey: dealRegKeys.list(filters),
    queryFn: () => partnersApi.getAllRegistrations(filters),
  });

  const statsQuery = useQuery({
    queryKey: dealRegKeys.stats(),
    queryFn: () => partnersApi.getRegistrationStats(),
    staleTime: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: ({
      partnerId,
      registrationId,
      options,
    }: {
      partnerId: string;
      registrationId: string;
      options?: { commissionRate?: number; protectionDays?: number };
    }) => partnersApi.approveRegistration(partnerId, registrationId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealRegKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealRegKeys.stats() });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      partnerId,
      registrationId,
      reason,
    }: {
      partnerId: string;
      registrationId: string;
      reason: string;
    }) => partnersApi.rejectRegistration(partnerId, registrationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealRegKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealRegKeys.stats() });
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({
      partnerId,
      registrationId,
    }: {
      partnerId: string;
      registrationId: string;
    }) => partnersApi.convertRegistration(partnerId, registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealRegKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealRegKeys.stats() });
    },
  });

  return {
    registrations: registrationsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: registrationsQuery.isLoading,
    error: registrationsQuery.error?.message ?? null,
    refetch: registrationsQuery.refetch,
    approve: (
      partnerId: string,
      registrationId: string,
      options?: { commissionRate?: number; protectionDays?: number }
    ) => approveMutation.mutateAsync({ partnerId, registrationId, options }),
    reject: (partnerId: string, registrationId: string, reason: string) =>
      rejectMutation.mutateAsync({ partnerId, registrationId, reason }),
    convert: (partnerId: string, registrationId: string) =>
      convertMutation.mutateAsync({ partnerId, registrationId }),
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isConverting: convertMutation.isPending,
  };
}

// ============================================
// Partner Portal Hooks
// ============================================

/**
 * Hook for partner portal - current partner profile
 */
export function useMyPartner() {
  const profileQuery = useQuery({
    queryKey: portalKeys.me(),
    queryFn: () => portalApi.getMyPartner(),
  });

  return {
    partner: profileQuery.data?.partner ?? null,
    role: profileQuery.data?.role ?? null,
    isPrimary: profileQuery.data?.isPrimary ?? false,
    loading: profileQuery.isLoading,
    error: profileQuery.error?.message ?? null,
  };
}

/**
 * Hook for partner portal dashboard
 */
export function usePortalDashboard() {
  const dashboardQuery = useQuery({
    queryKey: portalKeys.dashboard(),
    queryFn: () => portalApi.getDashboard(),
    staleTime: 60 * 1000,
  });

  return {
    dashboard: dashboardQuery.data ?? null,
    loading: dashboardQuery.isLoading,
    error: dashboardQuery.error?.message ?? null,
    refetch: dashboardQuery.refetch,
  };
}

/**
 * Hook for partner portal - accounts
 */
export function usePortalAccounts(search?: string) {
  const accountsQuery = useQuery({
    queryKey: portalKeys.accounts(search),
    queryFn: () => portalApi.getAccounts(search),
  });

  return {
    accounts: accountsQuery.data ?? [],
    loading: accountsQuery.isLoading,
    error: accountsQuery.error?.message ?? null,
    refetch: accountsQuery.refetch,
  };
}

/**
 * Hook for partner portal - deal registrations
 */
export function usePortalRegistrations(status?: DealRegistrationStatus) {
  const queryClient = useQueryClient();

  const registrationsQuery = useQuery({
    queryKey: portalKeys.registrations(status),
    queryFn: () => portalApi.getRegistrations(status),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDealRegistrationDto) => portalApi.createRegistration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.registrations() });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealRegistrationDto }) =>
      portalApi.updateRegistration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.registrations() });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => portalApi.submitRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.registrations() });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard() });
    },
  });

  return {
    registrations: registrationsQuery.data ?? [],
    loading: registrationsQuery.isLoading,
    error: registrationsQuery.error?.message ?? null,
    refetch: registrationsQuery.refetch,
    create: (data: CreateDealRegistrationDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateDealRegistrationDto) =>
      updateMutation.mutateAsync({ id, data }),
    submit: (id: string) => submitMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isSubmitting: submitMutation.isPending,
  };
}

/**
 * Hook for partner portal - deals (converted registrations)
 */
export function usePortalDeals(status?: 'open' | 'won' | 'lost') {
  const dealsQuery = useQuery({
    queryKey: portalKeys.deals(status),
    queryFn: () => portalApi.getDeals(status),
  });

  return {
    deals: dealsQuery.data ?? [],
    loading: dealsQuery.isLoading,
    error: dealsQuery.error?.message ?? null,
    refetch: dealsQuery.refetch,
  };
}
