import client from './client';
import type {
  CustomField,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldEntity,
  CustomFieldStats,
  PicklistValue,
  CreatePicklistValueDto,
  UpdatePicklistValueDto,
  ReorderCustomFieldsDto,
  ReorderPicklistValuesDto,
  QueryFilters,
} from '../types';

export interface CustomFieldFilters extends QueryFilters {
  entity?: CustomFieldEntity;
  type?: string;
  isActive?: boolean;
}

export const customFieldsApi = {
  /**
   * Get all custom fields with optional filters
   */
  getAll: async (filters?: CustomFieldFilters): Promise<CustomField[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<CustomField[]>(`/custom-fields?${params.toString()}`);
    return response.data;
  },

  /**
   * Get custom fields by entity type
   */
  getByEntity: async (entity: CustomFieldEntity): Promise<CustomField[]> => {
    const response = await client.get<CustomField[]>(`/custom-fields?entity=${entity}`);
    return response.data;
  },

  /**
   * Get custom field statistics
   */
  getStats: async (): Promise<CustomFieldStats> => {
    const response = await client.get<CustomFieldStats>('/custom-fields/stats');
    return response.data;
  },

  /**
   * Get a single custom field by ID
   */
  getById: async (id: string): Promise<CustomField> => {
    const response = await client.get<CustomField>(`/custom-fields/${id}`);
    return response.data;
  },

  /**
   * Create a new custom field
   */
  create: async (data: CreateCustomFieldDto): Promise<CustomField> => {
    const response = await client.post<CustomField>('/custom-fields', data);
    return response.data;
  },

  /**
   * Update a custom field
   */
  update: async (id: string, data: UpdateCustomFieldDto): Promise<CustomField> => {
    const response = await client.patch<CustomField>(`/custom-fields/${id}`, data);
    return response.data;
  },

  /**
   * Delete a custom field
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/custom-fields/${id}`);
  },

  /**
   * Reorder custom fields
   */
  reorder: async (data: ReorderCustomFieldsDto): Promise<void> => {
    await client.post('/custom-fields/reorder', data);
  },

  // Picklist value management
  /**
   * Add a picklist value to a custom field
   */
  addPicklistValue: async (fieldId: string, data: CreatePicklistValueDto): Promise<PicklistValue> => {
    const response = await client.post<PicklistValue>(`/custom-fields/${fieldId}/picklist-values`, data);
    return response.data;
  },

  /**
   * Update a picklist value
   */
  updatePicklistValue: async (
    fieldId: string,
    valueId: string,
    data: UpdatePicklistValueDto
  ): Promise<PicklistValue> => {
    const response = await client.patch<PicklistValue>(
      `/custom-fields/${fieldId}/picklist-values/${valueId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a picklist value
   */
  deletePicklistValue: async (fieldId: string, valueId: string): Promise<void> => {
    await client.delete(`/custom-fields/${fieldId}/picklist-values/${valueId}`);
  },

  /**
   * Reorder picklist values
   */
  reorderPicklistValues: async (fieldId: string, data: ReorderPicklistValuesDto): Promise<void> => {
    await client.post(`/custom-fields/${fieldId}/picklist-values/reorder`, data);
  },
};

export default customFieldsApi;
