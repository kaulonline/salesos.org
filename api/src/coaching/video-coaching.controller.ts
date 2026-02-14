/**
 * Video Coaching Controller
 *
 * REST API endpoints for video-based sales coaching.
 */

// AI Generated Code by Deloitte + Cursor (BEGIN)
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoCoachingService } from './video-coaching.service';
import { CoachingRealtimeService } from './coaching-realtime.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CreateCoachingSessionDto, CoachingSessionListQueryDto } from './dto/coaching.dto';
import { CoachingScenario, CoachingSessionStatus } from '@prisma/client';

@ApiTags('Video Coaching')
@ApiBearerAuth('JWT')
@Controller('coaching')
@UseGuards(JwtAuthGuard)
export class VideoCoachingController {
  constructor(
    private readonly videoCoachingService: VideoCoachingService,
    private readonly coachingRealtimeService: CoachingRealtimeService,
  ) {}
// AI Generated Code by Deloitte + Cursor (END)

  /**
   * Create a new coaching session
   * POST /api/coaching/sessions
   */
  @Post('sessions')
  async createSession(
    @Request() req,
    @Body() dto: CreateCoachingSessionDto,
  ) {
    return this.videoCoachingService.createSession(req.user.userId, dto);
  }

  /**
   * Upload media (video/audio) to a coaching session
   * POST /api/coaching/sessions/:id/upload
   */
  @Post('sessions/:id/upload')
  @UseInterceptors(FileInterceptor('media', {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max
    },
    fileFilter: (req, file, cb) => {
      // Accept audio and video files
      const allowedMimes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/webm',
        'audio/m4a',
        'audio/mp4',
        'audio/ogg',
        'audio/flac',
        'video/mp4',
        'video/webm',
        'video/quicktime',
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      }
    },
  }))
  async uploadMedia(
    @Request() req,
    @Param('id') sessionId: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    if (!file) {
      throw new BadRequestException('Media file is required');
    }

    return this.videoCoachingService.uploadMedia(sessionId, req.user.userId, file);
  }

  /**
   * Get a coaching session by ID
   * GET /api/coaching/sessions/:id
   */
  @Get('sessions/:id')
  async getSession(
    @Request() req,
    @Param('id') sessionId: string,
  ) {
    return this.videoCoachingService.getSession(sessionId, req.user.userId);
  }

  /**
   * List coaching sessions for the current user
   * GET /api/coaching/sessions
   */
  @Get('sessions')
  async listSessions(
    @Request() req,
    @Query('scenario') scenario?: CoachingScenario,
    @Query('status') status?: CoachingSessionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.videoCoachingService.listSessions(req.user.userId, {
      scenario,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Delete a coaching session
   * DELETE /api/coaching/sessions/:id
   */
  @Delete('sessions/:id')
  async deleteSession(
    @Request() req,
    @Param('id') sessionId: string,
  ) {
    await this.videoCoachingService.deleteSession(sessionId, req.user.userId);
    return { message: 'Coaching session deleted successfully' };
  }

  /**
   * Get coaching progress/stats for the current user
   * GET /api/coaching/progress
   */
  @Get('progress')
  async getProgress(@Request() req) {
    return this.videoCoachingService.getProgress(req.user.userId);
  }

  /**
   * Get available coaching scenarios
   * GET /api/coaching/scenarios
   */
  @Get('scenarios')
  getScenarios() {
    return Object.values(CoachingScenario).map(scenario => ({
      value: scenario,
      label: this.formatScenarioLabel(scenario),
      description: this.getScenarioDescription(scenario),
    }));
  }

  /**
   * Check if WebRTC realtime coaching is available
   * GET /api/coaching/realtime/available
   */
  @Get('realtime/available')
  isRealtimeAvailable() {
    return {
      available: this.coachingRealtimeService.isConfigured(),
      mode: 'webrtc',
      provider: 'azure-openai',
    };
  }

  /**
   * Get WebRTC token for real-time coaching session
   * POST /api/coaching/sessions/:id/realtime-token
   */
  @Post('sessions/:id/realtime-token')
  async getRealtimeToken(
    @Request() req,
    @Param('id') sessionId: string,
    @Body() body: { scenario: CoachingScenario },
  ) {
    return this.coachingRealtimeService.getCoachingSessionToken({
      sessionId,
      userId: req.user.userId,
      scenario: body.scenario || CoachingScenario.GENERAL_PRACTICE,
    });
  }

  /**
   * Save real-time coaching session transcript and feedback
   * POST /api/coaching/sessions/:id/realtime-save
   */
  @Post('sessions/:id/realtime-save')
  async saveRealtimeSession(
    @Request() req,
    @Param('id') sessionId: string,
    @Body() body: { transcript: string; duration: number; liveFeedback: string[] },
  ) {
    await this.coachingRealtimeService.saveRealtimeSession(
      sessionId,
      req.user.userId,
      body,
    );
    return { success: true, message: 'Realtime session saved' };
  }

  /**
   * Generate AI-powered next steps after a coaching session
   * POST /api/coaching/next-steps
   */
  @Post('next-steps')
  async generateNextSteps(@Request() req, @Body() body: any) {
    const { scenario, score, strengths, improvements, feedback, transcript, duration } = body;

    // Use AI to generate personalized next steps
    const nextSteps: Array<{
      priority: string;
      action: string;
      reasoning: string;
      timing: string;
    }> = [];

    // High priority: Address main improvement area
    if (improvements && improvements.length > 0) {
      nextSteps.push({
        priority: 'high',
        action: `Focus on: ${improvements[0]}`,
        reasoning: 'This was identified as your primary area for improvement',
        timing: 'This week',
      });
    }

    // Medium priority: Practice similar scenarios
    if (score && score < 80) {
      nextSteps.push({
        priority: 'medium',
        action: `Practice ${scenario?.replace(/_/g, ' ').toLowerCase() || 'this scenario'} again`,
        reasoning: `Your score of ${score}% shows room for improvement. Repetition builds mastery.`,
        timing: 'Next 2-3 days',
      });
    }

    // Build on strengths
    if (strengths && strengths.length > 0) {
      nextSteps.push({
        priority: 'low',
        action: `Leverage your ${strengths[0]} in real calls`,
        reasoning: 'Apply your practiced strengths to actual customer conversations',
        timing: 'This week',
      });
    }

    // Always suggest regular practice
    nextSteps.push({
      priority: 'medium',
      action: 'Schedule your next practice session',
      reasoning: 'Consistent practice leads to lasting improvement',
      timing: 'Within 48 hours',
    });

    return nextSteps.slice(0, 4); // Return top 4 next steps
  }
  // AI Generated Code by Deloitte + Cursor (END)

  private formatScenarioLabel(scenario: CoachingScenario): string {
    const labels: Record<CoachingScenario, string> = {
      [CoachingScenario.ELEVATOR_PITCH]: 'Elevator Pitch',
      [CoachingScenario.DISCOVERY_CALL]: 'Discovery Call',
      [CoachingScenario.DEMO_PRESENTATION]: 'Demo Presentation',
      [CoachingScenario.OBJECTION_HANDLING]: 'Objection Handling',
      [CoachingScenario.NEGOTIATION]: 'Negotiation',
      [CoachingScenario.CLOSING]: 'Closing',
      [CoachingScenario.COLD_CALL]: 'Cold Call',
      [CoachingScenario.FOLLOW_UP]: 'Follow-up Call',
      [CoachingScenario.GENERAL_PRACTICE]: 'General Practice',
    };
    return labels[scenario];
  }

  private getScenarioDescription(scenario: CoachingScenario): string {
    const descriptions: Record<CoachingScenario, string> = {
      [CoachingScenario.ELEVATOR_PITCH]: 'Practice your 30-60 second company/product pitch',
      [CoachingScenario.DISCOVERY_CALL]: 'Practice uncovering prospect needs and challenges',
      [CoachingScenario.DEMO_PRESENTATION]: 'Practice demonstrating your product',
      [CoachingScenario.OBJECTION_HANDLING]: 'Practice responding to common objections',
      [CoachingScenario.NEGOTIATION]: 'Practice discussing pricing and terms',
      [CoachingScenario.CLOSING]: 'Practice asking for the business',
      [CoachingScenario.COLD_CALL]: 'Practice cold outreach calls',
      [CoachingScenario.FOLLOW_UP]: 'Practice follow-up conversations',
      [CoachingScenario.GENERAL_PRACTICE]: 'Open practice session',
    };
    return descriptions[scenario];
  }
}
