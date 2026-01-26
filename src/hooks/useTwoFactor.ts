import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { twoFactorApi } from '../api/twoFactor';
import { queryKeys } from '../lib/queryKeys';
import type {
  TwoFactorStatus,
  TwoFactorSetupResponse,
  VerifyTwoFactorSetupDto,
  DisableTwoFactorDto,
  TrustedDevice,
} from '../types';

export function useTwoFactorStatus() {
  const statusQuery = useQuery({
    queryKey: queryKeys.twoFactor.status(),
    queryFn: () => twoFactorApi.getStatus(),
  });

  return {
    status: statusQuery.data ?? null,
    loading: statusQuery.isLoading,
    error: statusQuery.error?.message ?? null,
    refetch: statusQuery.refetch,
  };
}

export function useTwoFactorSetup() {
  const queryClient = useQueryClient();

  const setupMutation = useMutation({
    mutationFn: () => twoFactorApi.setup(),
  });

  const verifySetupMutation = useMutation({
    mutationFn: (data: VerifyTwoFactorSetupDto) => twoFactorApi.verifySetup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor.status() });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (data: DisableTwoFactorDto) => twoFactorApi.disable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor.status() });
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor.trustedDevices() });
    },
  });

  return {
    setup: () => setupMutation.mutateAsync(),
    verifySetup: (data: VerifyTwoFactorSetupDto) => verifySetupMutation.mutateAsync(data),
    disable: (data: DisableTwoFactorDto) => disableMutation.mutateAsync(data),
    setupData: setupMutation.data as TwoFactorSetupResponse | undefined,
    isSettingUp: setupMutation.isPending,
    isVerifying: verifySetupMutation.isPending,
    isDisabling: disableMutation.isPending,
    setupError: setupMutation.error?.message ?? null,
    verifyError: verifySetupMutation.error?.message ?? null,
  };
}

export function useBackupCodes() {
  const queryClient = useQueryClient();

  const codesQuery = useQuery({
    queryKey: queryKeys.twoFactor.backupCodes(),
    queryFn: () => twoFactorApi.getBackupCodes(),
    enabled: false, // Only fetch on demand
  });

  const regenerateMutation = useMutation({
    mutationFn: (password: string) => twoFactorApi.regenerateBackupCodes(password),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.twoFactor.backupCodes(), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor.status() });
    },
  });

  return {
    codes: codesQuery.data ?? null,
    loading: codesQuery.isLoading,
    error: codesQuery.error?.message ?? null,
    fetch: codesQuery.refetch,
    regenerate: (password: string) => regenerateMutation.mutateAsync(password),
    isRegenerating: regenerateMutation.isPending,
  };
}

export function useTrustedDevices() {
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({
    queryKey: queryKeys.twoFactor.trustedDevices(),
    queryFn: () => twoFactorApi.getTrustedDevices(),
  });

  const removeMutation = useMutation({
    mutationFn: (deviceId: string) => twoFactorApi.removeTrustedDevice(deviceId),
    onMutate: async (deviceId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.twoFactor.trustedDevices() });
      const previousDevices = queryClient.getQueryData<TrustedDevice[]>(
        queryKeys.twoFactor.trustedDevices()
      );
      queryClient.setQueryData<TrustedDevice[]>(
        queryKeys.twoFactor.trustedDevices(),
        (old) => old?.filter((d) => d.id !== deviceId)
      );
      return { previousDevices };
    },
    onError: (_err, _deviceId, context) => {
      if (context?.previousDevices) {
        queryClient.setQueryData(queryKeys.twoFactor.trustedDevices(), context.previousDevices);
      }
    },
  });

  const removeAllMutation = useMutation({
    mutationFn: () => twoFactorApi.removeAllTrustedDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor.trustedDevices() });
    },
  });

  return {
    devices: devicesQuery.data ?? [],
    loading: devicesQuery.isLoading,
    error: devicesQuery.error?.message ?? null,
    refetch: devicesQuery.refetch,
    remove: (deviceId: string) => removeMutation.mutateAsync(deviceId),
    removeAll: () => removeAllMutation.mutateAsync(),
    isRemoving: removeMutation.isPending,
    isRemovingAll: removeAllMutation.isPending,
  };
}

export function useTwoFactorEnforcement() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: queryKeys.twoFactor.enforcementSettings(),
    queryFn: () => twoFactorApi.getEnforcementSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof twoFactorApi.updateEnforcementSettings>[0]) =>
      twoFactorApi.updateEnforcementSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.twoFactor.enforcementSettings(), updated);
    },
  });

  return {
    settings: settingsQuery.data ?? null,
    loading: settingsQuery.isLoading,
    error: settingsQuery.error?.message ?? null,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
