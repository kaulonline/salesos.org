import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplatesApi, emailTrackingApi, EmailTemplateFilters, EmailTrackingFilters } from '../api/emailTemplates';
import { queryKeys } from '../lib/queryKeys';
import type {
  EmailTemplate,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTracking,
  SendEmailDto,
} from '../types';

export function useEmailTemplates(filters?: EmailTemplateFilters) {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: queryKeys.emailTemplates.list(filters),
    queryFn: () => emailTemplatesApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.emailTemplates.stats(),
    queryFn: () => emailTemplatesApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEmailTemplateDto) => emailTemplatesApi.create(data),
    onSuccess: (newTemplate) => {
      queryClient.setQueryData<EmailTemplate[]>(
        queryKeys.emailTemplates.list(filters),
        (old) => (old ? [newTemplate, ...old] : [newTemplate])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmailTemplateDto }) =>
      emailTemplatesApi.update(id, data),
    onSuccess: (updatedTemplate) => {
      queryClient.setQueryData<EmailTemplate[]>(
        queryKeys.emailTemplates.list(filters),
        (old) => old?.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailTemplatesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<EmailTemplate[]>(
        queryKeys.emailTemplates.list(filters),
        (old) => old?.filter((t) => t.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.stats() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => emailTemplatesApi.clone(id, name),
    onSuccess: (newTemplate) => {
      queryClient.setQueryData<EmailTemplate[]>(
        queryKeys.emailTemplates.list(filters),
        (old) => (old ? [newTemplate, ...old] : [newTemplate])
      );
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: templatesQuery.isLoading,
    error: templatesQuery.error?.message ?? null,
    refetch: templatesQuery.refetch,
    create: (data: CreateEmailTemplateDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateEmailTemplateDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    clone: (id: string, name?: string) => cloneMutation.mutateAsync({ id, name }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useEmailTemplate(id: string | undefined) {
  const templateQuery = useQuery({
    queryKey: queryKeys.emailTemplates.detail(id!),
    queryFn: () => emailTemplatesApi.getById(id!),
    enabled: !!id,
  });

  const previewMutation = useMutation({
    mutationFn: (mergeData: Record<string, string | number | boolean>) =>
      emailTemplatesApi.preview(id!, mergeData),
  });

  return {
    template: templateQuery.data ?? null,
    loading: templateQuery.isLoading,
    error: templateQuery.error?.message ?? null,
    refetch: templateQuery.refetch,
    preview: (mergeData: Record<string, string | number | boolean>) =>
      previewMutation.mutateAsync(mergeData),
    previewData: previewMutation.data,
    isPreviewing: previewMutation.isPending,
  };
}

export function useMergeFields() {
  const mergeFieldsQuery = useQuery({
    queryKey: queryKeys.emailTemplates.mergeFields(),
    queryFn: () => emailTemplatesApi.getMergeFields(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    mergeFields: mergeFieldsQuery.data ?? [],
    loading: mergeFieldsQuery.isLoading,
    error: mergeFieldsQuery.error?.message ?? null,
  };
}

// Email Tracking hooks
export function useEmailTracking(filters?: EmailTrackingFilters) {
  const trackingQuery = useQuery({
    queryKey: queryKeys.emailTracking.list(filters),
    queryFn: () => emailTrackingApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.emailTracking.stats(),
    queryFn: () => emailTrackingApi.getStats(),
    staleTime: 60 * 1000,
  });

  return {
    emails: trackingQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: trackingQuery.isLoading,
    error: trackingQuery.error?.message ?? null,
    refetch: trackingQuery.refetch,
  };
}

export function useEmailTrackingByEntity(entityType: string, entityId: string) {
  const trackingQuery = useQuery({
    queryKey: queryKeys.emailTracking.byEntity(entityType, entityId),
    queryFn: () => emailTrackingApi.getByEntity(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });

  return {
    emails: trackingQuery.data ?? [],
    loading: trackingQuery.isLoading,
    error: trackingQuery.error?.message ?? null,
    refetch: trackingQuery.refetch,
  };
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (data: SendEmailDto) => emailTrackingApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTracking.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTracking.stats() });
    },
  });

  return {
    send: (data: SendEmailDto) => sendMutation.mutateAsync(data),
    isSending: sendMutation.isPending,
    error: sendMutation.error?.message ?? null,
  };
}
