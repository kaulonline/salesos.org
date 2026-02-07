import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { MakeService } from './make.service';

@ApiTags('Integrations - Make')
@Controller('integrations/make')
export class MakeController {
  constructor(private readonly makeService: MakeService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Make connection status' })
  async getStatus() {
    return this.makeService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Make connection' })
  async testConnection() {
    return this.makeService.testConnection();
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Make webhook URL' })
  async configure(@Body() body: { webhookUrl: string }) {
    await this.makeService.saveWebhook(body.webhookUrl);
    return { success: true, message: 'Make configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Make' })
  async disconnect() {
    await this.makeService.disconnect();
    return { success: true, message: 'Make disconnected' };
  }

  @Post('trigger')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger Make webhook' })
  async triggerWebhook(@Body() body: Record<string, any>) {
    const result = await this.makeService.triggerWebhook(body);
    return { success: true, data: result };
  }

  @Post('trigger/lead')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger new lead event' })
  async triggerNewLead(@Body() body: {
    id: string;
    name: string;
    email?: string;
    company?: string;
    source?: string;
  }) {
    const result = await this.makeService.triggerNewLead(body);
    return { success: true, data: result };
  }

  @Post('trigger/deal-won')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger deal won event' })
  async triggerDealWon(@Body() body: {
    id: string;
    name: string;
    value: number;
    accountName?: string;
  }) {
    const result = await this.makeService.triggerDealWon(body);
    return { success: true, data: result };
  }

  @Post('trigger/deal-stage-change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger deal stage change event' })
  async triggerDealStageChange(@Body() body: {
    id: string;
    name: string;
    previousStage: string;
    newStage: string;
  }) {
    const result = await this.makeService.triggerDealStageChange(body);
    return { success: true, data: result };
  }
}
