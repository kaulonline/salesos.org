import client from './client';
import type {
  AccessRequest,
  AccessRequestStats,
  AccessRequestListResponse,
  CreateAccessRequestDto,
  UpdateAccessRequestDto,
  SendOrgCodeDto,
  AccessRequestStatus,
  AccessRequestType,
} from '../types/access-request';

export const accessRequestsApi = {
  /**
   * Submit a new access request (public endpoint)
   */
  submit: async (data: CreateAccessRequestDto): Promise<{ success: boolean; message: string }> => {
    const response = await client.post<{ success: boolean; message: string }>(
      '/access-requests',
      data
    );
    return response.data;
  },

  /**
   * Get all access requests (admin)
   */
  getAll: async (params?: {
    status?: AccessRequestStatus;
    requestType?: AccessRequestType;
    search?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
  }): Promise<AccessRequestListResponse> => {
    const response = await client.get<AccessRequestListResponse>('/access-requests', { params });
    return response.data;
  },

  /**
   * Get AI-sorted access requests (admin)
   */
  getAISorted: async (params?: {
    status?: string;
    minScore?: number;
    priority?: string;
    limit?: number;
  }): Promise<AccessRequest[]> => {
    const response = await client.get<AccessRequest[]>('/access-requests/ai-sorted', { params });
    return response.data;
  },

  /**
   * Get access request stats (admin)
   */
  getStats: async (): Promise<AccessRequestStats> => {
    const response = await client.get<AccessRequestStats>('/access-requests/stats');
    return response.data;
  },

  /**
   * Get single access request (admin)
   */
  getById: async (id: string): Promise<AccessRequest> => {
    const response = await client.get<AccessRequest>(`/access-requests/${id}`);
    return response.data;
  },

  /**
   * Update access request (admin)
   */
  update: async (id: string, data: UpdateAccessRequestDto): Promise<AccessRequest> => {
    const response = await client.patch<AccessRequest>(`/access-requests/${id}`, data);
    return response.data;
  },

  /**
   * Send organization code to user (admin)
   */
  sendOrgCode: async (
    id: string,
    data: SendOrgCodeDto
  ): Promise<{ success: boolean; message: string }> => {
    const response = await client.post<{ success: boolean; message: string }>(
      `/access-requests/${id}/send-code`,
      data
    );
    return response.data;
  },

  /**
   * Convert access request to lead (admin)
   */
  convertToLead: async (
    id: string
  ): Promise<{ success: boolean; leadId: string; message: string }> => {
    const response = await client.post<{ success: boolean; leadId: string; message: string }>(
      `/access-requests/${id}/convert`
    );
    return response.data;
  },

  /**
   * Re-enrich access request with AI (admin)
   */
  reEnrich: async (id: string): Promise<{ success: boolean; enrichment: any }> => {
    const response = await client.post<{ success: boolean; enrichment: any }>(
      `/access-requests/${id}/enrich`
    );
    return response.data;
  },

  /**
   * Delete access request (admin)
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await client.delete<{ success: boolean }>(`/access-requests/${id}`);
    return response.data;
  },

  /**
   * Export access requests as CSV (admin)
   */
  exportCsv: async (status?: AccessRequestStatus): Promise<void> => {
    const response = await client.get('/access-requests/export', {
      params: { status },
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `access-requests-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default accessRequestsApi;
