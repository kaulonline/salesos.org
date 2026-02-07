import apiClient from './client';

// ==================== EMAIL INTEGRATIONS ====================

export enum EmailProvider {
  GMAIL = 'GMAIL',
  OUTLOOK = 'OUTLOOK',
  IMAP = 'IMAP',
}

export enum ConnectionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  ERROR = 'ERROR',
}

export interface EmailConnection {
  id: string;
  provider: EmailProvider;
  email: string;
  status: ConnectionStatus;
  syncEnabled: boolean;
  syncIncoming: boolean;
  syncOutgoing: boolean;
  lastSyncAt: string | null;
  emailsSynced: number;
  lastEmailAt: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableEmailIntegration {
  provider: EmailProvider;
  name: string;
  description: string;
  configured: boolean;
  icon: string;
}

export interface InitiateOAuthResponse {
  success: boolean;
  authUrl: string;
  state: string;
}

export const emailIntegrationsApi = {
  /**
   * Get available email integrations
   */
  getAvailable: async (): Promise<{ success: boolean; integrations: AvailableEmailIntegration[] }> => {
    const response = await apiClient.get('/email-integrations/available');
    return response.data;
  },

  /**
   * Get user's connected email accounts
   */
  getConnections: async (): Promise<{ success: boolean; connections: EmailConnection[] }> => {
    const response = await apiClient.get('/email-integrations/connections');
    return response.data;
  },

  /**
   * Get a specific connection
   */
  getConnection: async (connectionId: string): Promise<{ success: boolean; connection: EmailConnection }> => {
    const response = await apiClient.get(`/email-integrations/connections/${connectionId}`);
    return response.data;
  },

  /**
   * Initiate OAuth flow
   */
  initiateOAuth: async (provider: EmailProvider): Promise<InitiateOAuthResponse> => {
    const response = await apiClient.post('/email-integrations/connect', { provider });
    return response.data;
  },

  /**
   * Update connection settings
   */
  updateConnection: async (
    connectionId: string,
    data: {
      syncEnabled?: boolean;
      syncIncoming?: boolean;
      syncOutgoing?: boolean;
    },
  ): Promise<{ success: boolean; connection: EmailConnection }> => {
    const response = await apiClient.patch(`/email-integrations/connections/${connectionId}`, data);
    return response.data;
  },

  /**
   * Delete/disconnect an email connection
   */
  deleteConnection: async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/email-integrations/connections/${connectionId}`);
    return response.data;
  },

  /**
   * Trigger manual sync
   */
  triggerSync: async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/email-integrations/connections/${connectionId}/sync`);
    return response.data;
  },
};

// ==================== CALENDAR INTEGRATIONS ====================

export enum CalendarProvider {
  GOOGLE = 'GOOGLE',
  OUTLOOK = 'OUTLOOK',
  APPLE = 'APPLE',
}

export interface CalendarConnection {
  id: string;
  provider: CalendarProvider;
  email: string;
  status: ConnectionStatus;
  calendarId: string | null;
  calendarName: string | null;
  syncEnabled: boolean;
  syncPastDays: number;
  syncFutureDays: number;
  lastSyncAt: string | null;
  eventsSynced: number;
  lastEventAt: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableCalendarIntegration {
  provider: CalendarProvider;
  name: string;
  description: string;
  configured: boolean;
  icon: string;
}

export interface CalendarListItem {
  id: string;
  name: string;
  primary: boolean;
  accessRole: string;
}

export const calendarIntegrationsApi = {
  /**
   * Get available calendar integrations
   */
  getAvailable: async (): Promise<{ success: boolean; integrations: AvailableCalendarIntegration[] }> => {
    const response = await apiClient.get('/calendar-integrations/available');
    return response.data;
  },

  /**
   * Get user's connected calendar accounts
   */
  getConnections: async (): Promise<{ success: boolean; connections: CalendarConnection[] }> => {
    const response = await apiClient.get('/calendar-integrations/connections');
    return response.data;
  },

  /**
   * Get a specific connection
   */
  getConnection: async (connectionId: string): Promise<{ success: boolean; connection: CalendarConnection }> => {
    const response = await apiClient.get(`/calendar-integrations/connections/${connectionId}`);
    return response.data;
  },

  /**
   * Get available calendars for a connection
   */
  getCalendars: async (connectionId: string): Promise<{ success: boolean; calendars: CalendarListItem[] }> => {
    const response = await apiClient.get(`/calendar-integrations/connections/${connectionId}/calendars`);
    return response.data;
  },

  /**
   * Initiate OAuth flow
   */
  initiateOAuth: async (provider: CalendarProvider): Promise<InitiateOAuthResponse> => {
    const response = await apiClient.post('/calendar-integrations/connect', { provider });
    return response.data;
  },

  /**
   * Update connection settings
   */
  updateConnection: async (
    connectionId: string,
    data: {
      syncEnabled?: boolean;
      syncPastDays?: number;
      syncFutureDays?: number;
      calendarId?: string;
    },
  ): Promise<{ success: boolean; connection: CalendarConnection }> => {
    const response = await apiClient.patch(`/calendar-integrations/connections/${connectionId}`, data);
    return response.data;
  },

  /**
   * Delete/disconnect a calendar connection
   */
  deleteConnection: async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/calendar-integrations/connections/${connectionId}`);
    return response.data;
  },

  /**
   * Trigger manual sync
   */
  triggerSync: async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/calendar-integrations/connections/${connectionId}/sync`);
    return response.data;
  },
};

// ==================== THIRD-PARTY INTEGRATIONS ====================

export type IntegrationType =
  | 'zoominfo' | 'snowflake' | 'slack' | 'teams' | 'zoom' | 'intercom'
  | 'linkedin' | 'apollo' | 'gong' | 'clearbit' | 'hubspot' | 'salesforce'
  | 'marketo' | 'stripe' | 'quickbooks' | 'xero' | 'docusign' | 'pandadoc'
  | 'dropbox' | 'gdrive' | 'segment' | 'looker' | 'zapier' | 'make'
  | 'calendly' | 'okta' | 'auth0' | 'openai' | 'anthropic';

export interface IntegrationStatus {
  connected: boolean;
  configured: boolean;
  lastSyncAt?: string | null;
  error?: string | null;
}

export interface IntegrationConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
  [key: string]: string | undefined;
}

export const thirdPartyIntegrationsApi = {
  /**
   * Get status of a specific integration
   */
  getStatus: async (integrationType: IntegrationType): Promise<IntegrationStatus> => {
    try {
      const response = await apiClient.get(`/integrations/${integrationType}/status`);
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist, return not configured
      if (error.response?.status === 404) {
        return { connected: false, configured: false };
      }
      return { connected: false, configured: false, error: error.message };
    }
  },

  /**
   * Get current configuration for an integration (masked for security)
   * Returns audit info about who configured it and when
   */
  getConfig: async (integrationType: IntegrationType): Promise<{
    configured: boolean;
    config: Record<string, string>;
    configuredBy?: { id: string; name: string; email: string } | null;
    configuredAt?: string | null;
  }> => {
    try {
      const response = await apiClient.get(`/integrations/${integrationType}/config`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { configured: false, config: {}, configuredBy: null, configuredAt: null };
      }
      throw error;
    }
  },

  /**
   * Get status of all integrations
   */
  getAllStatuses: async (): Promise<Record<IntegrationType, IntegrationStatus>> => {
    try {
      const response = await apiClient.get('/integrations/status');
      return response.data;
    } catch {
      // Return empty object if endpoint doesn't exist
      return {} as Record<IntegrationType, IntegrationStatus>;
    }
  },

  /**
   * Test connection for an integration
   */
  testConnection: async (integrationType: IntegrationType): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/integrations/${integrationType}/test`);
    return response.data;
  },

  /**
   * Configure an integration (API key based)
   */
  configure: async (integrationType: IntegrationType, config: IntegrationConfig): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/integrations/${integrationType}/configure`, config);
    return response.data;
  },

  /**
   * Initiate OAuth flow for OAuth-based integrations
   */
  initiateOAuth: async (integrationType: IntegrationType): Promise<{ success: boolean; authUrl: string }> => {
    const response = await apiClient.post(`/integrations/${integrationType}/connect`);
    return response.data;
  },

  /**
   * Disconnect an integration
   */
  disconnect: async (integrationType: IntegrationType): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/integrations/${integrationType}/disconnect`);
    return response.data;
  },

  /**
   * Trigger sync for an integration
   */
  triggerSync: async (integrationType: IntegrationType): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/integrations/${integrationType}/sync`);
    return response.data;
  },
};

export default {
  email: emailIntegrationsApi,
  calendar: calendarIntegrationsApi,
  thirdParty: thirdPartyIntegrationsApi,
};
