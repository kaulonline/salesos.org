import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrichmentApi, EnrichmentProvider, EntityType } from '../api/enrichment';

// Query keys
export const enrichmentQueryKeys = {
  status: ['enrichment', 'status'] as const,
  providers: ['enrichment', 'providers'] as const,
};

/**
 * Hook to get enrichment service status
 */
export function useEnrichmentStatus() {
  return useQuery({
    queryKey: enrichmentQueryKeys.status,
    queryFn: () => enrichmentApi.getStatus(),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get available enrichment providers
 */
export function useEnrichmentProviders() {
  return useQuery({
    queryKey: enrichmentQueryKeys.providers,
    queryFn: () => enrichmentApi.getProviders(),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to enrich a lead
 */
export function useEnrichLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, provider, force }: { leadId: string; provider?: EnrichmentProvider; force?: boolean }) =>
      enrichmentApi.enrichLead(leadId, provider, force),
    onSuccess: (_, variables) => {
      // Invalidate lead queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
    },
  });
}

/**
 * Hook to enrich a contact
 */
export function useEnrichContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, provider, force }: { contactId: string; provider?: EnrichmentProvider; force?: boolean }) =>
      enrichmentApi.enrichContact(contactId, provider, force),
    onSuccess: (_, variables) => {
      // Invalidate contact queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
    },
  });
}

/**
 * Hook to enrich an account
 */
export function useEnrichAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, provider, force }: { accountId: string; provider?: EnrichmentProvider; force?: boolean }) =>
      enrichmentApi.enrichAccount(accountId, provider, force),
    onSuccess: (_, variables) => {
      // Invalidate account queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', variables.accountId] });
    },
  });
}

/**
 * Hook to bulk enrich entities
 */
export function useBulkEnrich() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      entityIds,
      provider,
      force,
    }: {
      entityType: EntityType;
      entityIds: string[];
      provider?: EnrichmentProvider;
      force?: boolean;
    }) => enrichmentApi.bulkEnrich(entityType, entityIds, provider, force),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries based on entity type
      queryClient.invalidateQueries({ queryKey: [variables.entityType + 's'] });
    },
  });
}

/**
 * Hook to preview enrichment
 */
export function usePreviewEnrichment() {
  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      provider,
    }: {
      entityType: EntityType;
      entityId: string;
      provider?: EnrichmentProvider;
    }) => enrichmentApi.previewEnrichment(entityType, entityId, provider),
  });
}

/**
 * Hook to test enrichment connection
 */
export function useTestEnrichmentConnection() {
  return useMutation({
    mutationFn: (provider?: EnrichmentProvider) => enrichmentApi.testConnection(provider),
  });
}

/**
 * Hook to test specific enrichment provider
 */
export function useTestEnrichmentProvider() {
  return useMutation({
    mutationFn: (provider: EnrichmentProvider) => enrichmentApi.testProvider(provider),
  });
}

export default {
  useEnrichmentStatus,
  useEnrichmentProviders,
  useEnrichLead,
  useEnrichContact,
  useEnrichAccount,
  useBulkEnrich,
  usePreviewEnrichment,
  useTestEnrichmentConnection,
  useTestEnrichmentProvider,
};
