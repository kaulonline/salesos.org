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
export * from './approvalWorkflow';
export * from './quoteVersion';
export * from './esignature';
export * from './order';
export * from './cpqAnalytics';

// Re-export specific types needed for dashboard
export type { PipelineStats, SalesForecast } from './opportunity';
export type { LeadStats } from './lead';

// Common types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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
