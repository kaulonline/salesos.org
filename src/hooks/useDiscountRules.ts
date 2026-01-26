import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discountRulesApi, DiscountRuleFilters } from '../api/discountRules';
import { queryKeys } from '../lib/queryKeys';
import type {
  DiscountRule,
  CreateDiscountRuleDto,
  UpdateDiscountRuleDto,
  ApplyDiscountDto,
} from '../types';

export function useDiscountRules(filters?: DiscountRuleFilters) {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: queryKeys.discountRules.list(filters),
    queryFn: () => discountRulesApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.discountRules.stats(),
    queryFn: () => discountRulesApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDiscountRuleDto) => discountRulesApi.create(data),
    onSuccess: (newRule) => {
      queryClient.setQueryData<DiscountRule[]>(
        queryKeys.discountRules.list(filters),
        (old) => (old ? [newRule, ...old] : [newRule])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.discountRules.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiscountRuleDto }) =>
      discountRulesApi.update(id, data),
    onSuccess: (updatedRule) => {
      queryClient.setQueryData<DiscountRule[]>(
        queryKeys.discountRules.list(filters),
        (old) => old?.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountRulesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<DiscountRule[]>(
        queryKeys.discountRules.list(filters),
        (old) => old?.filter((r) => r.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.discountRules.stats() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => discountRulesApi.clone(id, name),
    onSuccess: (newRule) => {
      queryClient.setQueryData<DiscountRule[]>(
        queryKeys.discountRules.list(filters),
        (old) => (old ? [newRule, ...old] : [newRule])
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => discountRulesApi.toggleActive(id),
    onSuccess: (updatedRule) => {
      queryClient.setQueryData<DiscountRule[]>(
        queryKeys.discountRules.list(filters),
        (old) => old?.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.discountRules.stats() });
    },
  });

  return {
    rules: rulesQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: rulesQuery.isLoading,
    error: rulesQuery.error?.message ?? null,
    refetch: rulesQuery.refetch,
    create: (data: CreateDiscountRuleDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateDiscountRuleDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    clone: (id: string, name: string) => cloneMutation.mutateAsync({ id, name }),
    toggleActive: (id: string) => toggleActiveMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useDiscountRule(id: string | undefined) {
  const ruleQuery = useQuery({
    queryKey: queryKeys.discountRules.detail(id!),
    queryFn: () => discountRulesApi.getById(id!),
    enabled: !!id,
  });

  return {
    rule: ruleQuery.data ?? null,
    loading: ruleQuery.isLoading,
    error: ruleQuery.error?.message ?? null,
    refetch: ruleQuery.refetch,
  };
}

export function usePromoCodeValidation() {
  const validateMutation = useMutation({
    mutationFn: ({ code, quoteId }: { code: string; quoteId: string }) =>
      discountRulesApi.validateCode(code, quoteId),
  });

  return {
    validate: (code: string, quoteId: string) =>
      validateMutation.mutateAsync({ code, quoteId }),
    isValidating: validateMutation.isPending,
    result: validateMutation.data ?? null,
    error: validateMutation.error?.message ?? null,
    reset: validateMutation.reset,
  };
}

export function useApplyDiscount() {
  const queryClient = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: (data: ApplyDiscountDto) => discountRulesApi.applyToQuote(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(variables.quoteId) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ quoteId, ruleId }: { quoteId: string; ruleId: string }) =>
      discountRulesApi.removeFromQuote(quoteId, ruleId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(variables.quoteId) });
    },
  });

  return {
    apply: (data: ApplyDiscountDto) => applyMutation.mutateAsync(data),
    remove: (quoteId: string, ruleId: string) => removeMutation.mutateAsync({ quoteId, ruleId }),
    isApplying: applyMutation.isPending,
    isRemoving: removeMutation.isPending,
    result: applyMutation.data ?? null,
    error: applyMutation.error?.message ?? null,
  };
}

export function useApplicableDiscounts(quoteId: string | undefined) {
  const applicableQuery = useQuery({
    queryKey: queryKeys.discountRules.applicable(quoteId!),
    queryFn: () => discountRulesApi.getApplicableRules(quoteId!),
    enabled: !!quoteId,
  });

  return {
    applicableRules: applicableQuery.data ?? [],
    loading: applicableQuery.isLoading,
    error: applicableQuery.error?.message ?? null,
    refetch: applicableQuery.refetch,
  };
}
