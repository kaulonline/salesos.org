import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MeetingsService, MeetingSession } from './meetings.service';
import { MeetingAnalyzerService } from './services/meeting-analyzer.service';
import { MeetingBotOrchestrator } from './services/meeting-bot-orchestrator.service';
import { ZoomBotService } from './services/zoom-bot.service';
import { ZoomService } from './services/zoom.service';
import { MeetingHealthService } from './services/meeting-health.service';
import { MeetingUrlParserService } from './services/meeting-url-parser.service';
import { AttendeeService } from './attendee.service';
import { MeetingRealtimeService } from './services/meeting-realtime.service';
import { MeetingPrepService, MeetingIntelligence } from './services/meeting-prep.service';
import { MeetingAutoSummaryService, MeetingSummary } from './services/meeting-auto-summary.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RequireFeature, LicenseFeatures } from '../licensing';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  ScheduleMeetingDto,
  UploadTranscriptDto,
  SearchMeetingsDto,
  JoinAdHocMeetingDto,
  GenerateSummaryDto,
  ApproveActionsDto,
} from './dto';

@ApiTags('Meetings')
@ApiBearerAuth('JWT')
@Controller('meetings')
export class MeetingsController {
  private readonly logger = new Logger(MeetingsController.name);

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly analyzerService: MeetingAnalyzerService,
    private readonly botOrchestrator: MeetingBotOrchestrator,
    private readonly zoomBotService: ZoomBotService,
    private readonly zoomService: ZoomService,
    private readonly healthService: MeetingHealthService,
    private readonly urlParser: MeetingUrlParserService,
    private readonly configService: ConfigService,
    private readonly attendeeService: AttendeeService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
    private readonly meetingPrepService: MeetingPrepService,
    private readonly meetingAutoSummaryService: MeetingAutoSummaryService,
  ) {}

  /**
   * Schedule a meeting for recording
   * POST /meetings/schedule
   */
  @Post('schedule')
  @UseGuards(JwtAuthGuard)
  @RequireFeature(LicenseFeatures.MEETINGS_RECORD)
  async scheduleMeeting(@Body() dto: ScheduleMeetingDto, @Req() req: Request): Promise<MeetingSession> {
    this.logger.log(`Scheduling meeting: ${dto.title} on ${dto.platform}`);
    return this.meetingsService.scheduleMeeting(dto, (req as any).user.userId);
  }

  /**
   * Join an ad-hoc meeting by URL
   * This allows IRIS Agent to join any meeting immediately given just the URL
   * POST /meetings/join-adhoc
   */
  @Post('join-adhoc')
  @UseGuards(JwtAuthGuard)
  @RequireFeature(LicenseFeatures.MEETINGS_RECORD)
  async joinAdHocMeeting(@Body() dto: JoinAdHocMeetingDto, @Req() req: Request): Promise<{
    success: boolean;
    meetingSession: MeetingSession;
    botId?: string;
    message: string;
  }> {
    this.logger.log(`Ad-hoc join request for URL: ${dto.meetingUrl}`);
    const userId = (req as any).user.userId;
    
    try {
      // Parse the meeting URL
      const parsed = this.urlParser.parse(dto.meetingUrl);
      if (!parsed) {
        return {
          success: false,
          meetingSession: null as any,
          message: 'Invalid or unsupported meeting URL. Supported platforms: Zoom, Teams, Google Meet, Webex',
        };
      }

      this.logger.log(`Parsed meeting: platform=${parsed.platform}, id=${parsed.meetingId}`);
      
      // Create a meeting session for this ad-hoc meeting
      const meetingSession = await this.meetingsService.createAdHocMeeting({
        title: dto.title || `Ad-hoc ${parsed.platform} Meeting`,
        platform: parsed.platform,
        meetingUrl: parsed.joinUrl,
        externalMeetingId: parsed.meetingId,
        password: dto.password || parsed.password,
        opportunityId: dto.opportunityId,
        accountId: dto.accountId,
        leadId: dto.leadId,
      }, userId);

      // Trigger the bot to join immediately
      try {
        const botResult = await this.botOrchestrator.triggerBotJoin(meetingSession.id, {
          botName: dto.botName || 'IRIS Agent',
          meetingPassword: dto.password || parsed.password,
        });
        
        return {
          success: true,
          meetingSession,
          botId: botResult.botId,
          message: `IRIS Agent is joining the ${parsed.platform} meeting`,
        };
      } catch (botError) {
        this.logger.error(`Failed to trigger bot join: ${botError}`);
        return {
          success: true, // Meeting was created, just bot failed
          meetingSession,
          message: `Meeting created but bot failed to join: ${botError instanceof Error ? botError.message : 'Unknown error'}. Bot integration may not be configured.`,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to create ad-hoc meeting: ${error}`);
      return {
        success: false,
        meetingSession: null as any,
        message: `Failed to create meeting session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate a meeting URL without joining
   * POST /meetings/validate-url
   */
  @Post('validate-url')
  @UseGuards(JwtAuthGuard)
  async validateMeetingUrl(@Body() body: { url: string }): Promise<{
    valid: boolean;
    platform?: string;
    meetingId?: string;
    message: string;
  }> {
    const parsed = this.urlParser.parse(body.url);
    
    if (!parsed) {
      return {
        valid: false,
        message: 'Invalid or unsupported meeting URL',
      };
    }

    return {
      valid: true,
      platform: parsed.platform,
      meetingId: parsed.meetingId,
      message: `Valid ${parsed.platform} meeting URL detected`,
    };
  }

  /**
   * Create a meeting session manually
   * POST /meetings
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createMeeting(@Body() dto: CreateMeetingDto, @Req() req: Request): Promise<MeetingSession> {
    this.logger.log(`Creating meeting: ${dto.title}`);
    return this.meetingsService.createMeeting(dto, (req as any).user.userId);
  }

  /**
   * Get all meetings for the current user
   * GET /meetings
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getMeetings(@Query() query: SearchMeetingsDto, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getMeetings(query, (req as any).user.userId, isAdmin);
  }

  // ==================== WEBHOOK ENDPOINTS ====================
  // These must come BEFORE /:id routes to prevent route matching issues

  /**
   * Webhook endpoint for meeting bot service
   * POST /meetings/webhook/transcript
   */
  @Post('webhook/transcript')
  async handleTranscriptWebhook(@Body() payload: any) {
    this.logger.log(`Received transcript webhook for meeting: ${payload.meetingSessionId}`);
    return this.meetingsService.handleTranscriptWebhook(payload);
  }

  /**
   * Webhook endpoint for meeting status updates
   * POST /meetings/webhook/status
   */
  @Post('webhook/status')
  async handleStatusWebhook(@Body() payload: any) {
    this.logger.log(`Received status webhook: ${JSON.stringify(payload)}`);
    return this.meetingsService.handleStatusWebhook(payload);
  }

  /**
   * Zoom Webhook Health Check / GET Handler
   * GET /meetings/webhook/zoom
   * 
   * Some webhook validators (including Zoom) may send GET requests to verify
   * the endpoint is reachable before sending the actual POST validation.
   * Returns 200 OK to confirm the endpoint is active.
   */
  @Get('webhook/zoom')
  @HttpCode(HttpStatus.OK)
  getZoomWebhookHealth() {
    this.logger.log('Zoom webhook endpoint health check (GET)');
    return { 
      status: 'active',
      endpoint: '/api/meetings/webhook/zoom',
      method: 'POST',
      message: 'Zoom webhook endpoint is ready to receive events'
    };
  }

  /**
   * Zoom Webhook Endpoint
   * POST /meetings/webhook/zoom
   * 
   * Handles Zoom's challenge-response URL validation and event notifications.
   * Configure this URL in Zoom App Marketplace: https://engage.iriseller.com/api/meetings/webhook/zoom
   * 
   * Supported Events:
   * - endpoint.url_validation (challenge-response for URL verification)
   * - meeting.started
   * - meeting.ended
   * - recording.completed
   * - recording.transcript_completed
   * - meeting.participant_joined
   * - meeting.participant_left
   */
  @Post('webhook/zoom')
  @HttpCode(HttpStatus.OK) // Zoom requires 200 OK response
  async handleZoomWebhook(
    @Body() payload: any,
    @Headers('x-zm-signature') signature: string,
    @Headers('x-zm-request-timestamp') timestamp: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Received Zoom webhook event: ${payload.event}`);

    // Handle Zoom URL Validation (Challenge-Response Check)
    // This is required for initial webhook setup in Zoom App Marketplace
    if (payload.event === 'endpoint.url_validation') {
      const plainToken = payload.payload?.plainToken;
      if (!plainToken) {
        this.logger.error('URL validation request missing plainToken');
        return { error: 'Missing plainToken' };
      }

      const webhookSecret = this.configService.get<string>('ZOOM_WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.error('ZOOM_WEBHOOK_SECRET not configured');
        return { error: 'Webhook secret not configured' };
      }

      // Generate the encryptedToken using HMAC-SHA256
      const encryptedToken = crypto
        .createHmac('sha256', webhookSecret)
        .update(plainToken)
        .digest('hex');

      this.logger.log('Responding to Zoom URL validation challenge');
      return {
        plainToken,
        encryptedToken,
      };
    }

    // For all other events, verify the webhook signature
    if (signature && timestamp) {
      const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
      const isValid = this.zoomService.verifyWebhookSignature(rawBody, signature, timestamp);
      
      if (!isValid) {
        this.logger.warn('Invalid Zoom webhook signature');
        return { error: 'Invalid signature', status: 'rejected' };
      }
    }

    // Process the webhook event
    try {
      const result = await this.zoomService.handleWebhook(payload);
      
      // Log successful processing
      this.logger.log(`Processed Zoom webhook: ${result.event} for meeting ${result.meetingId || 'N/A'}`);
      
      // For recording completed events, trigger automatic processing
      if (result.event === 'recording_ready' && result.meetingId) {
        this.logger.log(`Recording ready for meeting ${result.meetingId}, triggering processing...`);
        await this.meetingsService.handleRecordingReady(result.meetingId, result.data);
      }

      // For meeting deleted events, trigger cascade deletion
      if (result.event === 'meeting_deleted' && result.meetingId) {
        this.logger.log(`Meeting deleted in Zoom: ${result.meetingId}, triggering cascade deletion...`);
        await this.meetingsService.handleMeetingDeleted(result.meetingId, 'zoom');
      }

      return { 
        status: 'received',
        event: result.event,
        meetingId: result.meetingId,
      };
    } catch (error) {
      this.logger.error(`Error processing Zoom webhook: ${error.message}`, error.stack);
      return { 
        status: 'error',
        message: error.message,
      };
    }
  }

  /**
   * Search across all meeting transcripts
   * POST /meetings/search
   */
  @Post('search')
  @UseGuards(JwtAuthGuard)
  async searchMeetings(@Body() dto: { query: string; filters?: SearchMeetingsDto }, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.searchTranscripts(dto.query, (req as any).user.userId, dto.filters, isAdmin);
  }

  /**
   * Get meetings for an opportunity
   * GET /meetings/opportunity/:opportunityId
   */
  @Get('opportunity/:opportunityId')
  @UseGuards(JwtAuthGuard)
  async getMeetingsForOpportunity(@Param('opportunityId') opportunityId: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getMeetingsForOpportunity(opportunityId, (req as any).user.userId, isAdmin);
  }

  /**
   * Get meetings for an account
   * GET /meetings/account/:accountId
   */
  @Get('account/:accountId')
  @UseGuards(JwtAuthGuard)
  async getMeetingsForAccount(@Param('accountId') accountId: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getMeetingsForAccount(accountId, (req as any).user.userId, isAdmin);
  }

  // ==================== ATTENDEE BOT ENDPOINTS ====================
  // Open-source meeting bot service for Zoom, Google Meet, Microsoft Teams

  /**
   * Check if Attendee bot service is available
   * GET /meetings/attendee/status
   */
  @Get('attendee/status')
  @UseGuards(JwtAuthGuard)
  async getAttendeeStatus() {
    return {
      available: this.attendeeService.isAvailable(),
      message: this.attendeeService.isAvailable()
        ? 'Attendee meeting bot service is configured and available'
        : 'Attendee service not configured. Set ATTENDEE_API_KEY and ATTENDEE_URL environment variables.',
    };
  }

  /**
   * Send a bot to join a meeting using Attendee
   * POST /meetings/attendee/join
   * 
   * Supports: Zoom, Google Meet, Microsoft Teams
   */
  @Post('attendee/join')
  @UseGuards(JwtAuthGuard)
  async joinMeetingWithAttendee(@Body() body: {
    meeting_url: string;
    bot_name?: string;
    metadata?: Record<string, unknown>;
    recording_type?: 'audio_only' | 'audio_and_video';
  }) {
    if (!this.attendeeService.isAvailable()) {
      return {
        success: false,
        error: 'Attendee service not configured',
      };
    }

    try {
      const bot = await this.attendeeService.createBot({
        meeting_url: body.meeting_url,
        bot_name: body.bot_name || 'IRIS Meeting Bot',
        metadata: body.metadata,
        zoom_settings: body.meeting_url.includes('zoom.us') ? { sdk: 'web' } : undefined,
        recording_settings: body.recording_type ? { recording_type: body.recording_type } : undefined,
      });

      return {
        success: true,
        bot_id: bot.id,
        state: bot.state,
        message: `Bot is ${bot.state} the meeting`,
      };
    } catch (error) {
      this.logger.error(`Failed to create Attendee bot: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get bot status by ID
   * GET /meetings/attendee/bot/:botId
   */
  @Get('attendee/bot/:botId')
  @UseGuards(JwtAuthGuard)
  async getAttendeeBotStatus(@Param('botId') botId: string) {
    if (!this.attendeeService.isAvailable()) {
      return { error: 'Attendee service not configured' };
    }

    try {
      const bot = await this.attendeeService.getBot(botId);
      return bot;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get transcript from a bot
   * GET /meetings/attendee/bot/:botId/transcript
   */
  @Get('attendee/bot/:botId/transcript')
  @UseGuards(JwtAuthGuard)
  async getAttendeeBotTranscript(@Param('botId') botId: string) {
    if (!this.attendeeService.isAvailable()) {
      return { error: 'Attendee service not configured' };
    }

    try {
      const transcript = await this.attendeeService.getTranscript(botId);
      return { transcript };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get recording URL from a bot
   * GET /meetings/attendee/bot/:botId/recording
   */
  @Get('attendee/bot/:botId/recording')
  @UseGuards(JwtAuthGuard)
  async getAttendeeBotRecording(@Param('botId') botId: string) {
    if (!this.attendeeService.isAvailable()) {
      return { error: 'Attendee service not configured' };
    }

    try {
      const recording = await this.attendeeService.getRecording(botId);
      return recording;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Make bot leave the meeting
   * POST /meetings/attendee/bot/:botId/leave
   */
  @Post('attendee/bot/:botId/leave')
  @UseGuards(JwtAuthGuard)
  async leaveAttendeeBotMeeting(@Param('botId') botId: string) {
    if (!this.attendeeService.isAvailable()) {
      return { error: 'Attendee service not configured' };
    }

    try {
      const bot = await this.attendeeService.leaveBot(botId);
      return { success: true, state: bot.state };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List all bots
   * GET /meetings/attendee/bots
   */
  @Get('attendee/bots')
  @UseGuards(JwtAuthGuard)
  async listAttendeeBots() {
    if (!this.attendeeService.isAvailable()) {
      return { error: 'Attendee service not configured' };
    }

    try {
      const result = await this.attendeeService.listBots();
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  // ==================== HEALTH & MONITORING ENDPOINTS ====================
  // These must come BEFORE /:id routes

  /**
   * Get comprehensive health status
   * GET /meetings/health
   */
  @Get('health')
  @UseGuards(JwtAuthGuard)
  async getHealthStatus() {
    return this.healthService.getHealthStatus();
  }

  /**
   * Get detailed bot status for monitoring dashboard
   * GET /meetings/health/bots
   */
  @Get('health/bots')
  @UseGuards(JwtAuthGuard)
  async getBotDetailedStatus() {
    return this.healthService.getBotDetailedStatus();
  }

  /**
   * Get transcription statistics
   * GET /meetings/health/transcriptions
   */
  @Get('health/transcriptions')
  @UseGuards(JwtAuthGuard)
  async getTranscriptionStats() {
    return this.healthService.getTranscriptionStats();
  }

  /**
   * Simple liveness check
   * GET /meetings/health/live
   */
  @Get('health/live')
  async getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness check (checks dependencies)
   * GET /meetings/health/ready
   */
  @Get('health/ready')
  async getReadiness() {
    const health = await this.healthService.getHealthStatus();
    const isReady = health.status !== 'unhealthy';
    return { 
      ready: isReady, 
      status: health.status,
      checks: health.checks.map(c => ({ name: c.name, status: c.status })),
    };
  }

  // ==================== WEBRTC REAL-TIME TRANSCRIPTION ENDPOINTS ====================
  // Azure OpenAI Realtime API integration for instant transcription

  /**
   * Check if WebRTC realtime transcription is configured
   * GET /meetings/realtime/status
   */
  @Get('realtime/status')
  @UseGuards(JwtAuthGuard)
  async getRealtimeStatus() {
    return {
      configured: this.meetingRealtimeService.isConfigured(),
      message: this.meetingRealtimeService.isConfigured()
        ? 'WebRTC realtime transcription is configured and available'
        : 'WebRTC realtime transcription not configured. Set AZURE_OPENAI_REALTIME_ENDPOINT and AZURE_OPENAI_REALTIME_API_KEY.',
    };
  }

  /**
   * Get WebRTC configuration for client setup
   * GET /meetings/realtime/config
   */
  @Get('realtime/config')
  @UseGuards(JwtAuthGuard)
  async getRealtimeConfig() {
    return this.meetingRealtimeService.getWebRTCConfig();
  }

  /**
   * Get ephemeral token for WebRTC transcription session
   * POST /meetings/:id/realtime/token
   */
  @Post(':id/realtime/token')
  @UseGuards(JwtAuthGuard)
  @RequireFeature(LicenseFeatures.MEETINGS_RECORD)
  async getRealtimeToken(@Param('id') id: string, @Req() req: Request) {
    if (!this.meetingRealtimeService.isConfigured()) {
      throw new HttpException(
        'WebRTC realtime transcription not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Verify meeting exists and user has access
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    const meeting = await this.meetingsService.getMeetingById(id, (req as any).user.userId, isAdmin);
    if (!meeting) {
      throw new HttpException('Meeting not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`Getting WebRTC transcription token for meeting: ${id}`);

    return this.meetingRealtimeService.getTranscriptionToken({
      meetingSessionId: id,
      userId: (req as any).user.userId,
    });
  }

  /**
   * Exchange SDP for WebRTC connection
   * POST /meetings/:id/realtime/sdp
   */
  @Post(':id/realtime/sdp')
  @UseGuards(JwtAuthGuard)
  @RequireFeature(LicenseFeatures.MEETINGS_RECORD)
  async exchangeRealtimeSdp(
    @Param('id') id: string,
    @Body() body: { token: string; sdpOffer: string },
    @Req() req: Request,
  ) {
    if (!this.meetingRealtimeService.isConfigured()) {
      throw new HttpException(
        'WebRTC realtime transcription not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Verify meeting exists and user has access
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    const meeting = await this.meetingsService.getMeetingById(id, (req as any).user.userId, isAdmin);
    if (!meeting) {
      throw new HttpException('Meeting not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`Exchanging SDP for meeting: ${id}`);

    return this.meetingRealtimeService.exchangeSDP(body.token, body.sdpOffer);
  }

  /**
   * Receive transcript segment from WebRTC data channel
   * POST /meetings/:id/realtime/transcript
   *
   * This is called by the client when it receives transcription from the WebRTC data channel
   */
  @Post(':id/realtime/transcript')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async receiveRealtimeTranscript(
    @Param('id') id: string,
    @Body() body: {
      text: string;
      speakerName?: string;
      startTime: number;
      endTime: number;
      confidence?: number;
      isFinal?: boolean;
    },
  ) {
    await this.meetingRealtimeService.processTranscriptSegment(id, body);
    return { success: true };
  }

  /**
   * End WebRTC transcription session and compile transcript
   * POST /meetings/:id/realtime/end
   */
  @Post(':id/realtime/end')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async endRealtimeSession(@Param('id') id: string, @Req() req: Request) {
    // Verify meeting exists and user has access
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    const meeting = await this.meetingsService.getMeetingById(id, (req as any).user.userId, isAdmin);
    if (!meeting) {
      throw new HttpException('Meeting not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`Ending WebRTC transcription session for meeting: ${id}`);

    await this.meetingRealtimeService.endRealtimeSession(id);
    return { success: true, message: 'Realtime session ended, transcript compiled' };
  }

  // ==================== MEETING INTELLIGENCE / PREP ====================

  /**
   * Generate AI-powered meeting intelligence/preparation briefing
   * GET /meetings/prep
   *
   * Query params:
   * - meetingId: ID of the meeting session
   * - accountId: ID of the account
   * - leadId: ID of the lead
   * - opportunityId: ID of the opportunity
   *
   * Returns comprehensive meeting prep including:
   * - Executive summary
   * - Account/lead overview
   * - Key contacts
   * - Active opportunities
   * - Recent interactions
   * - Past meeting insights
   * - Company news
   * - Suggested agenda
   * - Talking points
   * - Potential objections
   * - Questions to ask
   * - Deal risks
   * - Recommended approach
   */
  @Get('prep')
  @UseGuards(JwtAuthGuard)
  async getMeetingPrep(
    @Query('meetingId') meetingId: string,
    @Query('accountId') accountId: string,
    @Query('leadId') leadId: string,
    @Query('opportunityId') opportunityId: string,
    @Query('contactId') contactId: string,
    @Req() req: Request,
  ): Promise<MeetingIntelligence> {
    this.logger.log(`Generating meeting prep for user ${(req as any).user.userId}`);

    // At least one identifier is required
    if (!meetingId && !accountId && !leadId && !opportunityId && !contactId) {
      throw new HttpException(
        'At least one of meetingId, accountId, leadId, opportunityId, or contactId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.meetingPrepService.generateMeetingPrep(
      { meetingId, accountId, leadId, opportunityId, contactId },
      (req as any).user.userId,
    );
  }

  /**
   * Generate meeting prep for a specific meeting
   * GET /meetings/:id/prep
   */
  @Get(':id/prep')
  @UseGuards(JwtAuthGuard)
  async getMeetingPrepById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<MeetingIntelligence> {
    this.logger.log(`Generating meeting prep for meeting ${id}`);

    // Verify the user has access to this meeting
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    const meeting = await this.meetingsService.getMeetingById(id, (req as any).user.userId, isAdmin);
    if (!meeting) {
      throw new HttpException('Meeting not found', HttpStatus.NOT_FOUND);
    }

    return this.meetingPrepService.generateMeetingPrep(
      { meetingId: id },
      (req as any).user.userId,
    );
  }

  // ==================== PARAMETERIZED ROUTES ====================
  // These must come AFTER specific path routes

  /**
   * Get a specific meeting by ID
   * GET /meetings/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMeeting(@Param('id') id: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getMeetingById(id, (req as any).user.userId, isAdmin);
  }

  /**
   * Get meeting transcript
   * GET /meetings/:id/transcript
   */
  @Get(':id/transcript')
  @UseGuards(JwtAuthGuard)
  async getTranscript(@Param('id') id: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getTranscript(id, (req as any).user.userId, isAdmin);
  }

  /**
   * Get meeting analysis
   * GET /meetings/:id/analysis
   * Returns empty object {} if no analysis exists (to avoid JSON parse errors)
   */
  @Get(':id/analysis')
  @UseGuards(JwtAuthGuard)
  async getAnalysis(@Param('id') id: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    const analysis = await this.meetingsService.getAnalysis(id, (req as any).user.userId, isAdmin);
    // Return empty object if no analysis exists to prevent JSON parse errors
    return analysis || {};
  }

  /**
   * Get audit logs for a meeting
   * GET /meetings/:id/audit-logs
   */
  @Get(':id/audit-logs')
  @UseGuards(JwtAuthGuard)
  async getAuditLogs(
    @Param('id') id: string,
    @Query('action') action: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: Request,
  ) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getAuditLogs(
      id,
      (req as any).user.userId,
      isAdmin,
      {
        action,
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );
  }

  /**
   * Upload a transcript manually (for testing or manual uploads)
   * POST /meetings/:id/transcript
   */
  @Post(':id/transcript')
  @UseGuards(JwtAuthGuard)
  async uploadTranscript(
    @Param('id') id: string,
    @Body() dto: UploadTranscriptDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Uploading transcript for meeting: ${id}`);
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.uploadTranscript(id, dto, (req as any).user.userId, isAdmin);
  }

  /**
   * Trigger AI analysis of a meeting
   * POST /meetings/:id/analyze
   */
  @Post(':id/analyze')
  @UseGuards(JwtAuthGuard)
  async analyzeMeeting(@Param('id') id: string, @Req() req: Request) {
    this.logger.log(`Analyzing meeting: ${id}`);
    // Verify ownership first (or admin access)
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    await this.meetingsService.getMeetingById(id, (req as any).user.userId, isAdmin);
    return this.analyzerService.analyzeMeeting(id);
  }

  // ==================== POST-MEETING AUTO-SUMMARY ENDPOINTS ====================

  /**
   * Generate comprehensive meeting summary with action items
   * POST /meetings/:id/generate-summary
   *
   * This is the main endpoint for Phase 2 Post-Meeting Auto-Summary.
   * It generates:
   * - Executive summary (2-3 sentences)
   * - Key discussion points with timestamps
   * - Decisions made
   * - Action items with owners and due dates
   * - Follow-up topics for next meeting
   */
  @Post(':id/generate-summary')
  @UseGuards(JwtAuthGuard)
  async generateSummary(
    @Param('id') id: string,
    @Body() dto: GenerateSummaryDto,
    @Req() req: Request,
  ): Promise<MeetingSummary> {
    this.logger.log(`Generating summary for meeting: ${id}`);
    return this.meetingAutoSummaryService.generateSummary(
      id,
      (req as any).user.userId,
      dto,
    );
  }

  /**
   * Get meeting summary
   * GET /meetings/:id/summary
   *
   * Returns the previously generated summary for a meeting,
   * or null if no summary has been generated yet.
   */
  @Get(':id/summary')
  @UseGuards(JwtAuthGuard)
  async getSummary(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<MeetingSummary | { exists: false }> {
    const summary = await this.meetingAutoSummaryService.getSummary(
      id,
      (req as any).user.userId,
    );
    return summary || { exists: false } as any;
  }

  /**
   * Approve and create action items from meeting summary
   * POST /meetings/:id/approve-actions
   *
   * Allows selective approval of extracted action items.
   * Creates Tasks and/or CoachingActionItems based on options.
   */
  @Post(':id/approve-actions')
  @UseGuards(JwtAuthGuard)
  async approveActions(
    @Param('id') id: string,
    @Body() dto: ApproveActionsDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Approving actions for meeting: ${id}`);
    return this.meetingAutoSummaryService.approveAndCreateActions(
      id,
      (req as any).user.userId,
      dto,
    );
  }

  /**
   * Re-sync transcript from Attendee and re-analyze
   * POST /meetings/:id/resync
   */
  @Post(':id/resync')
  @UseGuards(JwtAuthGuard)
  async resyncMeeting(@Param('id') id: string, @Req() req: Request) {
    this.logger.log(`Re-syncing meeting: ${id}`);
    
    // Get the meeting to find the Attendee bot ID (also verifies ownership or admin access)
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    const meeting = await this.meetingsService.getMeetingById(id, (req as any).user.userId, isAdmin);
    if (!meeting) {
      throw new HttpException('Meeting not found', HttpStatus.NOT_FOUND);
    }

    const attendeeBotId = (meeting.metadata as any)?.attendeeBotId;
    if (!attendeeBotId) {
      throw new HttpException('No Attendee bot associated with this meeting', HttpStatus.BAD_REQUEST);
    }

    // Force sync transcript from Attendee
    const syncResult = await this.botOrchestrator.forceSyncTranscript(id, attendeeBotId);
    
    if (!syncResult.success) {
      throw new HttpException(syncResult.error || 'Failed to sync transcript', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Re-analyze with fresh transcript
    const analysis = await this.analyzerService.analyzeMeeting(id);

    return {
      success: true,
      segmentsSynced: syncResult.segmentCount,
      analysis,
    };
  }

  /**
   * Get action items from a meeting
   * GET /meetings/:id/action-items
   */
  @Get(':id/action-items')
  @UseGuards(JwtAuthGuard)
  async getActionItems(@Param('id') id: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getActionItems(id, (req as any).user.userId, isAdmin);
  }

  /**
   * Get insights from a meeting
   * GET /meetings/:id/insights
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/insights')
  async getInsights(@Param('id') id: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.getInsights(id, (req as any).user.userId, isAdmin);
  }

  /**
   * Update meeting status
   * PUT /meetings/:id
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateMeeting(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @Req() req: Request,
  ) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    return this.meetingsService.updateMeeting(id, dto, (req as any).user.userId, isAdmin);
  }

  /**
   * Delete a meeting
   * DELETE /meetings/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMeeting(@Param('id') id: string, @Req() req: Request) {
    const isAdmin = (req as any).user.role?.toUpperCase() === 'ADMIN';
    await this.meetingsService.deleteMeeting(id, (req as any).user.userId, isAdmin);
  }

  // ==================== BOT MANAGEMENT ENDPOINTS ====================

  /**
   * Manually trigger bot to join a meeting
   * POST /meetings/:id/bot/join
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/bot/join')
  async joinMeetingWithBot(@Param('id') id: string) {
    this.logger.log(`Triggering bot join for meeting: ${id}`);
    return this.botOrchestrator.triggerBotJoin(id);
  }

  /**
   * Manually trigger bot to leave a meeting
   * POST /meetings/:id/bot/leave
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/bot/leave')
  async leaveMeetingWithBot(@Param('id') id: string) {
    this.logger.log(`Triggering bot leave for meeting: ${id}`);
    return this.botOrchestrator.triggerBotLeave(id);
  }

  /**
   * Get bot status for a meeting
   * GET /meetings/:id/bot/status
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/bot/status')
  async getBotStatus(@Param('id') id: string) {
    return this.botOrchestrator.getBotStatus(id);
  }

  /**
   * Get live transcript for an active meeting
   * GET /meetings/:id/bot/transcript
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/bot/transcript')
  async getLiveTranscript(@Param('id') id: string) {
    const segments = await this.botOrchestrator.getLiveTranscript(id);
    return { segments };
  }

  /**
   * Get all active bots
   * GET /meetings/bots/active
   */
  @UseGuards(JwtAuthGuard)
  @Get('bots/active')
  async getActiveBots() {
    return this.zoomBotService.getActiveBots().map(bot => ({
      botId: bot.id,
      meetingSessionId: bot.meetingSessionId,
      meetingNumber: bot.meetingNumber,
      status: bot.status,
      startTime: bot.startTime,
      transcriptLength: bot.transcriptSegments.length,
    }));
  }

  /**
   * Check if Zoom SDK bot is configured
   * GET /meetings/bots/configured
   */
  @UseGuards(JwtAuthGuard)
  @Get('bots/configured')
  async isBotConfigured() {
    return {
      configured: this.zoomBotService.isConfigured(),
      message: this.zoomBotService.isConfigured() 
        ? 'Zoom Meeting SDK is configured and ready' 
        : 'Zoom Meeting SDK credentials not configured',
    };
  }

}
