import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Enums matching Prisma
export enum ApprovalEntity {
  QUOTE = 'QUOTE',
  DISCOUNT = 'DISCOUNT',
  ORDER = 'ORDER',
  CONTRACT = 'CONTRACT',
}

export enum ApproverType {
  USER = 'USER',
  ROLE = 'ROLE',
  MANAGER = 'MANAGER',
  SKIP_LEVEL_MANAGER = 'SKIP_LEVEL_MANAGER',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DELEGATE = 'DELEGATE',
  ESCALATE = 'ESCALATE',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUALS = 'GREATER_THAN_OR_EQUALS',
  LESS_THAN_OR_EQUALS = 'LESS_THAN_OR_EQUALS',
  CONTAINS = 'CONTAINS',
  IN = 'IN',
}

// Workflow Condition
export class WorkflowConditionDto {
  @IsString()
  field: string;

  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @IsNotEmpty()
  value: string | number | string[];
}

// Create Approval Workflow
export class CreateApprovalWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ApprovalEntity)
  entity: ApprovalEntity;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions?: WorkflowConditionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

// Update Approval Workflow
export class UpdateApprovalWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions?: WorkflowConditionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

// Create Approval Step
export class CreateApprovalStepDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ApproverType)
  approverType: ApproverType;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoApproveAfterHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoRejectAfterHours?: number;

  @IsOptional()
  @IsBoolean()
  requireComment?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDelegation?: boolean;
}

// Update Approval Step
export class UpdateApprovalStepDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ApproverType)
  approverType?: ApproverType;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoApproveAfterHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoRejectAfterHours?: number;

  @IsOptional()
  @IsBoolean()
  requireComment?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDelegation?: boolean;
}

// Submit for Approval
export class SubmitForApprovalDto {
  @IsEnum(ApprovalEntity)
  entityType: ApprovalEntity;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

// Approval Decision
export class ApprovalDecisionDto {
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  delegateToId?: string;
}

// Reorder Steps
export class ReorderStepsDto {
  @IsArray()
  @IsString({ each: true })
  stepIds: string[];
}

// Clone Workflow
export class CloneWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

// Cancel Request
export class CancelRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
