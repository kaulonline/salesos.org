import client from './client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  contactEmail?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
  };
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  isActive: boolean;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface OrganizationsResponse {
  organizations: Organization[];
  total: number;
  page: number;
  pageSize: number;
}

export const organizationsApi = {
  // List all organizations (admin)
  getAll: async (page = 1, pageSize = 20, status?: string, search?: string): Promise<OrganizationsResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const response = await client.get<OrganizationsResponse>(`/organizations?${params.toString()}`);
    return response.data;
  },

  // Get single organization
  getById: async (id: string): Promise<Organization> => {
    const response = await client.get<Organization>(`/organizations/${id}`);
    return response.data;
  },

  // Get organization members
  getMembers: async (organizationId: string, includeInactive = false): Promise<OrganizationMember[]> => {
    const response = await client.get<OrganizationMember[]>(
      `/organizations/${organizationId}/members?includeInactive=${includeInactive}`
    );
    return response.data;
  },

  // Create organization
  create: async (data: { name: string; slug: string; contactEmail?: string }): Promise<Organization> => {
    const response = await client.post<Organization>('/organizations', data);
    return response.data;
  },

  // Update organization
  update: async (id: string, data: Partial<Organization>): Promise<Organization> => {
    const response = await client.patch<Organization>(`/organizations/${id}`, data);
    return response.data;
  },

  // Update member role
  updateMember: async (
    organizationId: string,
    userId: string,
    data: { role?: string; isActive?: boolean }
  ): Promise<OrganizationMember> => {
    const response = await client.patch<OrganizationMember>(
      `/organizations/${organizationId}/members/${userId}`,
      data
    );
    return response.data;
  },

  // Add member
  addMember: async (
    organizationId: string,
    data: { userId: string; role: string }
  ): Promise<OrganizationMember> => {
    const response = await client.post<OrganizationMember>(
      `/organizations/${organizationId}/members`,
      data
    );
    return response.data;
  },

  // Remove member
  removeMember: async (organizationId: string, userId: string): Promise<void> => {
    await client.delete(`/organizations/${organizationId}/members/${userId}`);
  },

  // Delete organization
  delete: async (id: string, force = false): Promise<void> => {
    await client.delete(`/organizations/${id}`, { params: force ? { force: 'true' } : {} });
  },

  // Get organization registration codes
  getCodes: async (organizationId: string): Promise<OrganizationCode[]> => {
    const response = await client.get<OrganizationCode[]>(`/organizations/${organizationId}/codes`);
    return response.data;
  },

  // Create organization registration code
  createCode: async (organizationId: string, data: {
    maxUses?: number;
    expiresAt?: string;
    defaultRole?: string;
  }): Promise<OrganizationCode> => {
    const response = await client.post<OrganizationCode>('/organizations/codes', {
      organizationId,
      ...data,
    });
    return response.data;
  },

  // Revoke organization code
  revokeCode: async (codeId: string): Promise<void> => {
    await client.post(`/organizations/codes/${codeId}/revoke`);
  },

  // Reactivate organization code
  reactivateCode: async (codeId: string): Promise<void> => {
    await client.post(`/organizations/codes/${codeId}/reactivate`);
  },
};

// Organization registration code interface
export interface OrganizationCode {
  id: string;
  code: string;
  organizationId: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'EXHAUSTED';
  maxUses: number;
  currentUses: number;
  expiresAt?: string;
  defaultRole: string;
  createdAt: string;
}

export default organizationsApi;
