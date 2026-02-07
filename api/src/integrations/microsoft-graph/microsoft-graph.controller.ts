import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { MicrosoftGraphService } from './microsoft-graph.service';
import {
  GetAvailabilityDto,
  CreateEventDto,
  SendEmailDto,
  GetEventsDto,
  GetEmailsDto,
} from './dto';

@ApiTags('Integrations - Microsoft 365')
@ApiBearerAuth()
@Controller('integrations/microsoft365')
@UseGuards(JwtAuthGuard)
export class MicrosoftGraphController {
  constructor(private readonly microsoftGraphService: MicrosoftGraphService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Microsoft 365 connection status' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  async getStatus() {
    const isConnected = await this.microsoftGraphService.isConnected();
    return { connected: isConnected };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test Microsoft 365 connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection() {
    return this.microsoftGraphService.testConnection();
  }

  @Get('oauth/url')
  @ApiOperation({ summary: 'Get OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'OAuth URL for user consent' })
  async getOAuthUrl(
    @Request() req,
    @Query('redirectUri') redirectUri: string,
  ) {
    const url = await this.microsoftGraphService.getOAuthUrl(req.user.userId, redirectUri);
    return { url };
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth callback processed' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('redirectUri') redirectUri: string,
  ) {
    return this.microsoftGraphService.handleOAuthCallback(code, state, redirectUri);
  }

  @Post('calendar/availability')
  @ApiOperation({ summary: 'Get calendar availability' })
  @ApiResponse({ status: 200, description: 'Available time slots' })
  async getAvailability(@Request() req, @Body() dto: GetAvailabilityDto) {
    return this.microsoftGraphService.getAvailability(req.user.userId, dto);
  }

  @Post('calendar/events')
  @ApiOperation({ summary: 'Create a calendar event' })
  @ApiResponse({ status: 201, description: 'Event created' })
  async createEvent(@Request() req, @Body() dto: CreateEventDto) {
    return this.microsoftGraphService.createEvent(req.user.userId, dto);
  }

  @Get('calendar/events')
  @ApiOperation({ summary: 'Get calendar events' })
  @ApiResponse({ status: 200, description: 'Calendar events' })
  async getEvents(@Request() req, @Query() dto: GetEventsDto) {
    return this.microsoftGraphService.getEvents(req.user.userId, dto);
  }

  @Post('mail/send')
  @ApiOperation({ summary: 'Send an email' })
  @ApiResponse({ status: 200, description: 'Email sent or drafted' })
  async sendEmail(@Request() req, @Body() dto: SendEmailDto) {
    return this.microsoftGraphService.sendEmail(req.user.userId, dto);
  }

  @Get('mail/messages')
  @ApiOperation({ summary: 'Get emails from mailbox' })
  @ApiResponse({ status: 200, description: 'Email messages' })
  async getEmails(@Request() req, @Query() dto: GetEmailsDto) {
    return this.microsoftGraphService.getEmails(req.user.userId, dto);
  }

  @Get('calls/recordings')
  @ApiOperation({ summary: 'Get Teams call recordings' })
  @ApiResponse({ status: 200, description: 'Call recordings' })
  async getCallRecordings(
    @Request() req,
    @Query('meetingId') meetingId?: string,
  ) {
    return this.microsoftGraphService.getCallRecordings(req.user.userId, meetingId);
  }
}
