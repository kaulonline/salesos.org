import client from './client';
import type {
  Profile,
  CreateProfileDto,
  UpdateProfileDto,
  ProfileUser,
  AssignUsersToProfileDto,
  ProfileStats,
  PermissionModuleDefinition,
  QueryFilters,
} from '../types';

export interface ProfileFilters extends QueryFilters {
  isSystem?: boolean;
}

export const profilesApi = {
  /**
   * Get all profiles
   */
  getAll: async (filters?: ProfileFilters): Promise<Profile[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Profile[]>(`/profiles?${params.toString()}`);
    return response.data;
  },

  /**
   * Get profile statistics
   */
  getStats: async (): Promise<ProfileStats> => {
    const response = await client.get<ProfileStats>('/profiles/stats');
    return response.data;
  },

  /**
   * Get a single profile by ID
   */
  getById: async (id: string): Promise<Profile> => {
    const response = await client.get<Profile>(`/profiles/${id}`);
    return response.data;
  },

  /**
   * Create a new profile
   */
  create: async (data: CreateProfileDto): Promise<Profile> => {
    const response = await client.post<Profile>('/profiles', data);
    return response.data;
  },

  /**
   * Update a profile
   */
  update: async (id: string, data: UpdateProfileDto): Promise<Profile> => {
    const response = await client.patch<Profile>(`/profiles/${id}`, data);
    return response.data;
  },

  /**
   * Delete a profile
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/profiles/${id}`);
  },

  /**
   * Clone a profile
   */
  clone: async (id: string, name: string): Promise<Profile> => {
    const response = await client.post<Profile>(`/profiles/${id}/clone`, { name });
    return response.data;
  },

  /**
   * Get users assigned to a profile
   */
  getUsers: async (profileId: string): Promise<ProfileUser[]> => {
    const response = await client.get<ProfileUser[]>(`/profiles/${profileId}/users`);
    return response.data;
  },

  /**
   * Assign users to a profile
   */
  assignUsers: async (profileId: string, data: AssignUsersToProfileDto): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>(`/profiles/${profileId}/assign-users`, data);
    return response.data;
  },

  /**
   * Get all available permission modules
   */
  getPermissionModules: async (): Promise<PermissionModuleDefinition[]> => {
    const response = await client.get<PermissionModuleDefinition[]>('/profiles/permission-modules');
    return response.data;
  },

  /**
   * Set profile as default
   */
  setDefault: async (id: string): Promise<Profile> => {
    const response = await client.post<Profile>(`/profiles/${id}/set-default`);
    return response.data;
  },
};

export default profilesApi;
