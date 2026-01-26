import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webFormsApi, WebFormFilters, WebFormSubmissionFilters } from '../api/webForms';
import { queryKeys } from '../lib/queryKeys';
import type { WebForm, CreateWebFormDto, UpdateWebFormDto } from '../types';

export function useWebForms(filters?: WebFormFilters) {
  const queryClient = useQueryClient();

  const formsQuery = useQuery({
    queryKey: queryKeys.webForms.list(filters),
    queryFn: () => webFormsApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.webForms.stats(),
    queryFn: () => webFormsApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWebFormDto) => webFormsApi.create(data),
    onSuccess: (newForm) => {
      queryClient.setQueryData<WebForm[]>(
        queryKeys.webForms.list(filters),
        (old) => (old ? [newForm, ...old] : [newForm])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.webForms.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebFormDto }) =>
      webFormsApi.update(id, data),
    onSuccess: (updatedForm) => {
      queryClient.setQueryData<WebForm[]>(
        queryKeys.webForms.list(filters),
        (old) => old?.map((f) => (f.id === updatedForm.id ? updatedForm : f))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webFormsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<WebForm[]>(
        queryKeys.webForms.list(filters),
        (old) => old?.filter((f) => f.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.webForms.stats() });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => webFormsApi.activate(id),
    onSuccess: (updatedForm) => {
      queryClient.setQueryData<WebForm[]>(
        queryKeys.webForms.list(filters),
        (old) => old?.map((f) => (f.id === updatedForm.id ? updatedForm : f))
      );
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => webFormsApi.deactivate(id),
    onSuccess: (updatedForm) => {
      queryClient.setQueryData<WebForm[]>(
        queryKeys.webForms.list(filters),
        (old) => old?.map((f) => (f.id === updatedForm.id ? updatedForm : f))
      );
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => webFormsApi.clone(id, name),
    onSuccess: (newForm) => {
      queryClient.setQueryData<WebForm[]>(
        queryKeys.webForms.list(filters),
        (old) => (old ? [newForm, ...old] : [newForm])
      );
    },
  });

  return {
    forms: formsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: formsQuery.isLoading,
    error: formsQuery.error?.message ?? null,
    refetch: formsQuery.refetch,
    create: (data: CreateWebFormDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateWebFormDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    activate: (id: string) => activateMutation.mutateAsync(id),
    deactivate: (id: string) => deactivateMutation.mutateAsync(id),
    clone: (id: string, name?: string) => cloneMutation.mutateAsync({ id, name }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useWebForm(id: string | undefined) {
  const formQuery = useQuery({
    queryKey: queryKeys.webForms.detail(id!),
    queryFn: () => webFormsApi.getById(id!),
    enabled: !!id,
  });

  const embedCodeQuery = useQuery({
    queryKey: queryKeys.webForms.embedCode(id!),
    queryFn: () => webFormsApi.getEmbedCode(id!),
    enabled: !!id,
  });

  return {
    form: formQuery.data ?? null,
    embedCode: embedCodeQuery.data ?? null,
    loading: formQuery.isLoading,
    error: formQuery.error?.message ?? null,
    refetch: formQuery.refetch,
  };
}

export function useWebFormSubmissions(formId: string | undefined, filters?: WebFormSubmissionFilters) {
  const submissionsQuery = useQuery({
    queryKey: queryKeys.webForms.submissions(formId!),
    queryFn: () => webFormsApi.getSubmissions(formId!, filters),
    enabled: !!formId,
  });

  return {
    submissions: submissionsQuery.data ?? [],
    loading: submissionsQuery.isLoading,
    error: submissionsQuery.error?.message ?? null,
    refetch: submissionsQuery.refetch,
  };
}

export function useCheckSlugAvailability() {
  const checkMutation = useMutation({
    mutationFn: (slug: string) => webFormsApi.checkSlugAvailability(slug),
  });

  return {
    check: (slug: string) => checkMutation.mutateAsync(slug),
    isAvailable: checkMutation.data?.available,
    isChecking: checkMutation.isPending,
    error: checkMutation.error?.message ?? null,
  };
}
