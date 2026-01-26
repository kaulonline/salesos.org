import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi, ProfileFilters } from '../api/profiles';
import { queryKeys } from '../lib/queryKeys';
import type { Profile, CreateProfileDto, UpdateProfileDto, AssignUsersToProfileDto } from '../types';

export function useProfiles(filters?: ProfileFilters) {
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: queryKeys.profiles.list(filters),
    queryFn: () => profilesApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.profiles.stats(),
    queryFn: () => profilesApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProfileDto) => profilesApi.create(data),
    onSuccess: (newProfile) => {
      queryClient.setQueryData<Profile[]>(
        queryKeys.profiles.list(filters),
        (old) => (old ? [...old, newProfile] : [newProfile])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileDto }) =>
      profilesApi.update(id, data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<Profile[]>(
        queryKeys.profiles.list(filters),
        (old) => old?.map((p) => (p.id === updatedProfile.id ? updatedProfile : p))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => profilesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Profile[]>(
        queryKeys.profiles.list(filters),
        (old) => old?.filter((p) => p.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.stats() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => profilesApi.clone(id, name),
    onSuccess: (newProfile) => {
      queryClient.setQueryData<Profile[]>(
        queryKeys.profiles.list(filters),
        (old) => (old ? [...old, newProfile] : [newProfile])
      );
    },
  });

  return {
    profiles: profilesQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: profilesQuery.isLoading,
    error: profilesQuery.error?.message ?? null,
    refetch: profilesQuery.refetch,
    create: (data: CreateProfileDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateProfileDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    clone: (id: string, name: string) => cloneMutation.mutateAsync({ id, name }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useProfile(id: string | undefined) {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: queryKeys.profiles.detail(id!),
    queryFn: () => profilesApi.getById(id!),
    enabled: !!id,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.profiles.users(id!),
    queryFn: () => profilesApi.getUsers(id!),
    enabled: !!id,
  });

  const assignUsersMutation = useMutation({
    mutationFn: (data: AssignUsersToProfileDto) => profilesApi.assignUsers(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.users(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.lists() });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => profilesApi.setDefault(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.lists() });
    },
  });

  return {
    profile: profileQuery.data ?? null,
    users: usersQuery.data ?? [],
    loading: profileQuery.isLoading,
    usersLoading: usersQuery.isLoading,
    error: profileQuery.error?.message ?? null,
    refetch: profileQuery.refetch,
    refetchUsers: usersQuery.refetch,
    assignUsers: (data: AssignUsersToProfileDto) => assignUsersMutation.mutateAsync(data),
    setDefault: () => setDefaultMutation.mutateAsync(),
  };
}

export function usePermissionModules() {
  const modulesQuery = useQuery({
    queryKey: queryKeys.profiles.modules(),
    queryFn: () => profilesApi.getPermissionModules(),
    staleTime: 5 * 60 * 1000, // 5 minutes - rarely changes
  });

  return {
    modules: modulesQuery.data ?? [],
    loading: modulesQuery.isLoading,
    error: modulesQuery.error?.message ?? null,
  };
}
