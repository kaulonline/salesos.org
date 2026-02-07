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
import { DocuSignService } from './docusign.service';

@ApiTags('Integrations - DocuSign')
@Controller('integrations/docusign')
export class DocuSignController {
  constructor(private readonly docusignService: DocuSignService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get DocuSign connection status' })
  async getStatus() {
    return this.docusignService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test DocuSign connection' })
  async testConnection() {
    return this.docusignService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate DocuSign OAuth flow' })
  async connect() {
    const result = await this.docusignService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'DocuSign OAuth callback' })
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
      await this.docusignService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=docusign`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect DocuSign' })
  async disconnect() {
    await this.docusignService.disconnect();
    return { success: true, message: 'DocuSign disconnected' };
  }

  @Get('envelopes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get DocuSign envelopes' })
  async getEnvelopes(@Query('fromDate') fromDate?: string) {
    const result = await this.docusignService.getEnvelopes(
      fromDate ? new Date(fromDate) : undefined,
    );
    return { success: true, ...result };
  }

  @Get('envelopes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get DocuSign envelope status' })
  async getEnvelopeStatus(@Param('id') id: string) {
    const result = await this.docusignService.getEnvelopeStatus(id);
    return { success: true, ...result };
  }

  @Post('envelopes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create DocuSign envelope' })
  async createEnvelope(@Body() body: {
    documentBase64: string;
    documentName: string;
    signerEmail: string;
    signerName: string;
    subject: string;
  }) {
    const result = await this.docusignService.createEnvelope(body);
    return { success: true, ...result };
  }
}
