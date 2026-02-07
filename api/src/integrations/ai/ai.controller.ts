import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiProperty,
  ApiParam,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import type { AIProvider } from './ai.service';
import { AIService } from './ai.service';

// DTO Classes for Swagger documentation

class EmailDraftDto {
  @ApiProperty({ description: 'Name of the email recipient' })
  @IsString()
  recipientName: string;

  @ApiProperty({ description: 'Company name of the recipient' })
  @IsString()
  recipientCompany: string;

  @ApiProperty({ description: 'Purpose of the email (e.g., follow-up, introduction, proposal)' })
  @IsString()
  purpose: string;

  @ApiProperty({ description: 'Tone of the email', required: false, default: 'professional and friendly' })
  @IsString()
  @IsOptional()
  tone?: string;

  @ApiProperty({ description: 'Additional context or information to include', required: false })
  @IsString()
  @IsOptional()
  additionalContext?: string;

  @ApiProperty({ description: 'Recipient job title', required: false })
  @IsString()
  @IsOptional()
  recipientTitle?: string;

  @ApiProperty({ description: 'Current deal stage', required: false })
  @IsString()
  @IsOptional()
  dealStage?: string;

  @ApiProperty({ description: 'Deal value in dollars', required: false })
  @IsNumber()
  @IsOptional()
  dealValue?: number;

  @ApiProperty({ description: 'Known pain points of the prospect', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  painPoints?: string[];

  @ApiProperty({ description: 'Summary of last interaction', required: false })
  @IsString()
  @IsOptional()
  lastInteraction?: string;

  @ApiProperty({ description: 'Competitors being considered', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  competitors?: string[];

  @ApiProperty({ description: 'Preferred AI provider', required: false, enum: ['openai', 'anthropic', 'auto'] })
  @IsString()
  @IsOptional()
  provider?: 'openai' | 'anthropic' | 'auto';
}

class DealAnalysisDto {
  @ApiProperty({ description: 'Name of the deal' })
  name: string;

  @ApiProperty({ description: 'Value of the deal in dollars' })
  value: number;

  @ApiProperty({ description: 'Current stage of the deal (e.g., Prospecting, Negotiation, Closing)' })
  stage: string;

  @ApiProperty({ description: 'Notes about the deal', required: false })
  notes?: string;

  @ApiProperty({ description: 'List of recent activities', required: false, type: [String] })
  activities?: string[];

  @ApiProperty({ description: 'Number of days in current stage', required: false })
  daysInStage?: number;

  @ApiProperty({ description: 'Preferred AI provider', required: false, enum: ['openai', 'anthropic', 'auto'] })
  provider?: 'openai' | 'anthropic' | 'auto';
}

class LeadScoringDto {
  @ApiProperty({ description: 'Name of the lead' })
  name: string;

  @ApiProperty({ description: 'Company name', required: false })
  company?: string;

  @ApiProperty({ description: 'Job title', required: false })
  title?: string;

  @ApiProperty({ description: 'Lead source (e.g., Website, Referral, Event)', required: false })
  source?: string;

  @ApiProperty({ description: 'Email address', required: false })
  email?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  phone?: string;

  @ApiProperty({ description: 'Recent activities', required: false, type: [String] })
  activities?: string[];

  @ApiProperty({ description: 'Additional notes', required: false })
  notes?: string;

  @ApiProperty({ description: 'Company website', required: false })
  website?: string;

  @ApiProperty({ description: 'Industry', required: false })
  industry?: string;

  @ApiProperty({ description: 'Company size (e.g., 1-10, 11-50, 51-200)', required: false })
  companySize?: string;

  @ApiProperty({ description: 'Preferred AI provider', required: false, enum: ['openai', 'anthropic', 'auto'] })
  provider?: 'openai' | 'anthropic' | 'auto';
}

class MeetingSummarizeDto {
  @ApiProperty({ description: 'Meeting transcript or notes to summarize' })
  transcript: string;

  @ApiProperty({ description: 'Preferred AI provider', required: false, enum: ['openai', 'anthropic', 'auto'] })
  provider?: 'openai' | 'anthropic' | 'auto';
}

class FollowUpDto {
  @ApiProperty({ description: 'Description of the last interaction', required: false })
  lastInteraction?: string;

  @ApiProperty({ description: 'Date of the last interaction', required: false })
  lastInteractionDate?: string;

  @ApiProperty({ description: 'Current deal stage', required: false })
  dealStage?: string;

  @ApiProperty({ description: 'List of objections raised', required: false, type: [String] })
  objections?: string[];

  @ApiProperty({ description: 'Value of the deal', required: false })
  dealValue?: number;

  @ApiProperty({ description: 'Contact name', required: false })
  contactName?: string;

  @ApiProperty({ description: 'Company name', required: false })
  companyName?: string;

  @ApiProperty({ description: 'List of previous actions taken', required: false, type: [String] })
  previousActions?: string[];

  @ApiProperty({ description: 'Additional deal notes', required: false })
  dealNotes?: string;

  @ApiProperty({ description: 'Preferred AI provider', required: false, enum: ['openai', 'anthropic', 'auto'] })
  provider?: 'openai' | 'anthropic' | 'auto';
}

class CompletionDto {
  @ApiProperty({ description: 'The prompt to send to the AI' })
  prompt: string;

  @ApiProperty({ description: 'System prompt to guide AI behavior', required: false })
  systemPrompt?: string;

  @ApiProperty({ description: 'Maximum tokens in response', required: false, default: 1000 })
  maxTokens?: number;

  @ApiProperty({ description: 'Temperature for response creativity (0-1)', required: false, default: 0.7 })
  temperature?: number;

  @ApiProperty({ description: 'Preferred AI provider', required: false, enum: ['openai', 'anthropic', 'auto'] })
  provider?: 'openai' | 'anthropic' | 'auto';
}

// Response classes for Swagger
class AIStatusResponse {
  @ApiProperty()
  available: boolean;

  @ApiProperty({ nullable: true })
  primaryProvider: string | null;

  @ApiProperty({ nullable: true })
  fallbackProvider: string | null;

  @ApiProperty()
  openaiStatus: { configured: boolean; connected: boolean };

  @ApiProperty()
  anthropicStatus: { configured: boolean; connected: boolean };
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get AI service status',
    description: 'Returns the status of all configured AI providers and which one is active',
  })
  @ApiResponse({ status: 200, description: 'AI service status', type: AIStatusResponse })
  async getStatus() {
    try {
      const status = await this.aiService.getStatus();
      return { success: true, ...status };
    } catch (error: any) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test')
  @ApiOperation({
    summary: 'Test AI connection',
    description: 'Tests the connection to AI providers by sending a simple prompt',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['openai', 'anthropic', 'auto'], description: 'Provider to test' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Connection test successful' })
  @ApiResponse({ status: 503, description: 'Connection test failed' })
  async testConnection(@Body() body: { provider?: 'openai' | 'anthropic' | 'auto' }) {
    try {
      const startTime = Date.now();
      const result = await this.aiService.generateCompletion(
        'Say "Connection successful" in exactly 2 words.',
        { maxTokens: 10, temperature: 0 },
        body.provider,
      );
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        provider: result.provider,
        latencyMs,
        response: result.content.trim(),
        message: `Successfully connected to ${result.provider}`,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: `Connection test failed: ${error.message}`,
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('test/:provider')
  @ApiOperation({
    summary: 'Test specific AI provider connection',
    description: 'Tests the connection to a specific AI provider',
  })
  @ApiParam({ name: 'provider', enum: ['openai', 'anthropic'], description: 'Provider to test' })
  @ApiResponse({ status: 200, description: 'Connection test successful' })
  @ApiResponse({ status: 503, description: 'Connection test failed' })
  async testSpecificProvider(@Param('provider') provider: 'openai' | 'anthropic') {
    try {
      const startTime = Date.now();
      const result = await this.aiService.generateCompletion(
        'Say "Connection successful" in exactly 2 words.',
        { maxTokens: 10, temperature: 0 },
        provider,
      );
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        provider: result.provider,
        latencyMs,
        response: result.content.trim(),
        message: `Successfully connected to ${result.provider}`,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          provider,
          message: `Connection test failed for ${provider}: ${error.message}`,
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('email/draft')
  @ApiOperation({
    summary: 'Generate email draft',
    description: 'Generate a professional sales email draft using AI with subject line and body',
  })
  @ApiBody({ type: EmailDraftDto })
  @ApiResponse({ status: 200, description: 'Email draft generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 503, description: 'No AI provider available' })
  async generateEmailDraft(@Body() body: EmailDraftDto) {
    try {
      // Debug logging
      console.log('[AI Email Draft] Received body:', JSON.stringify(body, null, 2));

      const { provider: preferredProvider, ...context } = body;

      console.log('[AI Email Draft] Context after destructure:', JSON.stringify(context, null, 2));

      if (!context.recipientName || !context.recipientCompany || !context.purpose) {
        console.log('[AI Email Draft] Validation failed:', {
          recipientName: context.recipientName,
          recipientCompany: context.recipientCompany,
          purpose: context.purpose
        });
        throw new HttpException(
          { success: false, message: 'recipientName, recipientCompany, and purpose are required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.aiService.generateEmailDraft(context, preferredProvider);
      return {
        success: true,
        subject: result.subject,
        body: result.body,
        provider: result.provider,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        error.message.includes('No AI provider')
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('deal/analyze')
  @ApiOperation({
    summary: 'Analyze deal',
    description: 'Get AI-powered insights and recommendations for a sales deal',
  })
  @ApiBody({ type: DealAnalysisDto })
  @ApiResponse({ status: 200, description: 'Deal analysis completed' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 503, description: 'No AI provider available' })
  async analyzeDeal(@Body() body: DealAnalysisDto) {
    try {
      const { provider: preferredProvider, ...deal } = body;

      if (!deal.name || deal.value === undefined || !deal.stage) {
        throw new HttpException(
          { success: false, message: 'name, value, and stage are required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.aiService.analyzeDeal(deal, preferredProvider);
      return {
        success: true,
        data: {
          analysis: result.analysis,
          provider: result.provider,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        error.message.includes('No AI provider')
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('lead/score')
  @ApiOperation({
    summary: 'Score lead',
    description: 'Get an AI-powered lead score (0-100) with detailed reasoning',
  })
  @ApiBody({ type: LeadScoringDto })
  @ApiResponse({ status: 200, description: 'Lead scored successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 503, description: 'No AI provider available' })
  async scoreLead(@Body() body: LeadScoringDto) {
    try {
      const { provider: preferredProvider, ...lead } = body;

      if (!lead.name) {
        throw new HttpException(
          { success: false, message: 'name is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.aiService.scoreLead(lead, preferredProvider);
      return {
        success: true,
        data: {
          ...result.scoring,
          provider: result.provider,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        error.message.includes('No AI provider')
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('meeting/summarize')
  @ApiOperation({
    summary: 'Summarize meeting',
    description: 'Summarize a meeting transcript and extract key points, action items, and next steps',
  })
  @ApiBody({ type: MeetingSummarizeDto })
  @ApiResponse({ status: 200, description: 'Meeting summarized successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 503, description: 'No AI provider available' })
  async summarizeMeeting(@Body() body: MeetingSummarizeDto) {
    try {
      const { transcript, provider: preferredProvider } = body;

      if (!transcript || transcript.trim().length === 0) {
        throw new HttpException(
          { success: false, message: 'transcript is required and cannot be empty' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.aiService.summarizeMeeting(transcript, preferredProvider);
      return {
        success: true,
        data: {
          ...result.summary,
          provider: result.provider,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        error.message.includes('No AI provider')
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('followup/suggest')
  @ApiOperation({
    summary: 'Suggest follow-up',
    description: 'Get AI-powered suggestions for follow-up actions, including email drafts and call scripts',
  })
  @ApiBody({ type: FollowUpDto })
  @ApiResponse({ status: 200, description: 'Follow-up suggestions generated' })
  @ApiResponse({ status: 503, description: 'No AI provider available' })
  async generateFollowUp(@Body() body: FollowUpDto) {
    try {
      const { provider: preferredProvider, ...context } = body;

      const result = await this.aiService.generateFollowUp(context, preferredProvider);
      return {
        success: true,
        data: {
          ...result.followUp,
          provider: result.provider,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        error.message.includes('No AI provider')
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('completion')
  @ApiOperation({
    summary: 'Generate completion',
    description: 'Generate a custom AI completion with your own prompt',
  })
  @ApiBody({ type: CompletionDto })
  @ApiResponse({ status: 200, description: 'Completion generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 503, description: 'No AI provider available' })
  async generateCompletion(@Body() body: CompletionDto) {
    try {
      const { prompt, systemPrompt, maxTokens, temperature, provider: preferredProvider } = body;

      if (!prompt || prompt.trim().length === 0) {
        throw new HttpException(
          { success: false, message: 'prompt is required and cannot be empty' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.aiService.generateCompletion(
        prompt,
        { systemPrompt, maxTokens, temperature },
        preferredProvider,
      );

      return {
        success: true,
        data: {
          content: result.content,
          provider: result.provider,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        error.message.includes('No AI provider')
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
