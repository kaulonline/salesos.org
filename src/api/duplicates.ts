import client from './client';

export interface DuplicateSetMember {
  id: string;
  duplicateSetId: string;
  entityId: string;
  isPrimary: boolean;
}

export interface DuplicateSet {
  id: string;
  organizationId: string;
  entityType: string;
  status: 'OPEN' | 'MERGED' | 'DISMISSED';
  confidence: number;
  matchReason: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  members: DuplicateSetMember[];
}

export interface MergeRequest {
  survivorId: string;
  mergedIds: string[];
  entityType: string;
  fieldResolutions?: Record<string, { sourceId: string; value: any }>;
}

export const duplicatesApi = {
  getDuplicateSets: async (entityType?: string, status?: string): Promise<DuplicateSet[]> => {
    const params = new URLSearchParams();
    if (entityType) params.set('entityType', entityType);
    if (status) params.set('status', status);
    const response = await client.get(`/duplicates?${params.toString()}`);
    return response.data;
  },

  getDuplicateSet: async (id: string): Promise<DuplicateSet> => {
    const response = await client.get(`/duplicates/${id}`);
    return response.data;
  },

  scanForDuplicates: async (entityType: string, entityId: string): Promise<{ message: string }> => {
    const response = await client.post(`/duplicates/scan/${entityType}/${entityId}`);
    return response.data;
  },

  dismissDuplicateSet: async (id: string): Promise<DuplicateSet> => {
    const response = await client.post(`/duplicates/${id}/dismiss`);
    return response.data;
  },

  mergeEntities: async (id: string, body: MergeRequest): Promise<any> => {
    const response = await client.post(`/duplicates/${id}/merge`, body);
    return response.data;
  },
};
