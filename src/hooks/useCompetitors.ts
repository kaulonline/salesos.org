import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { competitorsApi, CompetitorFilters, WinLossFilters } from '../api/competitors';
import type {
  Competitor,
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CreateCompetitorProductDto,
  CreateBattlecardDto,
  UpdateBattlecardDto,
  LinkOpportunityCompetitorDto,
} from '../types/competitor';

// Query keys for competitors
export const competitorKeys = {
  all: ['competitors'] as const,
  lists: () => [...competitorKeys.all, 'list'] as const,
  list: (filters?: CompetitorFilters) => [...competitorKeys.lists(), filters] as const,
  detail: (id: string) => [...competitorKeys.all, 'detail', id] as const,
  products: (competitorId: string) => [...competitorKeys.all, 'products', competitorId] as const,
  battlecards: (competitorId: string) => [...competitorKeys.all, 'battlecards', competitorId] as const,
  opportunityCompetitors: (opportunityId: string) => [...competitorKeys.all, 'opportunity', opportunityId] as const,
  stats: () => [...competitorKeys.all, 'stats'] as const,
  winLoss: (filters?: WinLossFilters) => [...competitorKeys.all, 'winLoss', filters] as const,
};

/**
 * Hook for listing and managing competitors
 */
export function useCompetitors(filters?: CompetitorFilters) {
  const queryClient = useQueryClient();

  const competitorsQuery = useQuery({
    queryKey: competitorKeys.list(filters),
    queryFn: () => competitorsApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: competitorKeys.stats(),
    queryFn: () => competitorsApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCompetitorDto) => competitorsApi.create(data),
    onSuccess: (newCompetitor) => {
      queryClient.setQueryData<Competitor[]>(
        competitorKeys.list(filters),
        (old) => (old ? [newCompetitor, ...old] : [newCompetitor])
      );
      queryClient.invalidateQueries({ queryKey: competitorKeys.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompetitorDto }) =>
      competitorsApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Competitor[]>(
        competitorKeys.list(filters),
        (old) => old?.map((c) => (c.id === updated.id ? updated : c))
      );
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(updated.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => competitorsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Competitor[]>(
        competitorKeys.list(filters),
        (old) => old?.filter((c) => c.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: competitorKeys.stats() });
    },
  });

  return {
    competitors: competitorsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: competitorsQuery.isLoading,
    error: competitorsQuery.error?.message ?? null,
    refetch: competitorsQuery.refetch,
    create: (data: CreateCompetitorDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateCompetitorDto) =>
      updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for getting a single competitor with details
 */
export function useCompetitor(id: string | undefined) {
  const queryClient = useQueryClient();

  const competitorQuery = useQuery({
    queryKey: competitorKeys.detail(id!),
    queryFn: () => competitorsApi.getById(id!),
    enabled: !!id,
  });

  // Products management
  const addProductMutation = useMutation({
    mutationFn: (data: CreateCompetitorProductDto) =>
      competitorsApi.addProduct(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<CreateCompetitorProductDto> }) =>
      competitorsApi.updateProduct(id!, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => competitorsApi.deleteProduct(id!, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
    },
  });

  // Battlecards management
  const createBattlecardMutation = useMutation({
    mutationFn: (data: CreateBattlecardDto) =>
      competitorsApi.createBattlecard(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
    },
  });

  const updateBattlecardMutation = useMutation({
    mutationFn: ({ battlecardId, data }: { battlecardId: string; data: UpdateBattlecardDto }) =>
      competitorsApi.updateBattlecard(battlecardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
    },
  });

  const deleteBattlecardMutation = useMutation({
    mutationFn: (battlecardId: string) =>
      competitorsApi.deleteBattlecard(battlecardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
    },
  });

  return {
    competitor: competitorQuery.data ?? null,
    loading: competitorQuery.isLoading,
    error: competitorQuery.error?.message ?? null,
    refetch: competitorQuery.refetch,
    addProduct: (data: CreateCompetitorProductDto) => addProductMutation.mutateAsync(data),
    updateProduct: (productId: string, data: Partial<CreateCompetitorProductDto>) =>
      updateProductMutation.mutateAsync({ productId, data }),
    deleteProduct: (productId: string) => deleteProductMutation.mutateAsync(productId),
    createBattlecard: (data: CreateBattlecardDto) => createBattlecardMutation.mutateAsync(data),
    updateBattlecard: (battlecardId: string, data: UpdateBattlecardDto) =>
      updateBattlecardMutation.mutateAsync({ battlecardId, data }),
    deleteBattlecard: (battlecardId: string) => deleteBattlecardMutation.mutateAsync(battlecardId),
  };
}

/**
 * Hook for managing competitors on an opportunity
 */
export function useOpportunityCompetitors(opportunityId: string | undefined) {
  const queryClient = useQueryClient();

  const competitorsQuery = useQuery({
    queryKey: competitorKeys.opportunityCompetitors(opportunityId!),
    queryFn: () => competitorsApi.getOpportunityCompetitors(opportunityId!),
    enabled: !!opportunityId,
  });

  const linkMutation = useMutation({
    mutationFn: (data: LinkOpportunityCompetitorDto) =>
      competitorsApi.linkCompetitor(opportunityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: competitorKeys.opportunityCompetitors(opportunityId!),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      competitorId,
      data,
    }: {
      competitorId: string;
      data: Partial<LinkOpportunityCompetitorDto>;
    }) => competitorsApi.updateOpportunityCompetitor(opportunityId!, competitorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: competitorKeys.opportunityCompetitors(opportunityId!),
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (competitorId: string) =>
      competitorsApi.unlinkCompetitor(opportunityId!, competitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: competitorKeys.opportunityCompetitors(opportunityId!),
      });
    },
  });

  const markWinnerMutation = useMutation({
    mutationFn: ({
      competitorId,
      lossReasons,
    }: {
      competitorId: string;
      lossReasons?: string[];
    }) => competitorsApi.markCompetitorAsWinner(opportunityId!, competitorId, lossReasons),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: competitorKeys.opportunityCompetitors(opportunityId!),
      });
      queryClient.invalidateQueries({ queryKey: competitorKeys.stats() });
    },
  });

  return {
    competitors: competitorsQuery.data ?? [],
    loading: competitorsQuery.isLoading,
    error: competitorsQuery.error?.message ?? null,
    refetch: competitorsQuery.refetch,
    link: (data: LinkOpportunityCompetitorDto) => linkMutation.mutateAsync(data),
    update: (competitorId: string, data: Partial<LinkOpportunityCompetitorDto>) =>
      updateMutation.mutateAsync({ competitorId, data }),
    unlink: (competitorId: string) => unlinkMutation.mutateAsync(competitorId),
    markAsWinner: (competitorId: string, lossReasons?: string[]) =>
      markWinnerMutation.mutateAsync({ competitorId, lossReasons }),
    isLinking: linkMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUnlinking: unlinkMutation.isPending,
  };
}

/**
 * Hook for win/loss analytics
 */
export function useWinLossAnalytics(filters?: WinLossFilters) {
  const analyticsQuery = useQuery({
    queryKey: competitorKeys.winLoss(filters),
    queryFn: () => competitorsApi.getWinLossAnalytics(filters),
    staleTime: 5 * 60 * 1000,
  });

  return {
    analytics: analyticsQuery.data ?? [],
    loading: analyticsQuery.isLoading,
    error: analyticsQuery.error?.message ?? null,
    refetch: analyticsQuery.refetch,
  };
}
