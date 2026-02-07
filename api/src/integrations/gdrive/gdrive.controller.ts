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
import { GDriveService } from './gdrive.service';

@ApiTags('Integrations - Google Drive')
@Controller('integrations/gdrive')
export class GDriveController {
  constructor(private readonly gdriveService: GDriveService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Drive connection status' })
  async getStatus() {
    return this.gdriveService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Google Drive connection' })
  async testConnection() {
    return this.gdriveService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Google Drive OAuth flow' })
  async connect() {
    const result = await this.gdriveService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Google Drive OAuth callback' })
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
      await this.gdriveService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=gdrive`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Google Drive' })
  async disconnect() {
    await this.gdriveService.disconnect();
    return { success: true, message: 'Google Drive disconnected' };
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List files' })
  async listFiles(
    @Query('folderId') folderId?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    const files = await this.gdriveService.listFiles(folderId, pageToken);
    return { success: true, data: files };
  }

  @Get('files/:fileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get file details' })
  async getFile(@Param('fileId') fileId: string) {
    const file = await this.gdriveService.getFile(fileId);
    return { success: true, data: file };
  }

  @Post('folders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create folder' })
  async createFolder(@Body() body: { name: string; parentId?: string }) {
    const folder = await this.gdriveService.createFolder(body.name, body.parentId);
    return { success: true, data: folder };
  }
}
