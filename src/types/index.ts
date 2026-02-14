// Auth types
export * from './auth';

// CRM entity types
export * from './lead';
export * from './account';
export * from './contact';
export * from './opportunity';
export * from './pipeline';
export * from './task';
export * from './activity';
export * from './campaign';

// AI and communication types
export * from './conversation';
export * from './meeting';

// Phase 1 feature types
export * from './customField';
export * from './profile';
export * from './twoFactor';
export * from './priceBook';
export * from './quote';
export * from './emailTemplate';
export * from './assignmentRule';
export * from './webForm';
export * from './apiKey';
export * from './aiBuilder';
export * from './discountRule';
export * from './taxRate';
// Re-export approvalWorkflow but exclude ConditionOperator to avoid conflict with assignmentRule
export {
  type ApprovalWorkflow,
  type ApprovalStep,
  type ApprovalAction,
  type ApprovalRequest,
  type ApprovalDecision,
  type CreateApprovalWorkflowDto,
  type UpdateApprovalWorkflowDto,
  type CreateApprovalStepDto,
  type UpdateApprovalStepDto,
  type SubmitForApprovalDto,
  type ApprovalDecisionDto,
  type ApprovalStatus,
  type ApprovalEntity,
  type ApprovalWorkflowStats,
  type WorkflowCondition,
  CONDITION_OPERATORS as APPROVAL_CONDITION_OPERATORS,
} from './approvalWorkflow';
export * from './quoteVersion';
export * from './esignature';
export * from './order';
// Re-export cpqAnalytics but exclude AccountRevenue to avoid conflict with account
export {
  type CPQDashboardMetrics,
  type QuoteMetrics,
  type OrderMetrics,
  type ProductMetrics,
  type TopProduct,
  type CategoryCount,
  type ConversionMetrics,
  type StageConversion,
  type LostReason,
  type RevenueMetrics,
  type MonthlyRevenue,
  type ProductRevenue,
  // AccountRevenue excluded - use the one from account.ts
  type CPQTrendData,
  type CPQAnalyticsFilters,
  type CPQAnalyticsSnapshot,
  type QuotePipelineData,
  type SalesRepPerformance,
  type CPQForecast,
} from './cpqAnalytics';
export * from './territory';
export * from './playbook';

// Re-export specific types needed for dashboard
export type { PipelineStats, SalesForecast } from './opportunity';
export type { LeadStats } from './lead';

// Common types
export interface PaginatedResponse<T> {
  data: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
  pageSize?: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface QueryFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
