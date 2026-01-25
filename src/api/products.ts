import client from './client';

export type ProductType = 'PRODUCT' | 'SERVICE' | 'SUBSCRIPTION' | 'LICENSE' | 'BUNDLE';
export type ProductCategory = 'SOFTWARE' | 'HARDWARE' | 'CONSULTING' | 'TRAINING' | 'SUPPORT' | 'OTHER';
export type BillingFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'USAGE_BASED';

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  sku: string;
  description?: string;
  type: ProductType;
  category: ProductCategory;
  listPrice: number;
  unitPrice?: number;
  costPrice?: number;
  currency: string;
  billingFrequency: BillingFrequency;
  isActive: boolean;
  features: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  type?: ProductType;
  category?: ProductCategory;
  listPrice: number;
  unitPrice?: number;
  costPrice?: number;
  currency?: string;
  billingFrequency?: BillingFrequency;
  isActive?: boolean;
  features?: string[];
  tags?: string[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface ProductFilters {
  type?: ProductType;
  category?: ProductCategory;
  isActive?: boolean;
  search?: string;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  byType: {
    type: ProductType;
    count: number;
    avgPrice: number;
  }[];
  byCategory: {
    category: ProductCategory;
    count: number;
  }[];
}

export const productsApi = {
  /**
   * Get all products with optional filters
   */
  getAll: async (filters?: ProductFilters): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Product[]>(`/products?${params.toString()}`);
    return response.data;
  },

  /**
   * Get product by ID
   */
  getById: async (id: string): Promise<Product> => {
    const response = await client.get<Product>(`/products/${id}`);
    return response.data;
  },

  /**
   * Get product by SKU
   */
  getBySku: async (sku: string): Promise<Product> => {
    const response = await client.get<Product>(`/products/sku/${sku}`);
    return response.data;
  },

  /**
   * Get product statistics
   */
  getStats: async (): Promise<ProductStats> => {
    const response = await client.get<ProductStats>('/products/stats');
    return response.data;
  },

  /**
   * Create a new product
   */
  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await client.post<Product>('/products', data);
    return response.data;
  },

  /**
   * Update a product
   */
  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await client.patch<Product>(`/products/${id}`, data);
    return response.data;
  },

  /**
   * Delete a product
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/products/${id}`);
  },

  /**
   * Bulk update products
   */
  bulkUpdate: async (ids: string[], updates: UpdateProductDto): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/products/bulk/update', { ids, updates });
    return response.data;
  },

  /**
   * Bulk delete products
   */
  bulkDelete: async (ids: string[]): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/products/bulk/delete', { ids });
    return response.data;
  },
};

export default productsApi;
