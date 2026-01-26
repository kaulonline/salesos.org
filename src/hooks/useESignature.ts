import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { esignatureApi } from '../api/esignature';
import { queryKeys } from '../lib/queryKeys';
import type {
  ESignatureRequest,
  ESignatureFilters,
  CreateESignatureRequestDto,
  UpdateESignatureRequestDto,
  SendESignatureDto,
  VoidESignatureDto,
  ResendESignatureDto,
  ConfigureProviderDto,
} from '../types/esignature';

export function useESignatureRequests(filters?: ESignatureFilters) {
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: queryKeys.esignature.list(filters),
    queryFn: () => esignatureApi.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateESignatureRequestDto) => esignatureApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.stats() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => esignatureApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.stats() });
    },
  });

  return {
    requests: requestsQuery.data ?? [],
    loading: requestsQuery.isLoading,
    error: requestsQuery.error?.message ?? null,
    refetch: requestsQuery.refetch,
    create: (data: CreateESignatureRequestDto) => createMutation.mutateAsync(data),
    delete: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useESignatureRequest(id: string | undefined) {
  const queryClient = useQueryClient();

  const requestQuery = useQuery({
    queryKey: queryKeys.esignature.detail(id!),
    queryFn: () => esignatureApi.getById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateESignatureRequestDto) => esignatureApi.update(id!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.esignature.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.lists() });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (customMessage?: string) => esignatureApi.send({ requestId: id!, customMessage }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.esignature.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.stats() });
    },
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => esignatureApi.void({ requestId: id!, reason }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.esignature.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.stats() });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (data: Omit<ResendESignatureDto, 'requestId'>) =>
      esignatureApi.resend({ requestId: id!, ...data }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.esignature.detail(id!), updated);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => esignatureApi.refreshStatus(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.esignature.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.lists() });
    },
  });

  return {
    request: requestQuery.data ?? null,
    loading: requestQuery.isLoading,
    error: requestQuery.error?.message ?? null,
    refetch: requestQuery.refetch,
    update: (data: UpdateESignatureRequestDto) => updateMutation.mutateAsync(data),
    send: (customMessage?: string) => sendMutation.mutateAsync(customMessage),
    void: (reason: string) => voidMutation.mutateAsync(reason),
    resend: (data: Omit<ResendESignatureDto, 'requestId'>) => resendMutation.mutateAsync(data),
    refresh: () => refreshMutation.mutateAsync(),
    isUpdating: updateMutation.isPending,
    isSending: sendMutation.isPending,
    isVoiding: voidMutation.isPending,
    isResending: resendMutation.isPending,
    isRefreshing: refreshMutation.isPending,
  };
}

export function useQuoteESignatures(quoteId: string | undefined) {
  const queryClient = useQueryClient();

  const signaturesQuery = useQuery({
    queryKey: queryKeys.esignature.byQuote(quoteId!),
    queryFn: () => esignatureApi.getByQuoteId(quoteId!),
    enabled: !!quoteId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateESignatureRequestDto, 'quoteId'>) =>
      esignatureApi.create({ ...data, quoteId: quoteId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.byQuote(quoteId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.stats() });
    },
  });

  return {
    signatures: signaturesQuery.data ?? [],
    loading: signaturesQuery.isLoading,
    error: signaturesQuery.error?.message ?? null,
    refetch: signaturesQuery.refetch,
    create: (data: Omit<CreateESignatureRequestDto, 'quoteId'>) => createMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
  };
}

export function useESignatureStats() {
  const statsQuery = useQuery({
    queryKey: queryKeys.esignature.stats(),
    queryFn: () => esignatureApi.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: statsQuery.data ?? null,
    loading: statsQuery.isLoading,
    error: statsQuery.error?.message ?? null,
  };
}

export function useESignatureProviders() {
  const queryClient = useQueryClient();

  const providersQuery = useQuery({
    queryKey: queryKeys.esignature.providers(),
    queryFn: () => esignatureApi.getProviders(),
  });

  const configureMutation = useMutation({
    mutationFn: (data: ConfigureProviderDto) => esignatureApi.configureProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esignature.providers() });
    },
  });

  const testMutation = useMutation({
    mutationFn: (provider: string) => esignatureApi.testProvider(provider),
  });

  return {
    providers: providersQuery.data ?? [],
    loading: providersQuery.isLoading,
    error: providersQuery.error?.message ?? null,
    configure: (data: ConfigureProviderDto) => configureMutation.mutateAsync(data),
    testConnection: (provider: string) => testMutation.mutateAsync(provider),
    isConfiguring: configureMutation.isPending,
    isTesting: testMutation.isPending,
    testResult: testMutation.data ?? null,
  };
}

export function useSigningUrl(requestId: string | undefined, signerId: string | undefined) {
  const signingUrlQuery = useQuery({
    queryKey: queryKeys.esignature.signingUrl(requestId!, signerId!),
    queryFn: () => esignatureApi.getSigningUrl(requestId!, signerId!),
    enabled: !!requestId && !!signerId,
    staleTime: 5 * 60 * 1000, // 5 minutes (URLs typically have short expiration)
  });

  return {
    signingUrl: signingUrlQuery.data?.url ?? null,
    expiresAt: signingUrlQuery.data?.expiresAt ?? null,
    loading: signingUrlQuery.isLoading,
    error: signingUrlQuery.error?.message ?? null,
    refetch: signingUrlQuery.refetch,
  };
}

export function useDownloadSignedDocument() {
  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const blob = await esignatureApi.downloadSignedDocument(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed-document-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  return {
    download: (id: string) => downloadMutation.mutateAsync(id),
    isDownloading: downloadMutation.isPending,
    error: downloadMutation.error?.message ?? null,
  };
}
