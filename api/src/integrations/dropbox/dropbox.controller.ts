import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { DropboxService } from './dropbox.service';

@ApiTags('Integrations - Dropbox')
@Controller('integrations/dropbox')
export class DropboxController {
  constructor(private readonly dropboxService: DropboxService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Dropbox connection status' })
  async getStatus() {
    return this.dropboxService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Dropbox connection' })
  async testConnection() {
    return this.dropboxService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Dropbox OAuth flow' })
  async connect() {
    const result = await this.dropboxService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Dropbox OAuth callback' })
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
      await this.dropboxService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=dropbox`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Dropbox' })
  async disconnect() {
    await this.dropboxService.disconnect();
    return { success: true, message: 'Dropbox disconnected' };
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List folder contents' })
  async listFolder(@Query('path') path?: string) {
    const files = await this.dropboxService.listFolder(path);
    return { success: true, data: files };
  }

  @Post('share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shared link for file' })
  async getSharedLink(@Body() body: { path: string }) {
    const link = await this.dropboxService.getSharedLink(body.path);
    return { success: true, data: link };
  }
}
