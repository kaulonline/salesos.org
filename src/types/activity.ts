export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'TASK'
  | 'NOTE'
  | 'STATUS_CHANGE'
  | 'STAGE_CHANGE'
  | 'DOCUMENT'
  | 'OTHER';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  subject: string;
  description?: string;
  duration?: number;
  outcome?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  account?: {
    id: string;
    name: string;
  };
  opportunity?: {
    id: string;
    name: string;
  };
}

export interface CreateActivityDto {
  type: ActivityType;
  subject: string;
  description?: string;
  duration?: number;
  outcome?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  taskId?: string;
}

export interface ActivityFilters {
  type?: ActivityType;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
