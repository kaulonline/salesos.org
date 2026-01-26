import client from './client';
import type {
  Order,
  OrderLineItem,
  OrderStats,
  OrderTimeline,
  OrderFilters,
  CreateOrderDto,
  UpdateOrderDto,
  CreateOrderLineItemDto,
  UpdateOrderLineItemDto,
  ConvertQuoteToOrderDto,
  FulfillOrderDto,
  RecordPaymentDto,
} from '../types/order';

export const ordersApi = {
  /**
   * Get all orders with optional filters
   */
  getAll: async (filters?: OrderFilters): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Order[]>(`/orders?${params.toString()}`);
    return response.data;
  },

  /**
   * Get order by ID
   */
  getById: async (id: string): Promise<Order> => {
    const response = await client.get<Order>(`/orders/${id}`);
    return response.data;
  },

  /**
   * Create a new order
   */
  create: async (data: CreateOrderDto): Promise<Order> => {
    const response = await client.post<Order>('/orders', data);
    return response.data;
  },

  /**
   * Update an order
   */
  update: async (id: string, data: UpdateOrderDto): Promise<Order> => {
    const response = await client.patch<Order>(`/orders/${id}`, data);
    return response.data;
  },

  /**
   * Delete an order (only draft orders)
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/orders/${id}`);
  },

  /**
   * Convert a quote to an order
   */
  convertFromQuote: async (data: ConvertQuoteToOrderDto): Promise<Order> => {
    const response = await client.post<Order>('/orders/convert-from-quote', data);
    return response.data;
  },

  /**
   * Confirm an order (move from draft to confirmed)
   */
  confirm: async (id: string): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/confirm`);
    return response.data;
  },

  /**
   * Cancel an order
   */
  cancel: async (id: string, reason?: string): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Mark order as shipped
   */
  ship: async (id: string, data: { trackingNumber?: string; trackingUrl?: string }): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/ship`, data);
    return response.data;
  },

  /**
   * Mark order as delivered
   */
  deliver: async (id: string): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/deliver`);
    return response.data;
  },

  /**
   * Fulfill order line items
   */
  fulfill: async (id: string, data: FulfillOrderDto): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/fulfill`, data);
    return response.data;
  },

  /**
   * Record a payment
   */
  recordPayment: async (id: string, data: RecordPaymentDto): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/payments`, data);
    return response.data;
  },

  /**
   * Add a line item to an order
   */
  addLineItem: async (orderId: string, data: CreateOrderLineItemDto): Promise<OrderLineItem> => {
    const response = await client.post<OrderLineItem>(`/orders/${orderId}/line-items`, data);
    return response.data;
  },

  /**
   * Update a line item
   */
  updateLineItem: async (
    orderId: string,
    lineItemId: string,
    data: UpdateOrderLineItemDto
  ): Promise<OrderLineItem> => {
    const response = await client.patch<OrderLineItem>(
      `/orders/${orderId}/line-items/${lineItemId}`,
      data
    );
    return response.data;
  },

  /**
   * Remove a line item
   */
  removeLineItem: async (orderId: string, lineItemId: string): Promise<void> => {
    await client.delete(`/orders/${orderId}/line-items/${lineItemId}`);
  },

  /**
   * Get order statistics
   */
  getStats: async (): Promise<OrderStats> => {
    const response = await client.get<OrderStats>('/orders/stats');
    return response.data;
  },

  /**
   * Get order timeline/activity
   */
  getTimeline: async (id: string): Promise<OrderTimeline[]> => {
    const response = await client.get<OrderTimeline[]>(`/orders/${id}/timeline`);
    return response.data;
  },

  /**
   * Recalculate order totals
   */
  recalculate: async (id: string): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/recalculate`);
    return response.data;
  },

  /**
   * Clone an order
   */
  clone: async (id: string): Promise<Order> => {
    const response = await client.post<Order>(`/orders/${id}/clone`);
    return response.data;
  },

  /**
   * Generate order PDF
   */
  generatePdf: async (id: string): Promise<Blob> => {
    const response = await client.get<Blob>(`/orders/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get orders for an account
   */
  getByAccountId: async (accountId: string): Promise<Order[]> => {
    const response = await client.get<Order[]>(`/accounts/${accountId}/orders`);
    return response.data;
  },

  /**
   * Get order count
   */
  getCount: async (filters?: OrderFilters): Promise<number> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<{ count: number }>(`/orders/count?${params.toString()}`);
    return response.data.count;
  },
};

export default ordersApi;
