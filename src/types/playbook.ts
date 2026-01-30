// Playbook Types

export type PlaybookTrigger = 'MANUAL' | 'DEAL_CREATED' | 'DEAL_STAGE_CHANGE' | 'LEAD_QUALIFIED' | 'ACCOUNT_CREATED';
export type PlaybookStepType = 'TASK' | 'EMAIL' | 'CALL' | 'MEETING' | 'WAIT' | 'CONDITION';
export type PlaybookExecutionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAUSED';
export type PlaybookStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface PlaybookStep {
  id: string;
  playbookId: string;
  type: PlaybookStepType;
  title: string;
  description?: string | null;
  order: number;
  daysOffset: number;
  isRequired: boolean;
  config?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Playbook {
  id: string;
  name: string;
  description?: string | null;
  trigger: PlaybookTrigger;
  targetStage?: string | null;
  targetDealType?: string | null;
  isActive: boolean;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  steps: PlaybookStep[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    executions: number;
    steps: number;
  };
}

export interface PlaybookStepExecution {
  id: string;
  executionId: string;
  stepId: string;
  step?: PlaybookStep;
  status: PlaybookStepStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  outcome?: string | null;
  notes?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  playbook?: Playbook;
  dealId?: string | null;
  deal?: {
    id: string;
    name: string;
    stage?: string;
  } | null;
  leadId?: string | null;
  lead?: {
    id: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  } | null;
  accountId?: string | null;
  account?: {
    id: string;
    name: string;
  } | null;
  assigneeId: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  status: PlaybookExecutionStatus;
  currentStepOrder: number;
  startedAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  stepExecutions: PlaybookStepExecution[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlaybookDto {
  name: string;
  description?: string;
  trigger: PlaybookTrigger;
  targetStage?: string;
  targetDealType?: string;
  isActive?: boolean;
  steps?: CreatePlaybookStepDto[];
}

export interface UpdatePlaybookDto {
  name?: string;
  description?: string;
  trigger?: PlaybookTrigger;
  targetStage?: string;
  targetDealType?: string;
  isActive?: boolean;
}

export interface CreatePlaybookStepDto {
  type: PlaybookStepType;
  title: string;
  description?: string;
  daysOffset?: number;
  isRequired?: boolean;
  config?: Record<string, any>;
}

export interface UpdatePlaybookStepDto {
  type?: PlaybookStepType;
  title?: string;
  description?: string;
  daysOffset?: number;
  isRequired?: boolean;
  config?: Record<string, any>;
  order?: number;
}

export interface StartPlaybookDto {
  dealId?: string;
  leadId?: string;
  accountId?: string;
}

export interface PlaybookFilters {
  isActive?: boolean;
  trigger?: PlaybookTrigger;
}

export interface ExecutionFilters {
  playbookId?: string;
  dealId?: string;
  status?: PlaybookExecutionStatus;
}

export interface PlaybookStats {
  totalPlaybooks: number;
  activePlaybooks: number;
  totalExecutions: number;
  inProgressExecutions: number;
  completedExecutions: number;
  byTrigger: Array<{ trigger: PlaybookTrigger; count: number }>;
}
