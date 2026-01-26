/**
 * AI Builder Types
 * Types for AI-powered configuration generation
 */

export enum AIBuilderEntityType {
  WEB_FORM = 'web-form',
  CUSTOM_FIELDS = 'custom-fields',
  EMAIL_TEMPLATE = 'email-template',
  ASSIGNMENT_RULE = 'assignment-rule',
  WORKFLOW = 'workflow',
  PRODUCT = 'product',
  PROFILE = 'profile',
  REPORT = 'report',
  SMART_BUILDER = 'smart-builder',
}

export interface GenerationContext {
  existingFields?: string[];
  industry?: string;
  companyType?: string;
  targetEntity?: string;
  teamMembers?: Array<{ id: string; name: string; email: string }>;
  mergeFields?: string[];
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface GenerateConfigRequest {
  entityType: AIBuilderEntityType;
  prompt: string;
  context?: GenerationContext;
}

export interface RefineConfigRequest {
  entityType: AIBuilderEntityType;
  prompt: string;
  previousConfig: Record<string, any>;
  conversationId?: string;
}

export interface GeneratedEntity {
  entityType: string;
  description: string;
  count?: number;
}

export interface GenerationPreview {
  summary: string;
  entities: GeneratedEntity[];
  warnings?: string[];
  suggestions?: string[];
}

export interface GenerateConfigResponse {
  success: boolean;
  preview?: GenerationPreview;
  rawConfig?: Record<string, any>;
  error?: string;
  conversationId?: string;
}

export interface EntityTypeInfo {
  type: AIBuilderEntityType;
  description: string;
  examples: string[];
}

// Type guards
export function isWebFormConfig(config: Record<string, any>): config is WebFormConfig {
  return 'fields' in config && 'name' in config && Array.isArray(config.fields);
}

export function isCustomFieldsConfig(config: Record<string, any>): config is CustomFieldsConfig {
  return 'fields' in config && Array.isArray(config.fields) && config.fields[0]?.entity;
}

export function isEmailTemplateConfig(config: Record<string, any>): config is EmailTemplateConfig {
  return 'subject' in config && 'bodyHtml' in config;
}

export function isAssignmentRuleConfig(config: Record<string, any>): config is AssignmentRuleConfig {
  return ('rules' in config && Array.isArray(config.rules)) ||
         ('conditions' in config && 'assignees' in config);
}

export function isWorkflowConfig(config: Record<string, any>): config is WorkflowConfig {
  return 'trigger' in config && 'actions' in config && Array.isArray(config.actions);
}

export function isProductConfig(config: Record<string, any>): config is ProductConfig {
  return 'sku' in config && 'name' in config && 'unitPrice' in config;
}

export function isProfileConfig(config: Record<string, any>): config is ProfileConfig {
  return 'name' in config && 'permissions' in config && Array.isArray(config.permissions);
}

export function isReportConfig(config: Record<string, any>): config is ReportConfig {
  return 'name' in config && 'type' in config && 'chartType' in config;
}

// Config types for each entity
export interface WebFormConfig {
  name: string;
  description?: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
    required?: boolean;
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
  }>;
  settings?: {
    submitButtonText?: string;
    showLabels?: boolean;
    showPlaceholders?: boolean;
    enableCaptcha?: boolean;
    doubleOptIn?: boolean;
  };
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    borderRadius?: string;
  };
  thankYouMessage?: string;
  redirectUrl?: string;
}

export interface CustomFieldsConfig {
  fields: Array<{
    name: string;
    label: string;
    description?: string;
    entity: 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY';
    fieldType: string;
    isRequired?: boolean;
    isUnique?: boolean;
    defaultValue?: string;
    picklistValues?: Array<{ value: string; label: string }>;
    maxLength?: number;
    precision?: number;
    minValue?: number;
    maxValue?: number;
  }>;
}

export interface EmailTemplateConfig {
  name: string;
  slug: string;
  description?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  preheader?: string;
  category?: string;
  variables?: string[];
  ctaText?: string;
  ctaUrl?: string;
}

export interface AssignmentRuleConfig {
  rules?: Array<SingleAssignmentRule>;
  // Or single rule
  name?: string;
  description?: string;
  entity?: 'LEAD' | 'OPPORTUNITY';
  method?: string;
  isActive?: boolean;
  order?: number;
  conditions?: Array<{
    field: string;
    operator: string;
    value: string;
    order?: number;
  }>;
  assignees?: Array<{
    userId: string;
    userName?: string;
    teamId?: string;
    weight?: number;
    order?: number;
  }>;
}

export interface SingleAssignmentRule {
  name: string;
  description?: string;
  entity: 'LEAD' | 'OPPORTUNITY';
  method: string;
  isActive: boolean;
  order: number;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    order?: number;
  }>;
  assignees: Array<{
    userId: string;
    userName?: string;
    teamId?: string;
    weight?: number;
    order?: number;
  }>;
}

// Workflow Config
export interface WorkflowConfig {
  name: string;
  description?: string;
  trigger: {
    type: 'RECORD_CREATED' | 'RECORD_UPDATED' | 'STAGE_CHANGED' | 'FIELD_CHANGED' | 'DATE_REACHED' | 'MANUAL';
    entity: 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY' | 'TASK';
    conditions?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };
  conditions?: Array<{
    field: string;
    operator: string;
    value: string;
    logicalOperator?: 'AND' | 'OR';
  }>;
  actions: Array<{
    type: 'SEND_EMAIL' | 'CREATE_TASK' | 'UPDATE_FIELD' | 'CREATE_RECORD' | 'NOTIFY_USER' | 'ASSIGN_TO' | 'ADD_TAG' | 'WEBHOOK';
    order: number;
    config: Record<string, any>;
  }>;
  isActive?: boolean;
}

// Product Config
export interface ProductConfig {
  name: string;
  sku: string;
  description?: string;
  type: 'PRODUCT' | 'SERVICE' | 'SUBSCRIPTION' | 'LICENSE' | 'BUNDLE' | 'ADD_ON';
  category?: string;
  unitPrice: number;
  costPrice?: number;
  currency?: string;
  billingFrequency?: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  isActive?: boolean;
  features?: string[];
  taxable?: boolean;
  minimumQuantity?: number;
  maximumQuantity?: number;
  priceTiers?: Array<{
    minQuantity: number;
    maxQuantity?: number;
    unitPrice: number;
    discount?: number;
  }>;
}

// Profile Config
export interface ProfileConfig {
  name: string;
  description?: string;
  permissions: Array<{
    module: string;
    actions: string[];
    dataAccess: 'NONE' | 'OWN' | 'TEAM' | 'ALL';
  }>;
}

// Report Config
export interface ReportConfig {
  name: string;
  description?: string;
  type: 'PIPELINE' | 'WIN_RATE' | 'ACTIVITY' | 'REVENUE' | 'LEAD_CONVERSION' | 'FORECAST' | 'CUSTOM';
  chartType: 'BAR' | 'LINE' | 'PIE' | 'FUNNEL' | 'TABLE' | 'KPI';
  groupBy?: string;
  filters?: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    ownerIds?: string[];
    stages?: string[];
    sources?: string[];
    industries?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  metrics?: string[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
}

// Smart Builder Config - Cross-entity generation
export interface SmartBuilderEntity {
  entityType: AIBuilderEntityType | string;
  order: number;
  name: string;
  description: string;
  dependsOn: number[];
  config: Record<string, any>;
  selected?: boolean; // For UI selection state
}

export interface SmartBuilderCrossReference {
  fromEntity: number;
  fromField: string;
  toEntity: number;
  toField: string;
  description: string;
}

export interface SmartBuilderConfig {
  summary: string;
  entities: SmartBuilderEntity[];
  crossReferences?: SmartBuilderCrossReference[];
}

export function isSmartBuilderConfig(config: Record<string, any>): config is SmartBuilderConfig {
  return 'summary' in config && 'entities' in config && Array.isArray(config.entities);
}
