import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { OpenAIIntegrationService } from './openai.service';

@ApiTags('Integrations - OpenAI')
@Controller('integrations/openai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OpenAIController {
  constructor(private readonly openaiService: OpenAIIntegrationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get OpenAI connection status' })
  async getStatus() {
    return this.openaiService.getStatus();
  }

  @Post('test')
  @ApiOperation({ summary: 'Test OpenAI connection' })
  async testConnection() {
    return this.openaiService.testConnection();
  }

  @Post('configure')
  @ApiOperation({ summary: 'Configure OpenAI with API key' })
  async configure(@Body() body: { apiKey: string }) {
    await this.openaiService.saveApiKey(body.apiKey);
    return { success: true, message: 'OpenAI API key configured' };
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect OpenAI' })
  async disconnect() {
    await this.openaiService.disconnect();
    return { success: true, message: 'OpenAI disconnected' };
  }

  @Post('complete')
  @ApiOperation({ summary: 'Generate completion' })
  async generateCompletion(@Body() body: {
    prompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    const result = await this.openaiService.generateCompletion(body.prompt, {
      model: body.model,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
    });
    return { success: true, result };
  }

  @Post('email-draft')
  @ApiOperation({ summary: 'Generate email draft' })
  async generateEmailDraft(@Body() body: {
    recipientName: string;
    recipientCompany: string;
    purpose: string;
    tone?: string;
    additionalContext?: string;
  }) {
    const result = await this.openaiService.generateEmailDraft(body);
    return { success: true, draft: result };
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize conversation' })
  async summarizeConversation(@Body() body: { messages: string[] }) {
    const result = await this.openaiService.summarizeConversation(body.messages);
    return { success: true, summary: result };
  }

  @Post('analyze-deal')
  @ApiOperation({ summary: 'Analyze deal' })
  async analyzeDeal(@Body() body: {
    dealName: string;
    amount: number;
    stage: string;
    daysInStage: number;
    activities: string[];
    notes: string;
  }) {
    const result = await this.openaiService.analyzeDeal(body);
    return { success: true, analysis: result };
  }
}
