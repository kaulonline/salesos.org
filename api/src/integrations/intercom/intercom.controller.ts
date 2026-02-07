import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { IntercomService } from './intercom.service';

@ApiTags('Integrations - Intercom')
@Controller('integrations/intercom')
export class IntercomController {
  constructor(private readonly intercomService: IntercomService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Intercom connection status' })
  async getStatus() {
    return this.intercomService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Intercom connection' })
  async testConnection() {
    return this.intercomService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Intercom OAuth flow' })
  async connect() {
    const result = await this.intercomService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Intercom OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${error}`);
    }

    try {
      await this.intercomService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=intercom`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Intercom' })
  async disconnect() {
    await this.intercomService.disconnect();
    return { success: true, message: 'Intercom disconnected' };
  }

  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Intercom contacts' })
  async getContacts(@Query('page') page?: number) {
    const contacts = await this.intercomService.getContacts(page);
    return { success: true, data: contacts };
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Intercom conversations' })
  async getConversations() {
    const conversations = await this.intercomService.getConversations();
    return { success: true, data: conversations };
  }

  @Get('companies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Intercom companies' })
  async getCompanies() {
    const companies = await this.intercomService.getCompanies();
    return { success: true, data: companies };
  }

  @Post('contacts/:contactId/message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send message to contact' })
  async sendMessage(
    @Param('contactId') contactId: string,
    @Body() body: { message: string },
  ) {
    const result = await this.intercomService.sendMessage(contactId, body.message);
    return { success: true, data: result };
  }
}
