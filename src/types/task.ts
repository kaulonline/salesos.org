export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING' | 'DEFERRED';

export type TaskPriority = 'HIGH' | 'NORMAL' | 'LOW';

export type TaskType = 'CALL' | 'EMAIL' | 'MEETING' | 'FOLLOW_UP' | 'OTHER';

export interface Task {
  id: string;
  ownerId: string;
  assignedToId?: string;
  subject: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type?: TaskType;
  dueDate?: string;
  completedDate?: string;
  reminderDate?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  isRecurring?: boolean;
  recurringPattern?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateTaskDto {
  subject: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  dueDate?: string;
  reminderDate?: string;
  assignedToId?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  completedDate?: string;
}
