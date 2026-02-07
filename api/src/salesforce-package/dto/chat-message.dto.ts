import { IsString, IsOptional, IsObject, IsEnum, IsNumber, Min } from 'class-validator';

export enum ChatMode {
  CRM = 'crm',
  DOCUMENT = 'document',
  SALESFORCE = 'salesforce',
}

export class SalesforceContextDto {
  @IsOptional()
  @IsString()
  recordId?: string;

  @IsOptional()
  @IsString()
  recordType?: string;

  @IsOptional()
  @IsObject()
  recordData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  user?: any;

  @IsOptional()
  @IsString()
  objectType?: string;

  @IsOptional()
  @IsObject()
  record?: any;

  @IsOptional()
  @IsObject()
  account?: any;

  @IsOptional()
  stakeholders?: any[];

  @IsOptional()
  contacts?: any[];

  @IsOptional()
  openOpportunities?: any[];

  @IsOptional()
  @IsNumber()
  pipelineValue?: number;

  @IsOptional()
  openCases?: any[];

  @IsOptional()
  @IsObject()
  dealHealth?: any;

  @IsOptional()
  @IsNumber()
  leadScore?: number;

  @IsOptional()
  @IsNumber()
  leadAgeDays?: number;

  @IsOptional()
  competitors?: any[];

  @IsOptional()
  recentActivities?: any[];

  @IsOptional()
  @IsString()
  contextType?: string;

  @IsOptional()
  @IsObject()
  pipelineSummary?: any;

  @IsOptional()
  todaysTasks?: any[];
}

export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  context?: SalesforceContextDto;

  @IsOptional()
  @IsEnum(ChatMode)
  mode?: ChatMode;
}

export class InitiateStreamDto extends SendMessageDto {
  @IsOptional()
  @IsString()
  requestId?: string;
}

export class PollChunksDto {
  @IsString()
  requestId: string;

  @IsNumber()
  @Min(0)
  lastChunkIndex: number;
}

export class MessageResponseDto {
  conversationId: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    toolCalls?: Array<{
      tool: string;
      input: object;
      output: object;
    }>;
    suggestedFollowUps?: string[];
    metadata?: object;
  };
  usage: {
    tokensUsed: number;
    apiCallsRemaining: number;
  };
}

export class StreamChunkDto {
  index: number;
  content: string;
  type: 'text' | 'tool_use' | 'complete';
}

export class PollResponseDto {
  chunks: StreamChunkDto[];
  isComplete: boolean;
  totalChunks: number;
}

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    recordId?: string;
    recordType?: string;
  };
}
