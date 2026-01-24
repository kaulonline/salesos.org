import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi, ContactFilters } from '../api/contacts';
import { queryKeys } from '../lib/queryKeys';
import type { Contact, CreateContactDto, UpdateContactDto, ContactStats } from '../types';

// Hook for listing contacts with caching and background refresh
export function useContacts(filters?: ContactFilters) {
  const queryClient = useQueryClient();

  // Query for contacts list
  const contactsQuery = useQuery({
    queryKey: queryKeys.contacts.list(filters),
    queryFn: () => contactsApi.getAll(filters),
  });

  // Query for contact stats
  const statsQuery = useQuery({
    queryKey: queryKeys.contacts.stats(),
    queryFn: () => contactsApi.getStats(),
    staleTime: 60 * 1000,
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateContactDto) => contactsApi.create(data),
    onSuccess: (newContact) => {
      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts.list(filters),
        (old) => (old ? [newContact, ...old] : [newContact])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stats() });
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactDto }) =>
      contactsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.list(filters) });
      const previousContacts = queryClient.getQueryData<Contact[]>(queryKeys.contacts.list(filters));

      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts.list(filters),
        (old) => old?.map((c) => (c.id === id ? { ...c, ...data } : c))
      );

      return { previousContacts };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousContacts) {
        queryClient.setQueryData(queryKeys.contacts.list(filters), context.previousContacts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stats() });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.list(filters) });
      const previousContacts = queryClient.getQueryData<Contact[]>(queryKeys.contacts.list(filters));

      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts.list(filters),
        (old) => old?.filter((c) => c.id !== id)
      );

      return { previousContacts };
    },
    onError: (_err, _id, context) => {
      if (context?.previousContacts) {
        queryClient.setQueryData(queryKeys.contacts.list(filters), context.previousContacts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stats() });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => contactsApi.bulkDelete(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.list(filters) });
      const previousContacts = queryClient.getQueryData<Contact[]>(queryKeys.contacts.list(filters));

      queryClient.setQueryData<Contact[]>(
        queryKeys.contacts.list(filters),
        (old) => old?.filter((c) => !ids.includes(c.id))
      );

      return { previousContacts };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousContacts) {
        queryClient.setQueryData(queryKeys.contacts.list(filters), context.previousContacts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stats() });
    },
  });

  return {
    // Data
    contacts: contactsQuery.data ?? [],
    stats: statsQuery.data ?? null,

    // Loading states
    loading: contactsQuery.isLoading,
    isRefetching: contactsQuery.isRefetching,
    statsLoading: statsQuery.isLoading,

    // Error states
    error: contactsQuery.error?.message ?? null,

    // Actions
    refetch: contactsQuery.refetch,
    fetchStats: statsQuery.refetch,

    // Mutations
    create: (data: CreateContactDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateContactDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    bulkDelete: (ids: string[]) => bulkDeleteMutation.mutateAsync(ids),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}

// Hook for single contact
export function useContact(id: string | undefined) {
  const contactQuery = useQuery({
    queryKey: queryKeys.contacts.detail(id!),
    queryFn: () => contactsApi.getById(id!),
    enabled: !!id,
  });

  // Query for contact's opportunities
  const opportunitiesQuery = useQuery({
    queryKey: queryKeys.contacts.opportunities(id!),
    queryFn: () => contactsApi.getOpportunities(id!),
    enabled: !!id,
  });

  return {
    contact: contactQuery.data ?? null,
    opportunities: opportunitiesQuery.data ?? [],
    loading: contactQuery.isLoading,
    error: contactQuery.error?.message ?? null,
    refetch: contactQuery.refetch,
  };
}

// Prefetch helper for hover states
export function usePrefetchContact() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.contacts.detail(id),
      queryFn: () => contactsApi.getById(id),
      staleTime: 30 * 1000,
    });
  };
}
