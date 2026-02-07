/**
 * DTOs for Agent Builder API
 */

import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Agent description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Category', default: 'custom' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Icon name (Lucide)' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color hex code' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: 'System prompt for the agent' })
  @IsString()
  systemPrompt: string;

  @ApiPropertyOptional({ description: 'Analysis prompt' })
  @IsString()
  @IsOptional()
  analysisPrompt?: string;

  @ApiPropertyOptional({ description: 'Output format (JSON schema)' })
  @IsString()
  @IsOptional()
  outputFormat?: string;

  @ApiPropertyOptional({ description: 'Model ID', default: 'claude-sonnet' })
  @IsString()
  @IsOptional()
  modelId?: string;

  @ApiPropertyOptional({ description: 'Temperature', default: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Max tokens', default: 4000 })
  @IsNumber()
  @Min(100)
  @Max(100000)
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Enabled tools', default: [] })
  @IsArray()
  @IsOptional()
  enabledTools?: string[];

  @ApiPropertyOptional({ description: 'Trigger configuration' })
  @IsObject()
  @IsOptional()
  triggerConfig?: {
    schedule?: { cron?: string; enabled: boolean };
    events?: string[];
    manual?: boolean;
  };

  @ApiPropertyOptional({ description: 'Target entity types' })
  @IsArray()
  @IsOptional()
  targetEntityTypes?: string[];

  @ApiPropertyOptional({ description: 'Target filters' })
  @IsObject()
  @IsOptional()
  targetFilters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Alert types this agent can create' })
  @IsArray()
  @IsOptional()
  alertTypes?: string[];

  @ApiPropertyOptional({ description: 'Requires approval for actions', default: true })
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Max execution time (ms)', default: 60000 })
  @IsNumber()
  @IsOptional()
  maxExecutionTimeMs?: number;

  @ApiPropertyOptional({ description: 'Max LLM calls per execution', default: 10 })
  @IsNumber()
  @IsOptional()
  maxLLMCalls?: number;

  @ApiPropertyOptional({ description: 'Use external CRM data source (Salesforce) instead of local database', default: false })
  @IsBoolean()
  @IsOptional()
  useExternalCrmData?: boolean;

  @ApiPropertyOptional({ description: 'External CRM provider (SALESFORCE, HUBSPOT, etc.)' })
  @IsString()
  @IsOptional()
  externalCrmProvider?: string;
}

export class UpdateAgentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  analysisPrompt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  outputFormat?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  modelId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  enabledTools?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  triggerConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  targetEntityTypes?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  targetFilters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  alertTypes?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxExecutionTimeMs?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxLLMCalls?: number;

  @ApiPropertyOptional({ description: 'Use external CRM data source (Salesforce) instead of local database' })
  @IsBoolean()
  @IsOptional()
  useExternalCrmData?: boolean;

  @ApiPropertyOptional({ description: 'External CRM provider (SALESFORCE, HUBSPOT, etc.)' })
  @IsString()
  @IsOptional()
  externalCrmProvider?: string;
}

export class RunAgentDto {
  @ApiPropertyOptional({ description: 'Target entity type' })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Target entity ID' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Execution scope' })
  @IsObject()
  @IsOptional()
  scope?: {
    userIds?: string[];
    accountIds?: string[];
    fromDate?: string;
    toDate?: string;
    maxEntities?: number;
    filters?: Record<string, any>;
  };

  @ApiPropertyOptional({ description: 'Override: Use external CRM data source at runtime' })
  @IsBoolean()
  @IsOptional()
  useExternalCrmData?: boolean;

  @ApiPropertyOptional({ description: 'Override: External CRM provider at runtime' })
  @IsString()
  @IsOptional()
  externalCrmProvider?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class QueryAgentsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  offset?: number;
}

export class QueryExecutionLogsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}


