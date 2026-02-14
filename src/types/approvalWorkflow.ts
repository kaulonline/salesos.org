// Approval Workflow Types for SalesOS CRM
// Multi-level approval chains for quotes and discounts

export type ApprovalEntity = 'QUOTE' | 'DISCOUNT' | 'ORDER' | 'CONTRACT';

export type ApproverType = 'USER' | 'ROLE' | 'MANAGER' | 'SKIP_LEVEL_MANAGER';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export type ApprovalAction = 'APPROVE' | 'APPROVED' | 'REJECT' | 'REJECTED' | 'DELEGATE' | 'ESCALATE';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUALS'
  | 'LESS_THAN_OR_EQUALS'
  | 'CONTAINS'
  | 'IN';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | string[];
}

export interface ApprovalStep {
  id: string;
  workflowId: string;
  order: number;
  name: string;
  description?: string;
  approverType: ApproverType;
  approverId?: string; // User ID if type is USER
  roleId?: string; // Role ID if type is ROLE
  approverName?: string; // Display name
  autoApproveAfterHours?: number;
  autoRejectAfterHours?: number;
  requireComment: boolean;
  allowDelegation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  entity: ApprovalEntity;
  conditions: WorkflowCondition[];
  isActive: boolean;
  priority: number; // Higher priority workflows are evaluated first
  steps: ApprovalStep[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDecision {
  id: string;
  requestId: string;
  stepId: string;
  stepOrder: number;
  approverId: string;
  approverName: string;
  action: ApprovalAction;
  decision?: ApprovalAction;
  comment?: string;
  delegatedToId?: string;
  delegatedToName?: string;
  decidedAt: string;
  createdAt?: string;
  approver?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  workflow?: ApprovalWorkflow;
  entityType: ApprovalEntity;
  entityId: string;
  entityName: string;
  entityDetails?: Record<string, any>;
  requestedById: string;
  requestedByName: string;
  submittedBy?: string;
  submittedByName?: string;
  currentStepOrder: number;
  currentStep?: ApprovalStep;
  status: ApprovalStatus;
  statusLabel?: string;
  steps?: ApprovalStep[];
  decisions: ApprovalDecision[];
  metadata?: Record<string, any>;
  submittedAt: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateApprovalWorkflowDto {
  name: string;
  description?: string;
  entity: ApprovalEntity;
  conditions?: WorkflowCondition[];
  isActive?: boolean;
  priority?: number;
}

export interface UpdateApprovalWorkflowDto {
  name?: string;
  description?: string;
  conditions?: WorkflowCondition[];
  isActive?: boolean;
  priority?: number;
}

export interface CreateApprovalStepDto {
  order: number;
  name: string;
  description?: string;
  approverType: ApproverType;
  approverId?: string;
  roleId?: string;
  autoApproveAfterHours?: number;
  autoRejectAfterHours?: number;
  requireComment?: boolean;
  allowDelegation?: boolean;
}

export interface UpdateApprovalStepDto {
  order?: number;
  name?: string;
  description?: string;
  approverType?: ApproverType;
  approverId?: string;
  roleId?: string;
  autoApproveAfterHours?: number;
  autoRejectAfterHours?: number;
  requireComment?: boolean;
  allowDelegation?: boolean;
}

export interface SubmitForApprovalDto {
  entityType: ApprovalEntity;
  entityId: string;
  comment?: string;
}

export interface ApprovalDecisionDto {
  action: ApprovalAction;
  comment?: string;
  delegateToId?: string;
}

export interface ApprovalWorkflowStats {
  total: number;
  active: number;
  byEntity: {
    entity: ApprovalEntity;
    count: number;
  }[];
  pendingRequests: number;
  avgApprovalTime: number; // in hours
}

// Helper constants
export const APPROVAL_ENTITIES: { value: ApprovalEntity; label: string; description: string }[] = [
  { value: 'QUOTE', label: 'Quote', description: 'Quotes requiring approval before sending' },
  { value: 'DISCOUNT', label: 'Discount', description: 'Discount rules or special pricing' },
  { value: 'ORDER', label: 'Order', description: 'Orders above certain thresholds' },
  { value: 'CONTRACT', label: 'Contract', description: 'Contracts requiring legal review' },
];

export const APPROVER_TYPES: { value: ApproverType; label: string; description: string }[] = [
  { value: 'USER', label: 'Specific User', description: 'A specific user must approve' },
  { value: 'ROLE', label: 'Role', description: 'Anyone with the specified role can approve' },
  { value: 'MANAGER', label: 'Manager', description: 'The submitter\'s direct manager' },
  { value: 'SKIP_LEVEL_MANAGER', label: 'Skip-Level Manager', description: 'The submitter\'s manager\'s manager' },
];

export const CONDITION_FIELDS: { field: string; label: string; type: 'number' | 'string' | 'select' }[] = [
  { field: 'total', label: 'Total Amount', type: 'number' },
  { field: 'discount', label: 'Discount Amount', type: 'number' },
  { field: 'discountPercent', label: 'Discount Percentage', type: 'number' },
  { field: 'lineItemCount', label: 'Line Item Count', type: 'number' },
  { field: 'accountType', label: 'Account Type', type: 'select' },
  { field: 'region', label: 'Region', type: 'select' },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; applicableTo: ('number' | 'string' | 'select')[] }[] = [
  { value: 'EQUALS', label: 'Equals', applicableTo: ['number', 'string', 'select'] },
  { value: 'NOT_EQUALS', label: 'Not Equals', applicableTo: ['number', 'string', 'select'] },
  { value: 'GREATER_THAN', label: 'Greater Than', applicableTo: ['number'] },
  { value: 'LESS_THAN', label: 'Less Than', applicableTo: ['number'] },
  { value: 'GREATER_THAN_OR_EQUALS', label: 'Greater Than or Equals', applicableTo: ['number'] },
  { value: 'LESS_THAN_OR_EQUALS', label: 'Less Than or Equals', applicableTo: ['number'] },
  { value: 'CONTAINS', label: 'Contains', applicableTo: ['string'] },
  { value: 'IN', label: 'In List', applicableTo: ['select'] },
];
