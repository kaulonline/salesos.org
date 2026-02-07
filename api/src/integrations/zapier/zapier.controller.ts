import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { ZapierService } from './zapier.service';

@ApiTags('Integrations - Zapier')
@Controller('integrations/zapier')
export class ZapierController {
  constructor(private readonly zapierService: ZapierService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Zapier connection status' })
  async getStatus() {
    return this.zapierService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Zapier connection' })
  async testConnection() {
    return this.zapierService.testConnection();
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Zapier webhook URL' })
  async configure(@Body() body: { webhookUrl: string }) {
    await this.zapierService.saveWebhook(body.webhookUrl);
    return { success: true, message: 'Zapier configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Zapier' })
  async disconnect() {
    await this.zapierService.disconnect();
    return { success: true, message: 'Zapier disconnected' };
  }

  @Post('trigger')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger Zapier webhook' })
  async triggerWebhook(@Body() body: Record<string, any>) {
    const result = await this.zapierService.triggerWebhook(body);
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
    const result = await this.zapierService.triggerNewLead(body);
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
    const result = await this.zapierService.triggerDealWon(body);
    return { success: true, data: result };
  }

  @Post('trigger/deal-lost')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger deal lost event' })
  async triggerDealLost(@Body() body: {
    id: string;
    name: string;
    value: number;
    lostReason?: string;
  }) {
    const result = await this.zapierService.triggerDealLost(body);
    return { success: true, data: result };
  }
}
