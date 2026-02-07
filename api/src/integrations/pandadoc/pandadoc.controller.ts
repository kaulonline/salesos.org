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
import { PandaDocService } from './pandadoc.service';

@ApiTags('Integrations - PandaDoc')
@Controller('integrations/pandadoc')
export class PandaDocController {
  constructor(private readonly pandadocService: PandaDocService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get PandaDoc connection status' })
  async getStatus() {
    return this.pandadocService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test PandaDoc connection' })
  async testConnection() {
    return this.pandadocService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate PandaDoc OAuth flow' })
  async connect() {
    const result = await this.pandadocService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'PandaDoc OAuth callback' })
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
      await this.pandadocService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=pandadoc`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect PandaDoc' })
  async disconnect() {
    await this.pandadocService.disconnect();
    return { success: true, message: 'PandaDoc disconnected' };
  }

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get PandaDoc documents' })
  async getDocuments(@Query('status') status?: string) {
    const documents = await this.pandadocService.getDocuments(status);
    return { success: true, data: documents };
  }

  @Get('documents/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document details' })
  async getDocumentDetails(@Param('documentId') documentId: string) {
    const document = await this.pandadocService.getDocumentDetails(documentId);
    return { success: true, data: document };
  }

  @Post('documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create document' })
  async createDocument(@Body() body: {
    name: string;
    templateId?: string;
    recipients: { email: string; role: string }[];
    tokens?: { name: string; value: string }[];
  }) {
    const document = await this.pandadocService.createDocument(body);
    return { success: true, data: document };
  }

  @Post('documents/:documentId/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send document for signing' })
  async sendDocument(
    @Param('documentId') documentId: string,
    @Body() body: { message?: string; subject?: string },
  ) {
    const result = await this.pandadocService.sendDocument(documentId, body.message, body.subject);
    return { success: true, data: result };
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document templates' })
  async getTemplates() {
    const templates = await this.pandadocService.getTemplates();
    return { success: true, data: templates };
  }
}
