import client from './client';
import type {
  ESignatureRequest,
  ESignatureStats,
  ESignatureFilters,
  ESignProviderConfig,
  CreateESignatureRequestDto,
  UpdateESignatureRequestDto,
  SendESignatureDto,
  VoidESignatureDto,
  ResendESignatureDto,
  ConfigureProviderDto,
} from '../types/esignature';

export const esignatureApi = {
  /**
   * Get all e-signature requests
   */
  getAll: async (filters?: ESignatureFilters): Promise<ESignatureRequest[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<ESignatureRequest[]>(`/esignature?${params.toString()}`);
    return response.data;
  },

  /**
   * Get e-signature request by ID
   */
  getById: async (id: string): Promise<ESignatureRequest> => {
    const response = await client.get<ESignatureRequest>(`/esignature/${id}`);
    return response.data;
  },

  /**
   * Get e-signature requests for a specific quote
   */
  getByQuoteId: async (quoteId: string): Promise<ESignatureRequest[]> => {
    const response = await client.get<ESignatureRequest[]>(`/quotes/${quoteId}/esignature`);
    return response.data;
  },

  /**
   * Create a new e-signature request
   */
  create: async (data: CreateESignatureRequestDto): Promise<ESignatureRequest> => {
    const response = await client.post<ESignatureRequest>('/esignature', data);
    return response.data;
  },

  /**
   * Update an e-signature request (only if draft)
   */
  update: async (id: string, data: UpdateESignatureRequestDto): Promise<ESignatureRequest> => {
    const response = await client.patch<ESignatureRequest>(`/esignature/${id}`, data);
    return response.data;
  },

  /**
   * Send the e-signature request for signing
   */
  send: async (data: SendESignatureDto): Promise<ESignatureRequest> => {
    const response = await client.post<ESignatureRequest>(`/esignature/${data.requestId}/send`, {
      customMessage: data.customMessage,
    });
    return response.data;
  },

  /**
   * Void an e-signature request
   */
  void: async (data: VoidESignatureDto): Promise<ESignatureRequest> => {
    const response = await client.post<ESignatureRequest>(`/esignature/${data.requestId}/void`, {
      reason: data.reason,
    });
    return response.data;
  },

  /**
   * Resend e-signature request to signers
   */
  resend: async (data: ResendESignatureDto): Promise<ESignatureRequest> => {
    const response = await client.post<ESignatureRequest>(`/esignature/${data.requestId}/resend`, {
      signerId: data.signerId,
      customMessage: data.customMessage,
    });
    return response.data;
  },

  /**
   * Delete a draft e-signature request
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/esignature/${id}`);
  },

  /**
   * Download signed document
   */
  downloadSignedDocument: async (id: string): Promise<Blob> => {
    const response = await client.get<Blob>(`/esignature/${id}/document`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get e-signature statistics
   */
  getStats: async (): Promise<ESignatureStats> => {
    const response = await client.get<ESignatureStats>('/esignature/stats');
    return response.data;
  },

  /**
   * Get configured e-sign providers
   */
  getProviders: async (): Promise<ESignProviderConfig[]> => {
    const response = await client.get<ESignProviderConfig[]>('/esignature/providers');
    return response.data;
  },

  /**
   * Configure an e-sign provider
   */
  configureProvider: async (data: ConfigureProviderDto): Promise<ESignProviderConfig> => {
    const response = await client.post<ESignProviderConfig>('/esignature/providers/configure', data);
    return response.data;
  },

  /**
   * Test provider connection
   */
  testProvider: async (provider: string): Promise<{ success: boolean; message: string }> => {
    const response = await client.post<{ success: boolean; message: string }>(
      `/esignature/providers/${provider}/test`
    );
    return response.data;
  },

  /**
   * Get signing URL for a signer (for embedded signing)
   */
  getSigningUrl: async (requestId: string, signerId: string): Promise<{ url: string; expiresAt: string }> => {
    const response = await client.get<{ url: string; expiresAt: string }>(
      `/esignature/${requestId}/signers/${signerId}/signing-url`
    );
    return response.data;
  },

  /**
   * Refresh status from provider
   */
  refreshStatus: async (id: string): Promise<ESignatureRequest> => {
    const response = await client.post<ESignatureRequest>(`/esignature/${id}/refresh`);
    return response.data;
  },
};

export default esignatureApi;
