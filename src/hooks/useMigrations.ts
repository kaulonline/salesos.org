/**
 * React Query hooks for CRM migrations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCRMTemplate,
  suggestFieldMappings,
  detectCRMType,
  createMigration,
  getMigrationStatus,
  getMigrationHistory,
  getMigrationStats,
  deleteMigration,
  cancelMigration,
  type EntityType,
  type SupportedCRM,
  type MigrationFieldMapping,
  type MigrationStatus,
} from '../api/migrations';

/**
 * Fetch CRM template
 */
export function useCRMTemplate(crmType: SupportedCRM, entityType: EntityType) {
  return useQuery({
    queryKey: ['crm-template', crmType, entityType],
    queryFn: () => getCRMTemplate(crmType, entityType),
    enabled: !!crmType && !!entityType,
    staleTime: 1000 * 60 * 60, // 1 hour - templates rarely change
  });
}

/**
 * Get AI field mapping suggestions
 */
export function useSuggestFieldMappings() {
  return useMutation({
    mutationFn: ({
      headers,
      entityType,
      crmType,
    }: {
      headers: string[];
      entityType: EntityType;
      crmType?: SupportedCRM;
    }) => suggestFieldMappings(headers, entityType, crmType),
  });
}

/**
 * Detect CRM type from headers
 */
export function useDetectCRM() {
  return useMutation({
    mutationFn: (headers: string[]) => detectCRMType(headers),
  });
}

/**
 * Create a new migration
 */
export function useCreateMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      sourceCRM: string;
      entityType: string;
      fileName: string;
      fileSize: number;
      totalRows: number;
      fieldMappings: MigrationFieldMapping[];
    }) => createMigration(data),
    onSuccess: () => {
      // Invalidate migration history to refetch
      queryClient.invalidateQueries({ queryKey: ['migration-history'] });
      queryClient.invalidateQueries({ queryKey: ['migration-stats'] });
    },
  });
}

/**
 * Get migration status (with automatic polling)
 */
export function useMigrationStatus(migrationId: string | null, pollInterval = 2000) {
  return useQuery({
    queryKey: ['migration-status', migrationId],
    queryFn: () => getMigrationStatus(migrationId!),
    enabled: !!migrationId,
    refetchInterval: (data) => {
      // Stop polling if migration is completed, failed, or cancelled
      if (
        data?.status === 'COMPLETED' ||
        data?.status === 'FAILED' ||
        data?.status === 'CANCELLED'
      ) {
        return false;
      }
      return pollInterval;
    },
  });
}

/**
 * Get migration history
 */
export function useMigrationHistory(filters?: {
  sourceCRM?: string;
  entityType?: string;
  status?: MigrationStatus;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['migration-history', filters],
    queryFn: () => getMigrationHistory(filters),
  });
}

/**
 * Get migration statistics
 */
export function useMigrationStats() {
  return useQuery({
    queryKey: ['migration-stats'],
    queryFn: () => getMigrationStats(),
  });
}

/**
 * Delete a migration
 */
export function useDeleteMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (migrationId: string) => deleteMigration(migrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-history'] });
      queryClient.invalidateQueries({ queryKey: ['migration-stats'] });
    },
  });
}

/**
 * Cancel a migration
 */
export function useCancelMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (migrationId: string) => cancelMigration(migrationId),
    onSuccess: (_, migrationId) => {
      queryClient.invalidateQueries({
        queryKey: ['migration-status', migrationId],
      });
      queryClient.invalidateQueries({ queryKey: ['migration-history'] });
    },
  });
}
