import apiClient from './client';

// Data Enrichment API for leads, contacts, and accounts

export type EnrichmentProvider = 'zoominfo' | 'apollo' | 'clearbit';
export type EntityType = 'lead' | 'contact' | 'account';

export interface EnrichedPersonData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  seniority?: string;
  department?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  photoUrl?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  employment?: {
    company?: string;
    domain?: string;
    title?: string;
    startDate?: string;
  };
}

export interface EnrichedCompanyData {
  name?: string;
  domain?: string;
  description?: string;
  industry?: string;
  subIndustry?: string;
  employeeCount?: number;
  employeeRange?: string;
  revenue?: number;
  revenueRange?: string;
  foundedYear?: number;
  type?: string;
  phone?: string;
  logoUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  location?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  technologies?: string[];
  keywords?: string[];
  sicCode?: string;
  naicsCode?: string;
}

export interface EnrichmentResult {
  success: boolean;
  entityId: string;
  entityType: EntityType;
  provider: EnrichmentProvider;
  enrichedAt: string;
  personData?: EnrichedPersonData;
  companyData?: EnrichedCompanyData;
  fieldsUpdated?: string[];
  error?: string;
}

export interface BulkEnrichmentResult {
  success: boolean;
  totalRequested: number;
  totalEnriched: number;
  totalFailed: number;
  results: EnrichmentResult[];
}

export interface ProviderStatus {
  provider: EnrichmentProvider;
  configured: boolean;
  connected: boolean;
  lastUsed?: string;
  capabilities: string[];
}

export interface EnrichmentStatusResponse {
  available: boolean;
  providers: ProviderStatus[];
  bestProvider?: EnrichmentProvider;
}

export interface EnrichmentPreview {
  wouldUpdate: string[];
  currentValues: Record<string, any>;
  newValues: Record<string, any>;
  provider: EnrichmentProvider;
}

export const enrichmentApi = {
  /**
   * Get enrichment service status
   */
  getStatus: async (): Promise<EnrichmentStatusResponse> => {
    const response = await apiClient.get('/enrichment/status');
    return response.data;
  },

  /**
   * Get available providers with capabilities
   */
  getProviders: async (): Promise<ProviderStatus[]> => {
    const response = await apiClient.get('/enrichment/providers');
    return response.data;
  },

  /**
   * Enrich a lead
   */
  enrichLead: async (leadId: string, provider?: EnrichmentProvider, force?: boolean): Promise<EnrichmentResult> => {
    const response = await apiClient.post(`/enrichment/lead/${leadId}`, { provider, force });
    return response.data;
  },

  /**
   * Enrich a contact
   */
  enrichContact: async (contactId: string, provider?: EnrichmentProvider, force?: boolean): Promise<EnrichmentResult> => {
    const response = await apiClient.post(`/enrichment/contact/${contactId}`, { provider, force });
    return response.data;
  },

  /**
   * Enrich an account
   */
  enrichAccount: async (accountId: string, provider?: EnrichmentProvider, force?: boolean): Promise<EnrichmentResult> => {
    const response = await apiClient.post(`/enrichment/account/${accountId}`, { provider, force });
    return response.data;
  },

  /**
   * Bulk enrich multiple entities
   */
  bulkEnrich: async (
    entityType: EntityType,
    entityIds: string[],
    provider?: EnrichmentProvider,
    force?: boolean
  ): Promise<BulkEnrichmentResult> => {
    const response = await apiClient.post('/enrichment/bulk', {
      entityType,
      entityIds,
      provider,
      force,
    });
    return response.data;
  },

  /**
   * Preview enrichment without saving
   */
  previewEnrichment: async (
    entityType: EntityType,
    entityId: string,
    provider?: EnrichmentProvider
  ): Promise<EnrichmentPreview> => {
    const response = await apiClient.post(`/enrichment/preview/${entityType}/${entityId}`, { provider });
    return response.data;
  },

  /**
   * Test enrichment provider connections
   */
  testConnection: async (provider?: EnrichmentProvider): Promise<{
    success: boolean;
    results: Array<{
      provider: EnrichmentProvider;
      success: boolean;
      latencyMs: number;
      message: string;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> => {
    const params = provider ? `?provider=${provider}` : '';
    const response = await apiClient.post(`/enrichment/test${params}`);
    return response.data;
  },

  /**
   * Test specific enrichment provider connection
   */
  testProvider: async (provider: EnrichmentProvider): Promise<{
    success: boolean;
    provider: EnrichmentProvider;
    latencyMs: number;
    message: string;
    error?: string;
  }> => {
    const response = await apiClient.post(`/enrichment/test/${provider}`);
    return response.data;
  },
};

export default enrichmentApi;
