import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFieldsApi, CustomFieldFilters } from '../api/customFields';
import { queryKeys } from '../lib/queryKeys';
import type {
  CustomField,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldEntity,
  PicklistValue,
  CreatePicklistValueDto,
  UpdatePicklistValueDto,
} from '../types';

export function useCustomFields(filters?: CustomFieldFilters) {
  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: queryKeys.customFields.list(filters),
    queryFn: () => customFieldsApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.customFields.stats(),
    queryFn: () => customFieldsApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomFieldDto) => customFieldsApi.create(data),
    onSuccess: (newField) => {
      queryClient.setQueryData<CustomField[]>(
        queryKeys.customFields.list(filters),
        (old) => (old ? [...old, newField] : [newField])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomFieldDto }) =>
      customFieldsApi.update(id, data),
    onSuccess: (updatedField) => {
      queryClient.setQueryData<CustomField[]>(
        queryKeys.customFields.list(filters),
        (old) => old?.map((f) => (f.id === updatedField.id ? updatedField : f))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customFieldsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<CustomField[]>(
        queryKeys.customFields.list(filters),
        (old) => old?.filter((f) => f.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields.stats() });
    },
  });

  return {
    fields: fieldsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: fieldsQuery.isLoading,
    error: fieldsQuery.error?.message ?? null,
    refetch: fieldsQuery.refetch,
    create: (data: CreateCustomFieldDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateCustomFieldDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useCustomFieldsByEntity(entity: CustomFieldEntity) {
  const fieldsQuery = useQuery({
    queryKey: queryKeys.customFields.byEntity(entity),
    queryFn: () => customFieldsApi.getByEntity(entity),
  });

  return {
    fields: fieldsQuery.data ?? [],
    loading: fieldsQuery.isLoading,
    error: fieldsQuery.error?.message ?? null,
    refetch: fieldsQuery.refetch,
  };
}

export function useCustomField(id: string | undefined) {
  const queryClient = useQueryClient();

  const fieldQuery = useQuery({
    queryKey: queryKeys.customFields.detail(id!),
    queryFn: () => customFieldsApi.getById(id!),
    enabled: !!id,
  });

  const addPicklistValueMutation = useMutation({
    mutationFn: (data: CreatePicklistValueDto) => customFieldsApi.addPicklistValue(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields.detail(id!) });
    },
  });

  const updatePicklistValueMutation = useMutation({
    mutationFn: ({ valueId, data }: { valueId: string; data: UpdatePicklistValueDto }) =>
      customFieldsApi.updatePicklistValue(id!, valueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields.detail(id!) });
    },
  });

  const deletePicklistValueMutation = useMutation({
    mutationFn: (valueId: string) => customFieldsApi.deletePicklistValue(id!, valueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields.detail(id!) });
    },
  });

  return {
    field: fieldQuery.data ?? null,
    loading: fieldQuery.isLoading,
    error: fieldQuery.error?.message ?? null,
    refetch: fieldQuery.refetch,
    addPicklistValue: (data: CreatePicklistValueDto) => addPicklistValueMutation.mutateAsync(data),
    updatePicklistValue: (valueId: string, data: UpdatePicklistValueDto) =>
      updatePicklistValueMutation.mutateAsync({ valueId, data }),
    deletePicklistValue: (valueId: string) => deletePicklistValueMutation.mutateAsync(valueId),
  };
}
