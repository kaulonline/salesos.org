import client from './client';
import type {
  Contact,
  CreateContactDto,
  UpdateContactDto,
  ContactStats,
  Opportunity,
  QueryFilters,
} from '../types';

export interface ContactFilters extends QueryFilters {
  accountId?: string;
  role?: string;
  status?: string;
  ownerId?: string;
}

export const contactsApi = {
  /**
   * Get all contacts with optional filters
   */
  getAll: async (filters?: ContactFilters): Promise<Contact[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Contact[]>(`/contacts?${params.toString()}`);
    return response.data;
  },

  /**
   * Get contact statistics
   */
  getStats: async (): Promise<ContactStats> => {
    const response = await client.get<ContactStats>('/contacts/stats');
    return response.data;
  },

  /**
   * Get a single contact by ID
   */
  getById: async (id: string): Promise<Contact> => {
    const response = await client.get<Contact>(`/contacts/${id}`);
    return response.data;
  },

  /**
   * Get opportunities associated with a contact
   */
  getOpportunities: async (id: string): Promise<Opportunity[]> => {
    const response = await client.get<Opportunity[]>(`/contacts/${id}/opportunities`);
    return response.data;
  },

  /**
   * Create a new contact
   */
  create: async (data: CreateContactDto): Promise<Contact> => {
    const response = await client.post<Contact>('/contacts', data);
    return response.data;
  },

  /**
   * Update a contact
   */
  update: async (id: string, data: UpdateContactDto): Promise<Contact> => {
    const response = await client.patch<Contact>(`/contacts/${id}`, data);
    return response.data;
  },

  /**
   * Delete a contact
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/contacts/${id}`);
  },

  // Bulk Operations
  bulkUpdate: async (ids: string[], updates: Partial<Contact>): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/contacts/bulk/update', { ids, updates });
    return response.data;
  },

  bulkDelete: async (ids: string[]): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/contacts/bulk/delete', { ids });
    return response.data;
  },

  bulkAssign: async (ids: string[], newOwnerId: string): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/contacts/bulk/assign', { ids, newOwnerId });
    return response.data;
  },
};

export default contactsApi;
