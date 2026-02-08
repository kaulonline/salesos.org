import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalApi } from '../api/portal';
import type { CreateDealRegistrationDto, UpdateDealRegistrationDto } from '../types/portal';

// ============================================
// Portal Profile & Dashboard
// ============================================

export function usePortalProfile() {
  return useQuery({
    queryKey: ['portal', 'profile'],
    queryFn: portalApi.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function usePortalDashboard() {
  return useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: portalApi.getDashboard,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================
// Portal Accounts
// ============================================

export function usePortalAccounts(search?: string) {
  return useQuery({
    queryKey: ['portal', 'accounts', { search }],
    queryFn: () => portalApi.getAccounts(search),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Portal Deals
// ============================================

export function usePortalDeals(status?: 'open' | 'won' | 'lost') {
  return useQuery({
    queryKey: ['portal', 'deals', { status }],
    queryFn: () => portalApi.getDeals(status),
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// Deal Registrations
// ============================================

export function usePortalRegistrations(status?: string) {
  return useQuery({
    queryKey: ['portal', 'registrations', { status }],
    queryFn: () => portalApi.getRegistrations(status),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePortalRegistration(id: string) {
  return useQuery({
    queryKey: ['portal', 'registrations', id],
    queryFn: () => portalApi.getRegistration(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDealRegistrationDto) => portalApi.createRegistration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'registrations'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'dashboard'] });
    },
  });
}

export function useUpdateRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealRegistrationDto }) =>
      portalApi.updateRegistration(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'registrations'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'registrations', variables.id] });
    },
  });
}

export function useSubmitRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => portalApi.submitRegistration(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'registrations'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'registrations', id] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'dashboard'] });
    },
  });
}
