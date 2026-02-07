// Admin DTOs for API endpoints
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// SYSTEM CONFIG DTOs
// ============================================

export class UpdateSystemConfigDto {
  @ApiProperty({ description: 'Configuration key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Configuration value (JSON-encoded)' })
  @IsString()
  value: string;
}

export class BulkUpdateConfigDto {
  @ApiProperty({ type: [UpdateSystemConfigDto] })
  @IsArray()
  configs: UpdateSystemConfigDto[];
}

export class CreateSystemConfigDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  validation?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;
}

// ============================================
// FEATURE FLAG DTOs
// ============================================

export class CreateFeatureFlagDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allowedRoles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allowedUsers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allowedRoles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allowedUsers?: string[];
}

export class ToggleFeatureFlagDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

// ============================================
// USER MANAGEMENT DTOs
// ============================================

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class InviteUserDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

// ============================================
// AUDIT LOG DTOs
// ============================================

export class AuditLogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================
// INTEGRATION DTOs
// ============================================

export class CreateIntegrationDto {
  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

// ============================================
// AI CONFIG DTOs
// ============================================

export class UpdateAIConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anthropicApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anthropicEndpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anthropicDeployment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  useAnthropic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Maximum requests per minute per user' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxRequestsPerMinute?: number;

  @ApiPropertyOptional({ description: 'Maximum tokens per day per organization' })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  maxTokensPerDay?: number;

  @ApiPropertyOptional({ description: 'Enable streaming responses' })
  @IsOptional()
  @IsBoolean()
  enableStreaming?: boolean;

  @ApiPropertyOptional({ description: 'Enable AI tools (CRM, web search, etc.)' })
  @IsOptional()
  @IsBoolean()
  enableTools?: boolean;

  @ApiPropertyOptional({ description: 'Enable vision/image analysis' })
  @IsOptional()
  @IsBoolean()
  enableVision?: boolean;
}

export class UpdateMeetingIntelligenceConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoUpdateCrm?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCreateTasks?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoUpdateOpportunity?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoStoreInsights?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(50)
  minTranscriptLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minInsightConfidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minBuyingSignalConfidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxActionItemsPerMeeting?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  maxInsightsPerMeeting?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxProbabilityChange?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableContentFiltering?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableDuplicateDetection?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableAuditLogging?: boolean;
}

// ============================================
// APPLICATION LOG DTOs
// ============================================

// ============================================
// SIGNAL RULE DTOs
// ============================================

export enum SignalType {
  EXEC_CHANGE = 'EXEC_CHANGE',
  FUNDING = 'FUNDING',
  EXPANSION = 'EXPANSION',
  NEWS = 'NEWS',
  USAGE_SPIKE = 'USAGE_SPIKE',
  USAGE_DECLINE = 'USAGE_DECLINE',
  ENGAGEMENT_SPIKE = 'ENGAGEMENT_SPIKE',
  ENGAGEMENT_DECLINE = 'ENGAGEMENT_DECLINE',
  TECH_CHANGE = 'TECH_CHANGE',
  COMPETITIVE_THREAT = 'COMPETITIVE_THREAT',
  CONTRACT_RENEWAL = 'CONTRACT_RENEWAL',
  BUDGET_CYCLE = 'BUDGET_CYCLE',
}

export enum SignalSource {
  INTERNAL_CRM = 'INTERNAL_CRM',
  ZOOMINFO = 'ZOOMINFO',
  SNOWFLAKE = 'SNOWFLAKE',
  NEWS = 'NEWS',
  NEWSLETTER = 'NEWSLETTER',
  SIXSENSE = 'SIXSENSE',
  MANUAL = 'MANUAL',
}

export enum SignalPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export class CreateSignalRuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SignalType })
  @IsEnum(SignalType)
  signalType: SignalType;

  @ApiProperty({ enum: SignalSource })
  @IsEnum(SignalSource)
  triggerSource: SignalSource;

  @ApiProperty({ description: 'Conditions for triggering the rule' })
  @IsObject()
  conditions: Record<string, any>;

  @ApiPropertyOptional({ enum: SignalPriority })
  @IsOptional()
  @IsEnum(SignalPriority)
  priority?: SignalPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCreateSignal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOwner?: boolean;
}

export class UpdateSignalRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SignalType })
  @IsOptional()
  @IsEnum(SignalType)
  signalType?: SignalType;

  @ApiPropertyOptional({ enum: SignalSource })
  @IsOptional()
  @IsEnum(SignalSource)
  triggerSource?: SignalSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ enum: SignalPriority })
  @IsOptional()
  @IsEnum(SignalPriority)
  priority?: SignalPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCreateSignal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOwner?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================
// AGENT CONFIG DTOs
// ============================================

export enum AgentScheduleType {
  MANUAL = 'MANUAL',
  REALTIME = 'REALTIME',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export class UpdateAgentConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ enum: AgentScheduleType })
  @IsOptional()
  @IsEnum(AgentScheduleType)
  scheduleType?: AgentScheduleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronSchedule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIntegrations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxExecutionsPerHour?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  maxTokensPerExecution?: number;
}

// ============================================
// PLAYBOOK DTOs
// ============================================

export class CreatePlaybookDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category for frontend grouping (not stored in DB)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'SIGNAL_BASED', 'DEAL_STAGE_CHANGE', 'TIME_BASED'] })
  @IsOptional()
  @IsString()
  trigger?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetStage?: string;

  @ApiPropertyOptional({ enum: ['ALL_DEALS', 'NEW_BUSINESS', 'EXPANSION', 'RENEWAL', 'UPSELL'] })
  @IsOptional()
  @IsString()
  targetDealType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdatePlaybookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePlaybookStepDto {
  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPhrases?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examples?: string[];
}

// ============================================
// APPLICATION LOG DTOs
// ============================================

export class ApplicationLogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================
// DATABASE BACKUP DTOs
// ============================================

export enum BackupTypeEnum {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  SCHEMA_ONLY = 'SCHEMA_ONLY',
  DATA_ONLY = 'DATA_ONLY',
}

export enum BackupStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export class CreateBackupDto {
  @ApiPropertyOptional({ enum: BackupTypeEnum, default: 'FULL' })
  @IsOptional()
  @IsEnum(BackupTypeEnum)
  type?: BackupTypeEnum;

  @ApiPropertyOptional({ description: 'Backup description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Compress backup file', default: true })
  @IsOptional()
  @IsBoolean()
  compressed?: boolean;

  @ApiPropertyOptional({ description: 'Retention period in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  retentionDays?: number;
}

export class BackupQueryDto {
  @ApiPropertyOptional({ enum: BackupStatusEnum })
  @IsOptional()
  @IsEnum(BackupStatusEnum)
  status?: BackupStatusEnum;

  @ApiPropertyOptional({ enum: BackupTypeEnum })
  @IsOptional()
  @IsEnum(BackupTypeEnum)
  type?: BackupTypeEnum;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class CreateBackupScheduleDto {
  @ApiProperty({ description: 'Schedule name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Cron expression', default: '0 2 * * *' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ enum: BackupTypeEnum, default: 'FULL' })
  @IsOptional()
  @IsEnum(BackupTypeEnum)
  backupType?: BackupTypeEnum;

  @ApiPropertyOptional({ description: 'Retention period in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  retentionDays?: number;
}

export class UpdateBackupScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ enum: BackupTypeEnum })
  @IsOptional()
  @IsEnum(BackupTypeEnum)
  backupType?: BackupTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  retentionDays?: number;
}

