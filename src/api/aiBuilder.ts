/**
 * AI Builder API
 * API module for AI-powered configuration generation
 */

import client from './client';
import {
  GenerateConfigRequest,
  GenerateConfigResponse,
  RefineConfigRequest,
  EntityTypeInfo,
} from '../types/aiBuilder';

const BASE_URL = '/ai-builder';

export const aiBuilderApi = {
  /**
   * Generate configuration from natural language prompt
   */
  generate: async (request: GenerateConfigRequest): Promise<GenerateConfigResponse> => {
    const response = await client.post<GenerateConfigResponse>(`${BASE_URL}/generate`, request);
    return response.data;
  },

  /**
   * Refine a previously generated configuration
   */
  refine: async (request: RefineConfigRequest): Promise<GenerateConfigResponse> => {
    const response = await client.post<GenerateConfigResponse>(`${BASE_URL}/refine`, request);
    return response.data;
  },

  /**
   * Get list of supported entity types with examples
   */
  getEntityTypes: async (): Promise<EntityTypeInfo[]> => {
    const response = await client.get<EntityTypeInfo[]>(`${BASE_URL}/entity-types`);
    return response.data;
  },
};
