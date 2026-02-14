import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Logger,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';
import { ConversationsService } from '../conversations/conversations.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { ExchangeSdpDto } from './dto/exchange-sdp.dto';
import { ExecuteToolDto } from './dto/execute-tool.dto';
import { SaveCallHistoryDto } from './dto/save-call-history.dto';

/**
 * Realtime Voice API Controller
 * Handles WebRTC session creation and SDP exchange for Azure OpenAI Realtime
 */
@ApiTags('Realtime')
@ApiBearerAuth('JWT')
@Controller('realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * Get an ephemeral token for WebRTC connection
   * POST /api/realtime/token
   */
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async getToken(@Request() req, @Body() createSessionDto: CreateSessionDto) {
    const userId = req.user?.sub || req.user?.userId;
    return this.realtimeService.getEphemeralToken({
      instructions: createSessionDto.instructions,
      voice: createSessionDto.voice,
      model: createSessionDto.model,
      tools: createSessionDto.tools,
      userId: userId,
    });
  }

  /**
   * Exchange SDP offer for answer (proxied through backend for security)
   * POST /api/realtime/sdp
   */
  @Post('sdp')
  @HttpCode(HttpStatus.OK)
  async exchangeSdp(@Body() exchangeSdpDto: ExchangeSdpDto) {
    return this.realtimeService.exchangeSDP(
      exchangeSdpDto.token,
      exchangeSdpDto.sdpOffer,
      exchangeSdpDto.model,
    );
  }

  /**
   * Get the WebRTC endpoint URL for direct client connection
   * GET /api/realtime/endpoint
   */
  @Get('endpoint')
  getEndpoint() {
    return this.realtimeService.getWebRTCEndpoint();
  }

  /**
   * Execute a CRM tool on behalf of the realtime voice assistant
   * POST /api/realtime/execute-tool
   * This endpoint is called by the mobile app when Azure OpenAI requests a function call
   */
  @Post('execute-tool')
  @HttpCode(HttpStatus.OK)
  async executeTool(@Request() req, @Body() executeToolDto: ExecuteToolDto) {
    const userId = req.user.sub || req.user.userId;
    this.logger.warn(`[REALTIME_EXECUTE_TOOL] Received: toolName=${executeToolDto.toolName}, userId=${userId}, dataSource=${executeToolDto.dataSource}, args=${JSON.stringify(executeToolDto.arguments)}`);
    const result = await this.conversationsService.executeRealtimeTool(
      userId,
      executeToolDto.toolName,
      executeToolDto.arguments || {},
      executeToolDto.dataSource,
    );
    this.logger.warn(`[REALTIME_EXECUTE_TOOL] Result: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Get engagement messages for all tools
   * GET /api/realtime/engagement-messages
   * Returns a map of toolName -> engagement message for UI feedback
   */
  @Get('engagement-messages')
  getEngagementMessages() {
    return {
      messages: this.realtimeService.getToolEngagementMessages(),
      defaultMessage: 'One moment, let me check that...',
    };
  }

  /**
   * Save a voice call session for history and analytics
   * POST /api/realtime/sessions
   * This endpoint is called by the mobile app to persist call history
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async saveCallSession(
    @Request() req,
    @Body() saveCallHistoryDto: SaveCallHistoryDto,
  ) {
    const userId = req.user.sub || req.user.userId;

    // Log call analytics for monitoring and debugging
    this.logger.log(
      `Voice call session: userId=${userId}, sessionId=${saveCallHistoryDto.sessionId}, ` +
      `duration=${saveCallHistoryDto.durationMs}ms, turns=${saveCallHistoryDto.userTurnCount + saveCallHistoryDto.assistantTurnCount}, ` +
      `tools=${(saveCallHistoryDto.toolsUsed || []).length}, hasTranscript=${!!saveCallHistoryDto.transcript?.length}`,
    );

    // Persist call history to database
    const savedCall = await this.realtimeService.saveCallHistory(userId, saveCallHistoryDto);

    return {
      success: true,
      id: savedCall.id,
      sessionId: savedCall.sessionId,
      message: 'Call session saved to history',
      analytics: {
        durationMs: savedCall.durationMs,
        totalTurns: savedCall.userTurnCount + savedCall.assistantTurnCount,
        toolsUsed: savedCall.toolsUsed?.length || 0,
        hasTranscript: !!savedCall.transcriptText,
      },
    };
  }

  /**
   * Alias for call history endpoint (matches mobile app expectation)
   * POST /api/realtime/call-history
   */
  @Post('call-history')
  @HttpCode(HttpStatus.CREATED)
  async saveCallHistory(
    @Request() req,
    @Body() saveCallHistoryDto: SaveCallHistoryDto,
  ) {
    // Delegate to the sessions endpoint
    return this.saveCallSession(req, saveCallHistoryDto);
  }

  /**
   * Get call history for the authenticated user
   * GET /api/realtime/sessions
   */
  @Get('sessions')
  async getCallHistory(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('leadId') leadId?: string,
    @Query('contactId') contactId?: string,
    @Query('accountId') accountId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.realtimeService.getCallHistory(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      leadId,
      contactId,
      accountId,
      opportunityId,
    });
  }

  /**
   * Get a specific call history entry
   * GET /api/realtime/sessions/:id
   */
  @Get('sessions/:id')
  async getCallHistoryById(
    @Request() req,
    @Param('id') callId: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    const call = await this.realtimeService.getCallHistoryById(userId, callId);
    if (!call) {
      return { error: 'Call not found', statusCode: 404 };
    }
    return call;
  }

  /**
   * Health check for realtime service
   * GET /api/realtime/health
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'realtime-voice',
      timestamp: new Date().toISOString(),
    };
  }
}
