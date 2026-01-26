import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentRulesApi, AssignmentRuleFilters } from '../api/assignmentRules';
import { queryKeys } from '../lib/queryKeys';
import type {
  AssignmentRule,
  CreateAssignmentRuleDto,
  UpdateAssignmentRuleDto,
  AssignmentRuleEntity,
  TestAssignmentRuleDto,
} from '../types';

export function useAssignmentRules(filters?: AssignmentRuleFilters) {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: queryKeys.assignmentRules.list(filters),
    queryFn: () => assignmentRulesApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.assignmentRules.stats(),
    queryFn: () => assignmentRulesApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAssignmentRuleDto) => assignmentRulesApi.create(data),
    onSuccess: (newRule) => {
      queryClient.setQueryData<AssignmentRule[]>(
        queryKeys.assignmentRules.list(filters),
        (old) => (old ? [...old, newRule] : [newRule])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.assignmentRules.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssignmentRuleDto }) =>
      assignmentRulesApi.update(id, data),
    onSuccess: (updatedRule) => {
      queryClient.setQueryData<AssignmentRule[]>(
        queryKeys.assignmentRules.list(filters),
        (old) => old?.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assignmentRulesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AssignmentRule[]>(
        queryKeys.assignmentRules.list(filters),
        (old) => old?.filter((r) => r.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.assignmentRules.stats() });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => assignmentRulesApi.activate(id),
    onSuccess: (updatedRule) => {
      queryClient.setQueryData<AssignmentRule[]>(
        queryKeys.assignmentRules.list(filters),
        (old) => old?.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      );
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => assignmentRulesApi.deactivate(id),
    onSuccess: (updatedRule) => {
      queryClient.setQueryData<AssignmentRule[]>(
        queryKeys.assignmentRules.list(filters),
        (old) => old?.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      );
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => assignmentRulesApi.clone(id, name),
    onSuccess: (newRule) => {
      queryClient.setQueryData<AssignmentRule[]>(
        queryKeys.assignmentRules.list(filters),
        (old) => (old ? [...old, newRule] : [newRule])
      );
    },
  });

  return {
    rules: rulesQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: rulesQuery.isLoading,
    error: rulesQuery.error?.message ?? null,
    refetch: rulesQuery.refetch,
    create: (data: CreateAssignmentRuleDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateAssignmentRuleDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    activate: (id: string) => activateMutation.mutateAsync(id),
    deactivate: (id: string) => deactivateMutation.mutateAsync(id),
    clone: (id: string, name?: string) => cloneMutation.mutateAsync({ id, name }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useAssignmentRule(id: string | undefined) {
  const ruleQuery = useQuery({
    queryKey: queryKeys.assignmentRules.detail(id!),
    queryFn: () => assignmentRulesApi.getById(id!),
    enabled: !!id,
  });

  return {
    rule: ruleQuery.data ?? null,
    loading: ruleQuery.isLoading,
    error: ruleQuery.error?.message ?? null,
    refetch: ruleQuery.refetch,
  };
}

export function useAssignableFields(entity: AssignmentRuleEntity) {
  const fieldsQuery = useQuery({
    queryKey: queryKeys.assignmentRules.fields(entity),
    queryFn: () => assignmentRulesApi.getAssignableFields(entity),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    fields: fieldsQuery.data ?? [],
    loading: fieldsQuery.isLoading,
    error: fieldsQuery.error?.message ?? null,
  };
}

export function useTestAssignmentRule() {
  const testMutation = useMutation({
    mutationFn: (data: TestAssignmentRuleDto) => assignmentRulesApi.test(data),
  });

  return {
    test: (data: TestAssignmentRuleDto) => testMutation.mutateAsync(data),
    result: testMutation.data,
    isTesting: testMutation.isPending,
    error: testMutation.error?.message ?? null,
    reset: testMutation.reset,
  };
}

export function useExecuteAssignmentRules() {
  const executeMutation = useMutation({
    mutationFn: ({ entity, recordId }: { entity: AssignmentRuleEntity; recordId: string }) =>
      assignmentRulesApi.executeForRecord(entity, recordId),
  });

  return {
    execute: (entity: AssignmentRuleEntity, recordId: string) =>
      executeMutation.mutateAsync({ entity, recordId }),
    result: executeMutation.data,
    isExecuting: executeMutation.isPending,
    error: executeMutation.error?.message ?? null,
  };
}
