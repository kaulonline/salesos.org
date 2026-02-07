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
import { Auth0Service } from './auth0.service';

@ApiTags('Integrations - Auth0')
@Controller('integrations/auth0')
export class Auth0Controller {
  constructor(private readonly auth0Service: Auth0Service) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Auth0 connection status' })
  async getStatus() {
    return this.auth0Service.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Auth0 connection' })
  async testConnection() {
    return this.auth0Service.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Auth0 OAuth flow' })
  async connect() {
    const result = await this.auth0Service.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Auth0 OAuth callback' })
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
      await this.auth0Service.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=auth0`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Auth0' })
  async disconnect() {
    await this.auth0Service.disconnect();
    return { success: true, message: 'Auth0 disconnected' };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Auth0 users' })
  async getUsers(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    const users = await this.auth0Service.getUsers(page, perPage);
    return { success: true, data: users };
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Auth0 roles' })
  async getRoles() {
    const roles = await this.auth0Service.getRoles();
    return { success: true, data: roles };
  }

  @Get('users/:userId/roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user roles' })
  async getUserRoles(@Param('userId') userId: string) {
    const roles = await this.auth0Service.getUserRoles(userId);
    return { success: true, data: roles };
  }

  @Get('connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Auth0 connections' })
  async getConnections() {
    const connections = await this.auth0Service.getConnections();
    return { success: true, data: connections };
  }
}
