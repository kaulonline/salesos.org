// Assignment Rule Types for SalesOS CRM
// Auto-assign leads and deals based on configurable criteria

export type AssignmentRuleEntity = 'LEAD' | 'OPPORTUNITY';

export type AssignmentMethod =
  | 'ROUND_ROBIN'
  | 'LOAD_BALANCED'
  | 'FIXED'
  | 'TERRITORY'
  | 'LEAD_SCORE';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'GREATER_OR_EQUAL' // Alias
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'LESS_OR_EQUAL' // Alias
  | 'IN'
  | 'NOT_IN'
  | 'IN_LIST' // Alias for IN
  | 'NOT_IN_LIST' // Alias for NOT_IN
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY'
  | 'BETWEEN';

export type LogicalOperator = 'AND' | 'OR';

export interface RuleCondition {
  id: string;
  field: string;
  fieldLabel?: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
  logicalOperator?: LogicalOperator;
}

export interface RuleAssignee {
  id: string;
  userId: string;
  weight: number;
  maxActiveRecords?: number;
  currentActiveRecords?: number;
  territories?: string[];
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface AssignmentRule {
  id: string;
  name: string;
  description?: string;
  entity: AssignmentRuleEntity;
  isActive: boolean;
  priority: number;
  method: AssignmentMethod;
  conditions: RuleCondition[];
  assignees: RuleAssignee[];
  fallbackOwnerId?: string;
  fallbackOwner?: {
    id: string;
    name: string;
    email: string;
  };
  notifyAssignee: boolean;
  notifyTemplateId?: string;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    executionCount: number;
    successRate?: number;
    lastExecutedAt?: string;
  };
}

export interface CreateAssignmentRuleDto {
  name: string;
  description?: string;
  entity: AssignmentRuleEntity;
  priority?: number;
  method: AssignmentMethod;
  conditions: Omit<RuleCondition, 'id'>[];
  assignees: Omit<RuleAssignee, 'id' | 'user' | 'currentActiveRecords'>[];
  fallbackOwnerId?: string;
  notifyAssignee?: boolean;
  notifyTemplateId?: string;
}

export interface UpdateAssignmentRuleDto {
  name?: string;
  description?: string;
  priority?: number;
  method?: AssignmentMethod;
  conditions?: Omit<RuleCondition, 'id'>[];
  assignees?: Omit<RuleAssignee, 'id' | 'user' | 'currentActiveRecords'>[];
  fallbackOwnerId?: string;
  notifyAssignee?: boolean;
  notifyTemplateId?: string;
  isActive?: boolean;
}

export interface TestAssignmentRuleDto {
  entity: AssignmentRuleEntity;
  recordData: Record<string, unknown>;
}

export interface TestAssignmentRuleResult {
  matchedRule?: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  matchedConditions: string[];
  unmatchedConditions: string[];
  reason: string;
}

export interface AssignmentRuleStats {
  totalRules: number;
  activeRules: number;
  executionsToday: number;
  executionsThisWeek: number;
  executionsThisMonth: number;
  byEntity: Record<AssignmentRuleEntity, number>;
  byMethod: Record<AssignmentMethod, number>;
  topRules: { id: string; name: string; executionCount: number }[];
  // Aliases for backward compatibility
  total?: number;
  active?: number;
  inactive?: number;
  totalAssignments?: number;
  assignmentsToday?: number;
}

export interface ReorderAssignmentRulesDto {
  ruleIds: string[];
}

// Field definitions for condition builder
export interface AssignableField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'picklist';
  entity: AssignmentRuleEntity;
  operators: ConditionOperator[];
  picklistValues?: { value: string; label: string }[];
}

// Default assignable fields
export const LEAD_ASSIGNABLE_FIELDS: AssignableField[] = [
  { field: 'leadSource', label: 'Lead Source', type: 'picklist', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'status', label: 'Status', type: 'picklist', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'rating', label: 'Rating', type: 'picklist', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'industry', label: 'Industry', type: 'string', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'IN', 'NOT_IN'] },
  { field: 'country', label: 'Country', type: 'string', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'state', label: 'State', type: 'string', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'city', label: 'City', type: 'string', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS'] },
  { field: 'company', label: 'Company', type: 'string', entity: 'LEAD', operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'STARTS_WITH'] },
  { field: 'annualRevenue', label: 'Annual Revenue', type: 'number', entity: 'LEAD', operators: ['EQUALS', 'GREATER_THAN', 'LESS_THAN', 'BETWEEN'] },
  { field: 'numberOfEmployees', label: 'Employee Count', type: 'number', entity: 'LEAD', operators: ['EQUALS', 'GREATER_THAN', 'LESS_THAN', 'BETWEEN'] },
  { field: 'leadScore', label: 'Lead Score', type: 'number', entity: 'LEAD', operators: ['EQUALS', 'GREATER_THAN', 'LESS_THAN', 'BETWEEN'] },
];

export const OPPORTUNITY_ASSIGNABLE_FIELDS: AssignableField[] = [
  { field: 'stage', label: 'Stage', type: 'picklist', entity: 'OPPORTUNITY', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'type', label: 'Type', type: 'picklist', entity: 'OPPORTUNITY', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'source', label: 'Source', type: 'picklist', entity: 'OPPORTUNITY', operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  { field: 'amount', label: 'Amount', type: 'number', entity: 'OPPORTUNITY', operators: ['EQUALS', 'GREATER_THAN', 'LESS_THAN', 'BETWEEN'] },
  { field: 'probability', label: 'Probability', type: 'number', entity: 'OPPORTUNITY', operators: ['EQUALS', 'GREATER_THAN', 'LESS_THAN', 'BETWEEN'] },
];

// Assignment method labels
export const ASSIGNMENT_METHOD_LABELS: Record<AssignmentMethod, string> = {
  ROUND_ROBIN: 'Round Robin',
  LOAD_BALANCED: 'Load Balanced',
  FIXED: 'Fixed Assignment',
  TERRITORY: 'Territory Based',
  LEAD_SCORE: 'Lead Score Based',
};

// Condition operator labels
export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  EQUALS: 'equals',
  NOT_EQUALS: 'does not equal',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'does not contain',
  STARTS_WITH: 'starts with',
  ENDS_WITH: 'ends with',
  GREATER_THAN: 'is greater than',
  GREATER_THAN_OR_EQUAL: 'is greater than or equal to',
  GREATER_OR_EQUAL: 'is greater than or equal to',
  LESS_THAN: 'is less than',
  LESS_THAN_OR_EQUAL: 'is less than or equal to',
  LESS_OR_EQUAL: 'is less than or equal to',
  IN: 'is in',
  NOT_IN: 'is not in',
  IN_LIST: 'is in list',
  NOT_IN_LIST: 'is not in list',
  IS_EMPTY: 'is empty',
  IS_NOT_EMPTY: 'is not empty',
  BETWEEN: 'is between',
};
