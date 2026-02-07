import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { AnthropicIntegrationService } from './anthropic.service';

@ApiTags('Integrations - Anthropic (Claude AI)')
@Controller('integrations/anthropic')
export class AnthropicController {
  constructor(private readonly anthropicService: AnthropicIntegrationService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Claude AI connection status' })
  async getStatus() {
    return this.anthropicService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Claude AI connection' })
  async testConnection() {
    return this.anthropicService.testConnection();
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Claude AI API key' })
  async configure(@Body() body: { apiKey: string }) {
    await this.anthropicService.saveApiKey(body.apiKey);
    return { success: true, message: 'Claude AI configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Claude AI' })
  async disconnect() {
    await this.anthropicService.disconnect();
    return { success: true, message: 'Claude AI disconnected' };
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate completion' })
  async generateCompletion(@Body() body: {
    prompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }) {
    const result = await this.anthropicService.generateCompletion(body);
    return { success: true, data: result };
  }

  @Post('email/draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate email draft' })
  async generateEmailDraft(@Body() body: {
    context: string;
    recipientInfo: string;
    purpose: string;
  }) {
    const result = await this.anthropicService.generateEmailDraft(body);
    return { success: true, data: result };
  }

  @Post('deal/analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze a deal' })
  async analyzeDeal(@Body() body: {
    name: string;
    value: number;
    stage: string;
    daysInStage: number;
    notes?: string;
    activities?: string[];
  }) {
    const result = await this.anthropicService.analyzeDeal(body);
    return { success: true, data: result };
  }

  @Post('conversation/summarize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Summarize conversation' })
  async summarizeConversation(@Body() body: { transcript: string }) {
    const result = await this.anthropicService.summarizeConversation(body.transcript);
    return { success: true, data: result };
  }

  @Post('proposal/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate proposal' })
  async generateProposal(@Body() body: {
    companyName: string;
    contactName: string;
    products: { name: string; description: string; price: number }[];
    painPoints: string[];
    competitorInfo?: string;
  }) {
    const result = await this.anthropicService.generateProposal(body);
    return { success: true, data: result };
  }
}
