import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { OktaService } from './okta.service';

@ApiTags('Integrations - Okta')
@Controller('integrations/okta')
export class OktaController {
  constructor(private readonly oktaService: OktaService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Okta connection status' })
  async getStatus() {
    return this.oktaService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Okta connection' })
  async testConnection() {
    return this.oktaService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Okta OAuth flow' })
  async connect() {
    const result = await this.oktaService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Okta OAuth callback' })
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
      await this.oktaService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=okta`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Okta' })
  async disconnect() {
    await this.oktaService.disconnect();
    return { success: true, message: 'Okta disconnected' };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Okta users' })
  async getUsers(@Query('limit') limit?: number) {
    const users = await this.oktaService.getUsers(limit);
    return { success: true, data: users };
  }

  @Get('groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Okta groups' })
  async getGroups() {
    const groups = await this.oktaService.getGroups();
    return { success: true, data: groups };
  }

  @Get('users/:userId/groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user groups' })
  async getUserGroups(@Param('userId') userId: string) {
    const groups = await this.oktaService.getUserGroups(userId);
    return { success: true, data: groups };
  }
}
