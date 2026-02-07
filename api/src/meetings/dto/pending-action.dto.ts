import { IsString, IsOptional, IsArray, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PendingActionStatus } from '@prisma/client';

export class ApproveActionDto {
  @ApiPropertyOptional({ description: 'Optional edits to apply before execution' })
  @IsOptional()
  @IsObject()
  edits?: Record<string, any>;
}

export class ApproveBulkActionsDto {
  @ApiProperty({ description: 'Array of action IDs to approve' })
  @IsArray()
  @IsString({ each: true })
  actionIds: string[];
}

export class RejectActionDto {
  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EditActionDto {
  @ApiProperty({ description: 'Updated data to merge with proposed data' })
  @IsObject()
  updatedData: Record<string, any>;
}

export class ListPendingActionsQueryDto {
  @ApiPropertyOptional({ enum: PendingActionStatus })
  @IsOptional()
  @IsEnum(PendingActionStatus)
  status?: PendingActionStatus;

  @ApiPropertyOptional({ description: 'Filter by meeting session ID' })
  @IsOptional()
  @IsString()
  meetingSessionId?: string;
}

export class PendingActionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  meetingSessionId: string;

  @ApiProperty()
  actionType: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  targetEntity: string;

  @ApiPropertyOptional()
  targetEntityId?: string;

  @ApiProperty()
  proposedData: Record<string, any>;

  @ApiProperty()
  dataSource: string;

  @ApiPropertyOptional()
  salesforceObjectType?: string;

  @ApiProperty()
  priority: string;

  @ApiPropertyOptional()
  confidence?: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  reviewedBy?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  executedAt?: Date;

  @ApiPropertyOptional()
  resultEntityId?: string;

  @ApiPropertyOptional()
  executionError?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  meetingSession?: {
    id: string;
    title: string;
    scheduledStart: Date;
  };
}

export class BulkApprovalResultDto {
  @ApiProperty({ description: 'IDs of successfully approved actions' })
  success: string[];

  @ApiProperty({ description: 'IDs of failed approvals' })
  failed: string[];
}
