import client from './client';

// Types matching backend
export type NotificationType =
  | 'DEAL_UPDATE'
  | 'LEAD_ASSIGNED'
  | 'TASK_DUE'
  | 'MEETING_REMINDER'
  | 'QUOTE_APPROVED'
  | 'CUSTOM'
  | 'SYSTEM_ALERT'
  | 'CAMPAIGN_UPDATE';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  action?: string;
  actionData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface NotificationFilters {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export const notificationsApi = {
  // Get user notifications
  async getAll(filters?: NotificationFilters): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.pageSize) params.set('pageSize', filters.pageSize.toString());
    if (filters?.unreadOnly) params.set('unreadOnly', 'true');

    const queryString = params.toString();
    const response = await client.get(`/notifications${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  // Mark single notification as read
  async markAsRead(id: string): Promise<Notification> {
    const response = await client.post(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ count: number }> {
    const response = await client.post('/notifications/read-all');
    return response.data;
  },

  // Delete a notification
  async delete(id: string): Promise<void> {
    await client.delete(`/notifications/${id}`);
  },
};

export default notificationsApi;
