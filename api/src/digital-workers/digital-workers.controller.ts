import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { SignalsService } from './signals/signals.service';
import { CoachingAgendaService } from './coaching-agenda/coaching-agenda.service';
import { CoachingSessionsService } from './coaching-sessions/coaching-sessions.service';
import {
  GetSignalsDto,
  CreateSignalDto,
  AcknowledgeSignalDto,
  ExecuteRecommendationDto,
} from './dto/signals.dto';
import {
  GenerateCoachingAgendaDto,
  GetCoachingAgendasDto,
  UpdateCoachingAgendaDto,
} from './dto/coaching-agenda.dto';
import {
  AnalyzePlaybookDto,
  CompareSessionsDto,
} from './dto/coaching-sessions.dto';

@ApiTags('Digital Workers')
@ApiBearerAuth('JWT')
@Controller('digital-workers')
@UseGuards(JwtAuthGuard)
export class DigitalWorkersController {
  constructor(
    private readonly signalsService: SignalsService,
    private readonly coachingAgendaService: CoachingAgendaService,
    private readonly coachingSessionsService: CoachingSessionsService,
  ) {}

  // ==================== SIGNALS ====================

  /**
   * Get account signals with filtering
   */
  @Get('signals')
  async getSignals(@Request() req, @Query() dto: GetSignalsDto) {
    return this.signalsService.getSignals(req.user.id, dto);
  }

  /**
   * Get signals summary/stats
   */
  @Get('signals/summary')
  async getSignalsSummary(@Request() req) {
    return this.signalsService.getSignalsSummary(req.user.id);
  }

  /**
   * Get a single signal by ID
   */
  @Get('signals/:id')
  async getSignalById(@Request() req, @Param('id') signalId: string) {
    return this.signalsService.getSignalById(signalId, req.user.id);
  }

  /**
   * Create a new signal (manual entry)
   */
  @Post('signals')
  async createSignal(@Request() req, @Body() dto: CreateSignalDto) {
    return this.signalsService.createSignal(req.user.id, dto);
  }

  /**
   * Acknowledge, action, or dismiss a signal
   */
  @Patch('signals/:id/acknowledge')
  async acknowledgeSignal(
    @Request() req,
    @Param('id') signalId: string,
    @Body() dto: AcknowledgeSignalDto,
  ) {
    return this.signalsService.acknowledgeSignal(signalId, req.user.id, dto);
  }

  /**
   * Get AI recommendation for a signal
   */
  @Get('signals/:id/recommend')
  async getSignalRecommendation(@Request() req, @Param('id') signalId: string) {
    return this.signalsService.getRecommendation(signalId, req.user.id);
  }

  /**
   * Execute a recommendation
   */
  @Post('recommendations/:id/execute')
  async executeRecommendation(
    @Request() req,
    @Param('id') recommendationId: string,
    @Body() dto: ExecuteRecommendationDto,
  ) {
    return this.signalsService.executeRecommendation(recommendationId, req.user.id, dto);
  }

  /**
   * Trigger signal detection (manual scan)
   */
  @Post('signals/detect')
  async detectSignals(@Request() req) {
    const count = await this.signalsService.detectInternalSignals(req.user.id);
    return { detected: count };
  }

  // ==================== COACHING AGENDA ====================

  /**
   * Generate a coaching agenda
   */
  @Post('coaching/agenda/generate')
  async generateCoachingAgenda(@Request() req, @Body() dto: GenerateCoachingAgendaDto) {
    return this.coachingAgendaService.generateAgenda(req.user.id, dto);
  }

  /**
   * Get coaching agendas
   */
  @Get('coaching/agenda')
  async getCoachingAgendas(@Request() req, @Query() dto: GetCoachingAgendasDto) {
    return this.coachingAgendaService.getAgendas(req.user.id, dto);
  }

  /**
   * Get a single coaching agenda by ID
   */
  @Get('coaching/agenda/:id')
  async getCoachingAgendaById(@Request() req, @Param('id') agendaId: string) {
    return this.coachingAgendaService.getAgendaById(agendaId, req.user.id);
  }

  /**
   * Update a coaching agenda
   */
  @Patch('coaching/agenda/:id')
  async updateCoachingAgenda(
    @Request() req,
    @Param('id') agendaId: string,
    @Body() dto: UpdateCoachingAgendaDto,
  ) {
    return this.coachingAgendaService.updateAgenda(agendaId, req.user.id, dto);
  }

  // ==================== COACHING SESSIONS ====================

  /**
   * Analyze a coaching session against a playbook
   */
  @Post('coaching/sessions/:id/analyze-playbook')
  async analyzePlaybookAlignment(
    @Request() req,
    @Param('id') sessionId: string,
    @Body() dto: AnalyzePlaybookDto,
  ) {
    return this.coachingSessionsService.analyzePlaybookAlignment(
      sessionId,
      req.user.id,
      dto.playbookId,
    );
  }

  /**
   * Get key moments from a coaching session
   */
  @Get('coaching/sessions/:id/key-moments')
  async getSessionKeyMoments(@Request() req, @Param('id') sessionId: string) {
    return this.coachingSessionsService.getSessionKeyMoments(sessionId, req.user.id);
  }

  /**
   * Compare two coaching sessions
   */
  @Post('coaching/sessions/compare')
  async compareSessions(@Request() req, @Body() dto: CompareSessionsDto) {
    return this.coachingSessionsService.compareSessions(
      dto.sessionId1,
      dto.sessionId2,
      req.user.id,
    );
  }

  // ==================== TEAM MEMBERS ====================

  /**
   * Get team members (for rep selection in coaching)
   */
  @Get('team')
  async getTeamMembers(@Request() req) {
    // For now, return all users. In production, filter by org/team
    const users = await this.getUsersForTeam(req.user.id);
    return users;
  }

  private async getUsersForTeam(managerId: string) {
    // This would be enhanced to filter by actual team/org membership
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const users = await prisma.user.findMany({
        where: {
          role: { in: ['USER', 'MANAGER'] },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
        take: 50,
      });

      return users.map(u => ({
        id: u.id,
        name: u.name || u.email.split('@')[0],
        email: u.email,
        role: u.role === 'USER' ? 'Sales Rep' : 'Manager',
        avatar: u.avatarUrl,
      }));
    } finally {
      await prisma.$disconnect();
    }
  }

  // ==================== PLAYBOOKS ====================

  /**
   * Get available playbooks
   */
  @Get('playbooks')
  async getPlaybooks(@Request() req) {
    // Return playbooks from the database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const playbooks = await prisma.playbook.findMany({
        where: {
          OR: [
            { ownerId: req.user.id },
            { isPublic: true },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
        },
        take: 50,
      });

      // If no playbooks exist, return defaults
      if (playbooks.length === 0) {
        return [
          { id: 'pb_discovery', name: 'Discovery Call Framework', description: 'Standard discovery call structure', category: 'Discovery' },
          { id: 'pb_enterprise', name: 'Enterprise Sales Playbook', description: 'Complex deal navigation', category: 'Enterprise' },
          { id: 'pb_objections', name: 'Objection Handling Guide', description: 'Common objections and responses', category: 'Objections' },
          { id: 'pb_closing', name: 'Closing Techniques', description: 'Effective closing strategies', category: 'Closing' },
          { id: 'pb_competitive', name: 'Competitive Positioning', description: 'Differentiation against competitors', category: 'Competition' },
        ];
      }

      return playbooks;
    } finally {
      await prisma.$disconnect();
    }
  }
}
