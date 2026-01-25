import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, CampaignFilters } from '../api/campaigns';
import { queryKeys } from '../lib/queryKeys';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStats,
  CampaignMember,
  AddCampaignMemberDto,
} from '../types';

// Hook for listing campaigns with caching and background refresh
export function useCampaigns(filters?: CampaignFilters) {
  const queryClient = useQueryClient();

  // Query for campaigns list
  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns.list(filters),
    queryFn: () => campaignsApi.getAll(filters),
  });

  // Query for campaign stats
  const statsQuery = useQuery({
    queryKey: queryKeys.campaigns.stats(),
    queryFn: () => campaignsApi.getStats(),
    staleTime: 60 * 1000, // Stats can be stale for 1 minute
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateCampaignDto) => campaignsApi.create(data),
    onSuccess: (newCampaign) => {
      queryClient.setQueryData<Campaign[]>(
        queryKeys.campaigns.list(filters),
        (old) => (old ? [newCampaign, ...old] : [newCampaign])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.stats() });
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampaignDto }) =>
      campaignsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.campaigns.list(filters) });
      const previousCampaigns = queryClient.getQueryData<Campaign[]>(queryKeys.campaigns.list(filters));

      queryClient.setQueryData<Campaign[]>(
        queryKeys.campaigns.list(filters),
        (old) => old?.map((c) => (c.id === id ? { ...c, ...data } : c))
      );

      return { previousCampaigns };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCampaigns) {
        queryClient.setQueryData(queryKeys.campaigns.list(filters), context.previousCampaigns);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.stats() });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.campaigns.list(filters) });
      const previousCampaigns = queryClient.getQueryData<Campaign[]>(queryKeys.campaigns.list(filters));

      queryClient.setQueryData<Campaign[]>(
        queryKeys.campaigns.list(filters),
        (old) => old?.filter((c) => c.id !== id)
      );

      return { previousCampaigns };
    },
    onError: (_err, _id, context) => {
      if (context?.previousCampaigns) {
        queryClient.setQueryData(queryKeys.campaigns.list(filters), context.previousCampaigns);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.stats() });
    },
  });

  return {
    // Data
    campaigns: campaignsQuery.data ?? [],
    stats: statsQuery.data ?? null,

    // Loading states
    loading: campaignsQuery.isLoading,
    isRefetching: campaignsQuery.isRefetching,
    statsLoading: statsQuery.isLoading,

    // Error states
    error: campaignsQuery.error?.message ?? null,
    statsError: statsQuery.error?.message ?? null,

    // Actions
    refetch: campaignsQuery.refetch,

    // Mutations
    create: (data: CreateCampaignDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateCampaignDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for single campaign with members
export function useCampaign(id: string | undefined) {
  const queryClient = useQueryClient();

  // Query for campaign details
  const campaignQuery = useQuery({
    queryKey: queryKeys.campaigns.detail(id!),
    queryFn: () => campaignsApi.getById(id!),
    enabled: !!id,
  });

  // Query for campaign members
  const membersQuery = useQuery({
    queryKey: queryKeys.campaigns.members(id!),
    queryFn: () => campaignsApi.getMembers(id!),
    enabled: !!id,
  });

  // Query for performance metrics
  const performanceQuery = useQuery({
    queryKey: queryKeys.campaigns.performance(id!),
    queryFn: () => campaignsApi.getPerformance(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (data: AddCampaignMemberDto) => campaignsApi.addMember(id!, data),
    onSuccess: (newMember) => {
      queryClient.setQueryData<CampaignMember[]>(
        queryKeys.campaigns.members(id!),
        (old) => (old ? [...old, newMember] : [newMember])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.performance(id!) });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => campaignsApi.removeMember(id!, memberId),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.campaigns.members(id!) });
      const previousMembers = queryClient.getQueryData<CampaignMember[]>(queryKeys.campaigns.members(id!));

      queryClient.setQueryData<CampaignMember[]>(
        queryKeys.campaigns.members(id!),
        (old) => old?.filter((m) => m.id !== memberId)
      );

      return { previousMembers };
    },
    onError: (_err, _memberId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(queryKeys.campaigns.members(id!), context.previousMembers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.members(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.performance(id!) });
    },
  });

  // Update member status mutation
  const updateMemberStatusMutation = useMutation({
    mutationFn: ({
      memberId,
      status,
    }: {
      memberId: string;
      status: 'SENT' | 'RESPONDED' | 'CONVERTED' | 'OPTED_OUT';
    }) => campaignsApi.updateMemberStatus(id!, memberId, status),
    onSuccess: (updatedMember) => {
      queryClient.setQueryData<CampaignMember[]>(
        queryKeys.campaigns.members(id!),
        (old) => old?.map((m) => (m.id === updatedMember.id ? updatedMember : m))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.performance(id!) });
    },
  });

  // Bulk add members mutation
  const bulkAddMembersMutation = useMutation({
    mutationFn: (members: AddCampaignMemberDto[]) => campaignsApi.bulkAddMembers(id!, members),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.members(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.performance(id!) });
    },
  });

  return {
    // Data
    campaign: campaignQuery.data ?? null,
    members: membersQuery.data ?? [],
    performance: performanceQuery.data ?? null,

    // Loading states
    loading: campaignQuery.isLoading,
    membersLoading: membersQuery.isLoading,
    performanceLoading: performanceQuery.isLoading,

    // Error states
    error: campaignQuery.error?.message ?? null,

    // Actions
    refetch: campaignQuery.refetch,
    refetchMembers: membersQuery.refetch,

    // Member mutations
    addMember: (data: AddCampaignMemberDto) => addMemberMutation.mutateAsync(data),
    removeMember: (memberId: string) => removeMemberMutation.mutateAsync(memberId),
    updateMemberStatus: (memberId: string, status: 'SENT' | 'RESPONDED' | 'CONVERTED' | 'OPTED_OUT') =>
      updateMemberStatusMutation.mutateAsync({ memberId, status }),
    bulkAddMembers: (members: AddCampaignMemberDto[]) => bulkAddMembersMutation.mutateAsync(members),

    // Mutation states
    isAddingMember: addMemberMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    isBulkAdding: bulkAddMembersMutation.isPending,
  };
}

// Hook for campaign opportunities
export function useCampaignOpportunities(campaignId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.opportunities(campaignId!),
    queryFn: () => campaignsApi.getOpportunities(campaignId!),
    enabled: !!campaignId,
  });
}

// Hook for campaign leads
export function useCampaignLeads(campaignId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.leads(campaignId!),
    queryFn: () => campaignsApi.getLeads(campaignId!),
    enabled: !!campaignId,
  });
}
