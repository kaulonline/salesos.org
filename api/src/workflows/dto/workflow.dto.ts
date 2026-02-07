import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WorkflowTriggerType {
  RECORD_CREATED = 'RECORD_CREATED',
  RECORD_UPDATED = 'RECORD_UPDATED',
  RECORD_DELETED = 'RECORD_DELETED',
  FIELD_CHANGED = 'FIELD_CHANGED',
  STAGE_CHANGED = 'STAGE_CHANGED',
  TIME_BASED = 'TIME_BASED',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
}

export enum WorkflowActionType {
  SEND_EMAIL = 'SEND_EMAIL',
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_FIELD = 'UPDATE_FIELD',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  WEBHOOK_CALL = 'WEBHOOK_CALL',
  ASSIGN_OWNER = 'ASSIGN_OWNER',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  CREATE_ACTIVITY = 'CREATE_ACTIVITY',
}

export enum WorkflowStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

export enum WorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WorkflowEntityType {
  LEAD = 'LEAD',
  CONTACT = 'CONTACT',
  ACCOUNT = 'ACCOUNT',
  OPPORTUNITY = 'OPPORTUNITY',
  TASK = 'TASK',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY',
  CHANGED = 'CHANGED',
  CHANGED_TO = 'CHANGED_TO',
  CHANGED_FROM = 'CHANGED_FROM',
}

// Trigger configuration types
export interface RecordTriggerConfig {
  // No additional config needed for basic record triggers
}

export interface FieldChangedTriggerConfig {
  fieldName: string;
  fromValue?: string;
  toValue?: string;
}

export interface StageChangedTriggerConfig {
  fromStage?: string;
  toStage?: string;
}

export interface TimeBasedTriggerConfig {
  schedule: string; // Cron expression
  timezone?: string;
}

export interface WebhookTriggerConfig {
  webhookId?: string;
  secret?: string;
}

// Condition structure
export class WorkflowCondition {
  @IsString()
  field: string;

  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @IsOptional()
  value?: string | number | boolean;
}

// Action configuration types
export interface SendEmailActionConfig {
  templateId?: string;
  subject: string;
  body: string;
  toField?: string; // Field name containing recipient email
  ccEmails?: string[];
}

export interface CreateTaskActionConfig {
  subject: string;
  description?: string;
  dueInDays?: number;
  priority?: string;
  assignToOwner?: boolean;
  assignToUserId?: string;
}

export interface UpdateFieldActionConfig {
  fieldName: string;
  value: string | number | boolean;
}

export interface SendNotificationActionConfig {
  title: string;
  message: string;
  notifyOwner?: boolean;
  notifyUserIds?: string[];
}

export interface WebhookCallActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  includeRecordData?: boolean;
}

export interface AssignOwnerActionConfig {
  userId?: string;
  roundRobin?: boolean;
  roundRobinUserIds?: string[];
}

export interface TagActionConfig {
  tag: string;
}

export interface CreateActivityActionConfig {
  type: string;
  subject: string;
  description?: string;
}

// Action structure
export class WorkflowAction {
  @IsEnum(WorkflowActionType)
  type: WorkflowActionType;

  @IsObject()
  config:
    | SendEmailActionConfig
    | CreateTaskActionConfig
    | UpdateFieldActionConfig
    | SendNotificationActionConfig
    | WebhookCallActionConfig
    | AssignOwnerActionConfig
    | TagActionConfig
    | CreateActivityActionConfig;
}

// DTOs
export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @IsEnum(WorkflowEntityType)
  triggerEntity: WorkflowEntityType;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowCondition)
  conditions?: WorkflowCondition[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowAction)
  actions: WorkflowAction[];

  @IsOptional()
  @IsBoolean()
  runOnce?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delayMinutes?: number;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @IsEnum(WorkflowEntityType)
  triggerEntity?: WorkflowEntityType;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowCondition)
  conditions?: WorkflowCondition[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowAction)
  actions?: WorkflowAction[];

  @IsOptional()
  @IsBoolean()
  runOnce?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delayMinutes?: number;
}

export class TriggerWorkflowDto {
  @IsString()
  workflowId: string;

  @IsEnum(WorkflowEntityType)
  entityType: WorkflowEntityType;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class WorkflowListQueryDto {
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @IsEnum(WorkflowEntityType)
  triggerEntity?: WorkflowEntityType;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class ExecutionListQueryDto {
  @IsOptional()
  @IsString()
  workflowId?: string;

  @IsOptional()
  @IsEnum(WorkflowExecutionStatus)
  status?: WorkflowExecutionStatus;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

// Response types
export interface WorkflowResponse {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  triggerType: WorkflowTriggerType;
  triggerEntity: WorkflowEntityType;
  triggerConfig: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  runOnce: boolean;
  delayMinutes: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  executionCount?: number;
  lastExecutedAt?: Date;
}

export interface WorkflowExecutionResponse {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowExecutionStatus;
  triggeredBy?: string;
  entityType: string;
  entityId: string;
  startedAt?: Date;
  completedAt?: Date;
  actionResults?: unknown[];
  errorMessage?: string;
  createdAt: Date;
}

export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  executionsToday: number;
}
