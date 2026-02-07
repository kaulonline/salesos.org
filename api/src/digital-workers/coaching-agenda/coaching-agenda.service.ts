import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { CoachingAgendaStatus, Prisma } from '@prisma/client';
import {
  GenerateCoachingAgendaDto,
  GetCoachingAgendasDto,
  UpdateCoachingAgendaDto,
  CoachingAgendaResponse,
  CoachingAgendaContent,
  PipelineSnapshot,
  PerformanceSnapshot,
  AtRiskDeal,
  StuckDeal,
  HotDeal,
  StageBreakdown,
  LossPattern,
} from '../dto/coaching-agenda.dto';

@Injectable()
export class CoachingAgendaService {
  private readonly logger = new Logger(CoachingAgendaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * Generate a coaching agenda for a sales rep
   */
  async generateAgenda(
    managerId: string,
    dto: GenerateCoachingAgendaDto,
  ): Promise<CoachingAgendaResponse> {
    // Find the rep
    let rep: any;
    if (dto.repId) {
      rep = await this.prisma.user.findUnique({ where: { id: dto.repId } });
    } else if (dto.repEmail) {
      rep = await this.prisma.user.findUnique({ where: { email: dto.repEmail } });
    }

    if (!rep) {
      throw new NotFoundException('Sales rep not found');
    }

    this.logger.log(`Generating coaching agenda for rep ${rep.name} (${rep.id})`);

    // Gather all data
    const [pipelineData, performanceData, signals] = await Promise.all([
      this.getPipelineData(rep.id),
      this.getPerformanceData(rep.id),
      this.getRecentSignals(rep.id),
    ]);

    // Generate agenda content using Claude
    const agendaContent = await this.generateAgendaContent(rep, pipelineData, performanceData, signals, dto.focusAreas);

    // Store the agenda
    const agenda = await this.prisma.coachingAgenda.create({
      data: {
        repId: rep.id,
        managerId,
        agenda: agendaContent as any,
        pipelineSnapshot: pipelineData as any,
        performanceSnapshot: performanceData as any,
        status: CoachingAgendaStatus.DRAFT,
      },
    });

    return {
      id: agenda.id,
      repId: agenda.repId,
      repName: rep.name,
      managerId: agenda.managerId,
      agenda: agenda.agenda as unknown as CoachingAgendaContent,
      pipelineSnapshot: agenda.pipelineSnapshot as unknown as PipelineSnapshot,
      performanceSnapshot: agenda.performanceSnapshot as unknown as PerformanceSnapshot,
      status: agenda.status,
      scheduledFor: agenda.scheduledFor || undefined,
      completedAt: agenda.completedAt || undefined,
      sessionNotes: agenda.sessionNotes || undefined,
      followUpActions: agenda.followUpActions as any,
      createdAt: agenda.createdAt,
      updatedAt: agenda.updatedAt,
    };
  }

  /**
   * Get pipeline data for a rep
   */
  private async getPipelineData(repId: string): Promise<PipelineSnapshot> {
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        ownerId: repId,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
      include: {
        account: { select: { name: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const now = new Date();
    const atRiskDeals: AtRiskDeal[] = [];
    const stuckDeals: StuckDeal[] = [];
    const hotDeals: HotDeal[] = [];
    const stageMap = new Map<string, { count: number; value: number }>();

    for (const opp of opportunities) {
      const daysInStage = Math.floor(
        (now.getTime() - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const lastActivity = opp.activities[0];
      const daysSinceActivity = lastActivity
        ? Math.floor((now.getTime() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Stage breakdown
      const stage = opp.stage || 'Unknown';
      const current = stageMap.get(stage) || { count: 0, value: 0 };
      stageMap.set(stage, {
        count: current.count + 1,
        value: current.value + (opp.amount || 0),
      });

      // Risk assessment
      const riskFactors: string[] = [];
      let riskScore = 0;

      if (daysInStage > 14) {
        riskFactors.push(`${daysInStage} days in stage`);
        riskScore += 0.3;
      }
      if (daysSinceActivity > 7) {
        riskFactors.push(`No activity in ${daysSinceActivity} days`);
        riskScore += 0.3;
      }
      if ((opp.probability || 0) < 30) {
        riskFactors.push('Low probability');
        riskScore += 0.2;
      }

      if (riskScore >= 0.5) {
        atRiskDeals.push({
          id: opp.id,
          name: opp.name,
          amount: opp.amount || 0,
          stage,
          daysInStage,
          riskScore: Math.min(riskScore, 1),
          riskFactors,
          accountName: opp.account?.name || 'Unknown',
        });
      }

      // Stuck deals (no movement in 21+ days)
      if (daysInStage > 21) {
        stuckDeals.push({
          id: opp.id,
          name: opp.name,
          amount: opp.amount || 0,
          stage,
          daysInStage,
          lastActivityDate: lastActivity?.createdAt.toISOString() || 'Never',
        });
      }

      // Hot deals (high probability, recent activity)
      if ((opp.probability || 0) >= 60 && daysSinceActivity <= 7) {
        hotDeals.push({
          id: opp.id,
          name: opp.name,
          amount: opp.amount || 0,
          stage,
          momentum: 1 - (daysSinceActivity / 7),
          nextStep: opp.nextStep || undefined,
        });
      }
    }

    const byStage: StageBreakdown[] = Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value,
    }));

    return {
      totalPipeline: opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
      dealCount: opportunities.length,
      atRiskDeals: atRiskDeals.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5),
      stuckDeals: stuckDeals.sort((a, b) => b.daysInStage - a.daysInStage).slice(0, 5),
      hotDeals: hotDeals.sort((a, b) => b.momentum - a.momentum).slice(0, 5),
      byStage,
    };
  }

  /**
   * Get performance data for a rep
   */
  private async getPerformanceData(repId: string): Promise<PerformanceSnapshot> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get closed opportunities for win rate
    const closedOpps = await this.prisma.opportunity.findMany({
      where: {
        ownerId: repId,
        stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] },
        updatedAt: { gte: ninetyDaysAgo },
      },
      select: {
        stage: true,
        amount: true,
        lostReason: true,
      },
    });

    const won = closedOpps.filter(o => o.stage === 'CLOSED_WON');
    const lost = closedOpps.filter(o => o.stage === 'CLOSED_LOST');
    const winRate = closedOpps.length > 0 ? Math.round((won.length / closedOpps.length) * 100) : 0;
    const avgDealSize = won.length > 0
      ? won.reduce((sum, o) => sum + (o.amount || 0), 0) / won.length
      : 0;

    // Get activity counts
    const activities = await this.prisma.activity.findMany({
      where: {
        userId: repId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { type: true },
    });

    const activityMetrics = {
      calls: activities.filter(a => a.type === 'CALL').length,
      emails: activities.filter(a => a.type === 'EMAIL').length,
      meetings: activities.filter(a => a.type === 'MEETING').length,
    };

    // Calculate vs team average (simplified - would need team data)
    const totalActivities = activityMetrics.calls + activityMetrics.emails + activityMetrics.meetings;
    const activityVsTeam = Math.min(Math.round((totalActivities / 50) * 100), 150); // Assuming 50 is average

    // Loss patterns
    const lossReasons = new Map<string, number>();
    for (const opp of lost) {
      const reason = opp.lostReason || 'Unknown';
      lossReasons.set(reason, (lossReasons.get(reason) || 0) + 1);
    }

    const lossPatterns: LossPattern[] = Array.from(lossReasons.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: Math.round((count / Math.max(lost.length, 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      winRate,
      avgDealSize: Math.round(avgDealSize),
      activityMetrics,
      activityVsTeam,
      lossPatterns,
    };
  }

  /**
   * Get recent signals for rep's accounts
   */
  private async getRecentSignals(repId: string): Promise<any[]> {
    const signals = await this.prisma.accountSignal.findMany({
      where: {
        account: { ownerId: repId },
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        account: { select: { name: true } },
      },
      take: 10,
      orderBy: { priority: 'asc' },
    });

    return signals.map(s => ({
      accountName: s.account.name,
      title: s.title,
      type: s.type,
      priority: s.priority,
    }));
  }

  /**
   * Generate agenda content using Claude
   */
  private async generateAgendaContent(
    rep: any,
    pipeline: PipelineSnapshot,
    performance: PerformanceSnapshot,
    signals: any[],
    focusAreas?: string[],
  ): Promise<CoachingAgendaContent> {
    const prompt = `
## Coaching Session Preparation

### Rep Information
- Name: ${rep.name}
- Email: ${rep.email}

### Pipeline Overview
- Total Pipeline: $${pipeline.totalPipeline.toLocaleString()}
- Open Deals: ${pipeline.dealCount}
- At-Risk Deals: ${pipeline.atRiskDeals.length}
- Hot Deals: ${pipeline.hotDeals.length}

### At-Risk Deals
${pipeline.atRiskDeals.map(d => `- ${d.name} ($${d.amount.toLocaleString()}) - ${d.accountName} - Risk: ${Math.round(d.riskScore * 100)}% - Factors: ${d.riskFactors.join(', ')}`).join('\n')}

### Hot Deals
${pipeline.hotDeals.map(d => `- ${d.name} ($${d.amount.toLocaleString()}) - Momentum: ${Math.round(d.momentum * 100)}%`).join('\n')}

### Performance (Last 90 Days)
- Win Rate: ${performance.winRate}%
- Avg Deal Size: $${performance.avgDealSize.toLocaleString()}
- Activity vs Team: ${performance.activityVsTeam}%
- Calls: ${performance.activityMetrics.calls}, Emails: ${performance.activityMetrics.emails}, Meetings: ${performance.activityMetrics.meetings}

### Loss Patterns
${performance.lossPatterns.map(p => `- ${p.reason}: ${p.percentage}%`).join('\n')}

### Recent Account Signals
${signals.map(s => `- ${s.accountName}: ${s.title} (${s.priority})`).join('\n') || 'No recent signals'}

${focusAreas ? `### Requested Focus Areas\n${focusAreas.join(', ')}` : ''}

---

Generate a structured 45-minute coaching agenda with these sections:

1. **Opening & Wins** (5 min) - Start positive, acknowledge recent wins or good behaviors
2. **Pipeline Deep Dive** (15 min) - Focus on 2-3 critical deals, ask probing questions
3. **Skill Development** (10 min) - Address one key skill gap based on loss patterns or activity
4. **Action Planning** (10 min) - Get specific commitments with deadlines
5. **Support Needed** (5 min) - How can the manager help this week?

For each section, provide:
- talkingPoints: 2-4 specific, actionable points
- questions: 2-3 coaching questions to ask
- successMetrics: What good looks like for this section

Be specific - use actual deal names, amounts, and data from above.
Output as JSON matching the CoachingAgendaContent format.
`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [
          { role: 'system', content: `You are an expert sales coach helping managers prepare for effective 1:1 coaching sessions.
                 Your coaching philosophy:
                 1. Lead with positives - acknowledge wins before addressing gaps
                 2. Focus on behaviors, not personality
                 3. Use data to drive conversations
                 4. One skill at a time - don't overwhelm
                 5. End with specific commitments
                 Output valid JSON only.` },
          { role: 'user', content: prompt }
        ],
        maxTokens: 2000,
      });

      const parsed = JSON.parse(response);
      return this.validateAndNormalizeAgenda(parsed);
    } catch (error) {
      this.logger.error('Failed to generate agenda content:', error);
      return this.getDefaultAgenda(pipeline, performance);
    }
  }

  /**
   * Validate and normalize agenda structure
   */
  private validateAndNormalizeAgenda(parsed: any): CoachingAgendaContent {
    const defaultSection = {
      title: '',
      duration: '5 min',
      talkingPoints: [],
      questions: [],
      successMetrics: [],
    };

    return {
      opening: { ...defaultSection, title: 'Opening & Wins', duration: '5 min', ...parsed.opening },
      pipelineReview: { ...defaultSection, title: 'Pipeline Deep Dive', duration: '15 min', ...parsed.pipelineReview },
      skillDevelopment: { ...defaultSection, title: 'Skill Development', duration: '10 min', ...parsed.skillDevelopment },
      actionPlanning: { ...defaultSection, title: 'Action Planning', duration: '10 min', ...parsed.actionPlanning },
      supportNeeded: { ...defaultSection, title: 'Support Needed', duration: '5 min', ...parsed.supportNeeded },
    };
  }

  /**
   * Get default agenda when AI generation fails
   */
  private getDefaultAgenda(pipeline: PipelineSnapshot, performance: PerformanceSnapshot): CoachingAgendaContent {
    return {
      opening: {
        title: 'Opening & Wins',
        duration: '5 min',
        talkingPoints: ['Review wins from the past week', 'Acknowledge positive behaviors'],
        questions: ['What are you most proud of this week?'],
        successMetrics: ['Rep feels recognized and engaged'],
      },
      pipelineReview: {
        title: 'Pipeline Deep Dive',
        duration: '15 min',
        talkingPoints: pipeline.atRiskDeals.slice(0, 3).map(d => `Review ${d.name} - ${d.riskFactors.join(', ')}`),
        questions: ['What\'s blocking progress on this deal?', 'What do you need to move forward?'],
        successMetrics: ['Clear next steps for each deal', 'Blockers identified'],
      },
      skillDevelopment: {
        title: 'Skill Development',
        duration: '10 min',
        talkingPoints: performance.lossPatterns.length > 0
          ? [`Focus on reducing losses to "${performance.lossPatterns[0].reason}"`]
          : ['Review call recordings for coaching opportunities'],
        questions: ['What would you do differently next time?'],
        successMetrics: ['One specific technique to practice'],
      },
      actionPlanning: {
        title: 'Action Planning',
        duration: '10 min',
        talkingPoints: ['Define 3 specific commitments for next week', 'Set deadlines for each'],
        questions: ['What support do you need to accomplish these?'],
        successMetrics: ['3 specific, time-bound commitments'],
      },
      supportNeeded: {
        title: 'Support Needed',
        duration: '5 min',
        talkingPoints: ['Executive introductions needed?', 'Resources or training requests?'],
        questions: ['How can I best support you this week?'],
        successMetrics: ['Clear asks documented'],
      },
    };
  }

  /**
   * Get coaching agendas with filtering
   */
  async getAgendas(managerId: string, dto: GetCoachingAgendasDto): Promise<CoachingAgendaResponse[]> {
    const where: Prisma.CoachingAgendaWhereInput = { managerId };

    if (dto.repId) where.repId = dto.repId;
    if (dto.status) where.status = dto.status;

    const agendas = await this.prisma.coachingAgenda.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: dto.limit || 20,
      skip: dto.offset || 0,
    });

    // Get rep names
    const repIds = [...new Set(agendas.map(a => a.repId))];
    const reps = await this.prisma.user.findMany({
      where: { id: { in: repIds } },
      select: { id: true, name: true },
    });
    const repMap = new Map(reps.map(r => [r.id, r.name]));

    return agendas.map(agenda => ({
      id: agenda.id,
      repId: agenda.repId,
      repName: repMap.get(agenda.repId) ?? undefined,
      managerId: agenda.managerId,
      agenda: agenda.agenda as unknown as CoachingAgendaContent,
      pipelineSnapshot: agenda.pipelineSnapshot as unknown as PipelineSnapshot,
      performanceSnapshot: agenda.performanceSnapshot as unknown as PerformanceSnapshot,
      status: agenda.status,
      scheduledFor: agenda.scheduledFor ?? undefined,
      completedAt: agenda.completedAt ?? undefined,
      sessionNotes: agenda.sessionNotes ?? undefined,
      followUpActions: agenda.followUpActions as any,
      createdAt: agenda.createdAt,
      updatedAt: agenda.updatedAt,
    }));
  }

  /**
   * Get a single agenda by ID
   */
  async getAgendaById(agendaId: string, managerId: string): Promise<CoachingAgendaResponse> {
    const agenda = await this.prisma.coachingAgenda.findFirst({
      where: { id: agendaId, managerId },
    });

    if (!agenda) {
      throw new NotFoundException(`Coaching agenda with ID ${agendaId} not found`);
    }

    const rep = await this.prisma.user.findUnique({
      where: { id: agenda.repId },
      select: { name: true },
    });

    return {
      id: agenda.id,
      repId: agenda.repId,
      repName: rep?.name ?? undefined,
      managerId: agenda.managerId,
      agenda: agenda.agenda as unknown as CoachingAgendaContent,
      pipelineSnapshot: agenda.pipelineSnapshot as unknown as PipelineSnapshot,
      performanceSnapshot: agenda.performanceSnapshot as unknown as PerformanceSnapshot,
      status: agenda.status,
      scheduledFor: agenda.scheduledFor ?? undefined,
      completedAt: agenda.completedAt ?? undefined,
      sessionNotes: agenda.sessionNotes ?? undefined,
      followUpActions: agenda.followUpActions as any,
      createdAt: agenda.createdAt,
      updatedAt: agenda.updatedAt,
    };
  }

  /**
   * Update a coaching agenda
   */
  async updateAgenda(
    agendaId: string,
    managerId: string,
    dto: UpdateCoachingAgendaDto,
  ): Promise<CoachingAgendaResponse> {
    const existing = await this.prisma.coachingAgenda.findFirst({
      where: { id: agendaId, managerId },
    });

    if (!existing) {
      throw new NotFoundException(`Coaching agenda with ID ${agendaId} not found`);
    }

    const updateData: Prisma.CoachingAgendaUpdateInput = {};

    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === 'IN_PROGRESS') updateData.startedAt = new Date();
      if (dto.status === 'COMPLETED') updateData.completedAt = new Date();
    }
    if (dto.sessionNotes !== undefined) updateData.sessionNotes = dto.sessionNotes;
    if (dto.followUpActions !== undefined) updateData.followUpActions = dto.followUpActions as any;
    if (dto.outcome !== undefined) updateData.outcome = dto.outcome;

    const updated = await this.prisma.coachingAgenda.update({
      where: { id: agendaId },
      data: updateData,
    });

    const rep = await this.prisma.user.findUnique({
      where: { id: updated.repId },
      select: { name: true },
    });

    return {
      id: updated.id,
      repId: updated.repId,
      repName: rep?.name ?? undefined,
      managerId: updated.managerId,
      agenda: updated.agenda as unknown as CoachingAgendaContent,
      pipelineSnapshot: updated.pipelineSnapshot as unknown as PipelineSnapshot,
      performanceSnapshot: updated.performanceSnapshot as unknown as PerformanceSnapshot,
      status: updated.status,
      scheduledFor: updated.scheduledFor ?? undefined,
      completedAt: updated.completedAt ?? undefined,
      sessionNotes: updated.sessionNotes ?? undefined,
      followUpActions: updated.followUpActions as any,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
