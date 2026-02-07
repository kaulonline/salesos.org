/**
 * Coaching Effectiveness Service
 *
 * Measures the impact of coaching on sales performance by tracking:
 * - Win rate before/after coaching interventions
 * - Action item completion rates
 * - Performance trajectory over time
 * - Coaching ROI metrics
 *
 * Phase 2 Vertiv O2O Journey - AI-Enabled Sales Coaching
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import {
  GetEffectivenessQueryDto,
  GetRepEffectivenessQueryDto,
  CoachingIntervention,
  BeforeAfterMetrics,
  ActionItemCompletionMetrics,
  PerformanceDataPoint,
  CoachingROIMetrics,
  RepEffectivenessSummary,
  TeamComparisonMetrics,
  EffectivenessDashboardSummary,
  RepEffectivenessReport,
} from './dto/coaching-effectiveness.dto';
import {
  ActionItemStatus,
  ActionItemPriority,
  CoachingSessionStatus,
  CoachingAgendaStatus,
} from '@prisma/client';

@Injectable()
export class CoachingEffectivenessService {
  private readonly logger = new Logger(CoachingEffectivenessService.name);

  // Default comparison period: 30 days before vs 30 days after
  private readonly COMPARISON_WINDOW_DAYS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropicService: AnthropicService,
  ) {}

  // ==================== DASHBOARD SUMMARY ====================

  /**
   * Get overall coaching effectiveness dashboard summary
   */
  async getEffectivenessSummary(
    managerId: string,
    query: GetEffectivenessQueryDto,
  ): Promise<EffectivenessDashboardSummary> {
    const { startDate, endDate, lookbackDays } = this.parseDateRange(query);

    this.logger.log(
      `Generating effectiveness summary for manager ${managerId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Get all coaching interventions in the period
    const interventions = await this.getCoachingInterventions(managerId, startDate, endDate);

    // Get all coached reps
    const coachedRepIds = [...new Set(interventions.map((i) => i.repId))];

    // Get action item metrics
    const actionItemStats = await this.getActionItemStats(managerId, startDate, endDate);

    // Calculate before/after metrics for each rep
    const repMetrics = await Promise.all(
      coachedRepIds.map((repId) => this.calculateRepEffectiveness(repId, startDate, endDate)),
    );

    // Filter out nulls and calculate aggregates
    const validRepMetrics = repMetrics.filter((m): m is RepEffectivenessSummary => m !== null);

    // Calculate performance distribution
    const repsImproving = validRepMetrics.filter((r) => r.performanceTrend === 'IMPROVING').length;
    const repsStable = validRepMetrics.filter((r) => r.performanceTrend === 'STABLE').length;
    const repsDeclining = validRepMetrics.filter((r) => r.performanceTrend === 'DECLINING').length;

    // Calculate averages
    const avgWinRateChange =
      validRepMetrics.length > 0
        ? validRepMetrics.reduce((sum, r) => sum + r.winRateChange, 0) / validRepMetrics.length
        : 0;

    const avgDealSizeChange =
      validRepMetrics.length > 0
        ? validRepMetrics.reduce((sum, r) => sum + r.avgDealSizeChange, 0) / validRepMetrics.length
        : 0;

    // Get performance trajectory (weekly data points)
    const performanceTrajectory = await this.getPerformanceTrajectory(
      managerId,
      startDate,
      endDate,
      'weekly',
    );

    // Calculate ROI
    const totalRevenueInfluenced = validRepMetrics.reduce((sum, r) => sum + r.revenueInfluenced, 0);
    const totalCoachingHours = interventions.reduce(
      (sum, i) => sum + (i.duration || 60) / 60,
      0,
    );
    const estimatedCoachingROI =
      totalCoachingHours > 0 ? totalRevenueInfluenced / (totalCoachingHours * 150) : 0; // Assuming $150/hr coaching cost

    // Get top improvers
    const topImprovers = [...validRepMetrics]
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 5);

    return {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalCoachingInterventions: interventions.length,
      totalRepsCoached: coachedRepIds.length,
      totalActionItemsCreated: actionItemStats.totalAssigned,
      totalActionItemsCompleted: actionItemStats.totalCompleted,
      overallCompletionRate: actionItemStats.completionRate,
      avgWinRateChange,
      avgDealSizeChange,
      avgActivityChange: 0, // Calculate from repMetrics
      avgPipelineChange: 0, // Calculate from repMetrics
      repsImproving,
      repsStable,
      repsDeclining,
      totalRevenueInfluenced,
      estimatedCoachingROI,
      topImprovers,
      recentInterventions: interventions.slice(0, 10),
      performanceTrajectory,
    };
  }

  // ==================== REP EFFECTIVENESS ====================

  /**
   * Get detailed effectiveness report for a specific rep
   */
  async getRepEffectiveness(
    repId: string,
    query: GetRepEffectivenessQueryDto,
  ): Promise<RepEffectivenessReport> {
    const { startDate, endDate } = this.parseDateRange(query);

    // Get rep info
    const rep = await this.prisma.user.findUnique({
      where: { id: repId },
      select: { id: true, name: true, email: true },
    });

    if (!rep) {
      throw new NotFoundException(`Rep with ID ${repId} not found`);
    }

    // Get coaching interventions for this rep
    const interventions = await this.getRepCoachingInterventions(repId, startDate, endDate);

    // Get before/after metrics
    const beforeAfterMetrics = await this.calculateBeforeAfterMetrics(repId, startDate, endDate);

    // Get action item metrics
    const actionItemMetrics = await this.getRepActionItemMetrics(repId, startDate, endDate);

    // Get performance trajectory
    const performanceTrajectory = await this.getRepPerformanceTrajectory(
      repId,
      startDate,
      endDate,
      'weekly',
    );

    // Calculate ROI metrics
    const roiMetrics = await this.calculateRepROI(repId, startDate, endDate, beforeAfterMetrics);

    // Generate summary
    const summary = await this.calculateRepEffectiveness(repId, startDate, endDate);

    return {
      repId,
      repName: rep.name || rep.email || 'Unknown',
      email: rep.email,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      coachingInterventions: interventions,
      totalCoachingSessions: interventions.length,
      beforeAfterMetrics,
      actionItemMetrics,
      performanceTrajectory,
      roiMetrics,
      summary: summary || this.getDefaultRepSummary(repId, rep.name || rep.email || 'Unknown'),
    };
  }

  // ==================== TEAM COMPARISON ====================

  /**
   * Get team comparison metrics
   */
  async getTeamComparison(
    managerId: string,
    query: GetEffectivenessQueryDto,
  ): Promise<TeamComparisonMetrics> {
    const { startDate, endDate } = this.parseDateRange(query);

    // Get manager info
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, name: true, email: true },
    });

    if (!manager) {
      throw new NotFoundException(`Manager with ID ${managerId} not found`);
    }

    // Get all reps who have been coached by this manager
    const coachedReps = await this.prisma.coachingActionItem.findMany({
      where: {
        managerId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { repId: true },
      distinct: ['repId'],
    });

    const repIds = coachedReps.map((r) => r.repId);

    // Get effectiveness summary for each rep
    const repSummaries = await Promise.all(
      repIds.map((repId) => this.calculateRepEffectiveness(repId, startDate, endDate)),
    );

    const validSummaries = repSummaries.filter((s): s is RepEffectivenessSummary => s !== null);

    // Calculate aggregate metrics
    const repsWithImprovedWinRate = validSummaries.filter((r) => r.winRateChange > 0).length;
    const repsWithImprovedDealSize = validSummaries.filter((r) => r.avgDealSizeChange > 0).length;

    const avgWinRateChange =
      validSummaries.length > 0
        ? validSummaries.reduce((sum, r) => sum + r.winRateChange, 0) / validSummaries.length
        : 0;

    const avgDealSizeChange =
      validSummaries.length > 0
        ? validSummaries.reduce((sum, r) => sum + r.avgDealSizeChange, 0) / validSummaries.length
        : 0;

    // Get coaching session count
    const coachingStats = await this.getCoachingStats(managerId, startDate, endDate);

    // Get action item completion rate
    const actionItemStats = await this.getActionItemStats(managerId, startDate, endDate);

    // Calculate ROI
    const totalRevenueInfluenced = validSummaries.reduce((sum, r) => sum + r.revenueInfluenced, 0);

    return {
      managerId,
      managerName: manager.name || manager.email || 'Unknown',
      totalReps: validSummaries.length,
      repsWithImprovedWinRate,
      repsWithImprovedDealSize,
      avgWinRateChange,
      avgDealSizeChange,
      totalCoachingSessions: coachingStats.totalSessions,
      avgSessionsPerRep:
        validSummaries.length > 0 ? coachingStats.totalSessions / validSummaries.length : 0,
      actionItemCompletionRate: actionItemStats.completionRate,
      totalRevenueInfluenced,
      avgROIPerRep:
        validSummaries.length > 0 ? totalRevenueInfluenced / validSummaries.length : 0,
      repSummaries: validSummaries.sort((a, b) => b.trendScore - a.trendScore),
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Parse date range from query params
   */
  private parseDateRange(query: GetEffectivenessQueryDto): {
    startDate: Date;
    endDate: Date;
    lookbackDays: number;
  } {
    const lookbackDays = query.lookbackDays || 90;
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    return { startDate, endDate, lookbackDays };
  }

  /**
   * Get all coaching interventions for a manager's team
   */
  private async getCoachingInterventions(
    managerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CoachingIntervention[]> {
    const interventions: CoachingIntervention[] = [];

    // Get coaching agendas (1:1 sessions)
    const agendas = await this.prisma.coachingAgenda.findMany({
      where: {
        managerId,
        status: { in: [CoachingAgendaStatus.COMPLETED, CoachingAgendaStatus.IN_PROGRESS] },
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get rep and manager names
    const userIds = new Set<string>();
    agendas.forEach((a) => {
      userIds.add(a.repId);
      userIds.add(a.managerId);
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email || 'Unknown']));

    // Get action items created from these agendas
    const agendaIds = agendas.map((a) => a.id);
    const actionItems = await this.prisma.coachingActionItem.findMany({
      where: { coachingAgendaId: { in: agendaIds } },
      select: {
        coachingAgendaId: true,
        status: true,
      },
    });

    const actionItemsByAgenda = new Map<string, { created: number; completed: number }>();
    actionItems.forEach((item) => {
      if (!item.coachingAgendaId) return;
      const current = actionItemsByAgenda.get(item.coachingAgendaId) || { created: 0, completed: 0 };
      current.created++;
      if (item.status === ActionItemStatus.COMPLETED) {
        current.completed++;
      }
      actionItemsByAgenda.set(item.coachingAgendaId, current);
    });

    for (const agenda of agendas) {
      const stats = actionItemsByAgenda.get(agenda.id) || { created: 0, completed: 0 };
      const agendaData = agenda.agenda as any;

      interventions.push({
        id: agenda.id,
        type: 'AGENDA_SESSION',
        repId: agenda.repId,
        repName: userMap.get(agenda.repId) || 'Unknown',
        managerId: agenda.managerId,
        managerName: userMap.get(agenda.managerId) || 'Unknown',
        date: agenda.createdAt.toISOString(),
        duration: 60, // Default 1 hour
        actionItemsCreated: stats.created,
        actionItemsCompleted: stats.completed,
        keyTopics: agendaData?.sections?.map((s: any) => s.title) || [],
      });
    }

    // Get video coaching sessions
    const coachingSessions = await this.prisma.coachingSession.findMany({
      where: {
        userId: managerId,
        status: CoachingSessionStatus.COMPLETED,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const session of coachingSessions) {
      interventions.push({
        id: session.id,
        type: 'VIDEO_COACHING',
        repId: session.userId,
        repName: userMap.get(session.userId) || 'Unknown',
        managerId: managerId,
        managerName: userMap.get(managerId) || 'Unknown',
        date: session.createdAt.toISOString(),
        duration: session.durationSeconds ? Math.round(session.durationSeconds / 60) : 0,
        actionItemsCreated: 0,
        actionItemsCompleted: 0,
      });
    }

    return interventions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Get coaching interventions for a specific rep
   */
  private async getRepCoachingInterventions(
    repId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CoachingIntervention[]> {
    const interventions: CoachingIntervention[] = [];

    // Get coaching agendas where this rep was coached
    const agendas = await this.prisma.coachingAgenda.findMany({
      where: {
        repId,
        status: { in: [CoachingAgendaStatus.COMPLETED, CoachingAgendaStatus.IN_PROGRESS] },
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user names
    const managerIds = [...new Set(agendas.map((a) => a.managerId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...managerIds, repId] } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email || 'Unknown']));

    // Get action items for these agendas
    const agendaIds = agendas.map((a) => a.id);
    const actionItems = await this.prisma.coachingActionItem.findMany({
      where: { coachingAgendaId: { in: agendaIds } },
      select: { coachingAgendaId: true, status: true },
    });

    const actionItemsByAgenda = new Map<string, { created: number; completed: number }>();
    actionItems.forEach((item) => {
      if (!item.coachingAgendaId) return;
      const current = actionItemsByAgenda.get(item.coachingAgendaId) || { created: 0, completed: 0 };
      current.created++;
      if (item.status === ActionItemStatus.COMPLETED) current.completed++;
      actionItemsByAgenda.set(item.coachingAgendaId, current);
    });

    for (const agenda of agendas) {
      const stats = actionItemsByAgenda.get(agenda.id) || { created: 0, completed: 0 };
      const agendaData = agenda.agenda as any;

      interventions.push({
        id: agenda.id,
        type: 'AGENDA_SESSION',
        repId: agenda.repId,
        repName: userMap.get(agenda.repId) || 'Unknown',
        managerId: agenda.managerId,
        managerName: userMap.get(agenda.managerId) || 'Unknown',
        date: agenda.createdAt.toISOString(),
        duration: 60,
        actionItemsCreated: stats.created,
        actionItemsCompleted: stats.completed,
        keyTopics: agendaData?.sections?.map((s: any) => s.title) || [],
      });
    }

    return interventions;
  }

  /**
   * Calculate before/after metrics for a rep
   */
  private async calculateBeforeAfterMetrics(
    repId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BeforeAfterMetrics> {
    // Find the first coaching intervention in the period
    const firstIntervention = await this.prisma.coachingAgenda.findFirst({
      where: {
        repId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Use the first intervention date as the comparison point, or midpoint of the period
    const comparisonDate = firstIntervention
      ? new Date(firstIntervention.createdAt)
      : new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Before period: comparison window days before the comparison date
    const beforeStart = new Date(
      comparisonDate.getTime() - this.COMPARISON_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const beforeEnd = comparisonDate;

    // After period: comparison date to now (or end date)
    const afterStart = comparisonDate;
    const afterEnd = endDate;

    // Get metrics for both periods
    const beforeMetrics = await this.getPerformanceMetrics(repId, beforeStart, beforeEnd);
    const afterMetrics = await this.getPerformanceMetrics(repId, afterStart, afterEnd);

    // Calculate changes
    const winRateChange = afterMetrics.winRate - beforeMetrics.winRate;
    const avgDealSizeChange = afterMetrics.avgDealSize - beforeMetrics.avgDealSize;
    const activityLevelChange = afterMetrics.activityLevel - beforeMetrics.activityLevel;
    const pipelineCoverageChange = afterMetrics.pipelineCoverage - beforeMetrics.pipelineCoverage;
    const avgCycleTimeChange = afterMetrics.avgCycleTime - beforeMetrics.avgCycleTime;

    return {
      periodLabel: `${beforeStart.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      winRate: afterMetrics.winRate,
      winRateBefore: beforeMetrics.winRate,
      winRateChange,
      winRateChangePercent:
        beforeMetrics.winRate > 0 ? (winRateChange / beforeMetrics.winRate) * 100 : 0,
      avgDealSize: afterMetrics.avgDealSize,
      avgDealSizeBefore: beforeMetrics.avgDealSize,
      avgDealSizeChange,
      avgDealSizeChangePercent:
        beforeMetrics.avgDealSize > 0 ? (avgDealSizeChange / beforeMetrics.avgDealSize) * 100 : 0,
      activityLevel: afterMetrics.activityLevel,
      activityLevelBefore: beforeMetrics.activityLevel,
      activityLevelChange,
      activityLevelChangePercent:
        beforeMetrics.activityLevel > 0
          ? (activityLevelChange / beforeMetrics.activityLevel) * 100
          : 0,
      pipelineCoverage: afterMetrics.pipelineCoverage,
      pipelineCoverageBefore: beforeMetrics.pipelineCoverage,
      pipelineCoverageChange,
      pipelineCoverageChangePercent:
        beforeMetrics.pipelineCoverage > 0
          ? (pipelineCoverageChange / beforeMetrics.pipelineCoverage) * 100
          : 0,
      avgCycleTime: afterMetrics.avgCycleTime,
      avgCycleTimeBefore: beforeMetrics.avgCycleTime,
      avgCycleTimeChange,
      avgCycleTimeChangePercent:
        beforeMetrics.avgCycleTime > 0
          ? (avgCycleTimeChange / beforeMetrics.avgCycleTime) * 100
          : 0,
    };
  }

  /**
   * Get performance metrics for a rep in a given period
   */
  private async getPerformanceMetrics(
    repId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    winRate: number;
    avgDealSize: number;
    activityLevel: number;
    pipelineCoverage: number;
    avgCycleTime: number;
    dealsWon: number;
    dealsLost: number;
    totalRevenue: number;
  }> {
    // Get opportunities in the period
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        ownerId: repId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const wonOpps = opportunities.filter((o) => o.stage === 'CLOSED_WON' || o.isWon);
    const lostOpps = opportunities.filter((o) => o.stage === 'CLOSED_LOST' || (o.isClosed && !o.isWon));
    const openOpps = opportunities.filter((o) => !o.isClosed);

    const totalClosed = wonOpps.length + lostOpps.length;
    const winRate = totalClosed > 0 ? (wonOpps.length / totalClosed) * 100 : 0;

    const totalRevenue = wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    const avgDealSize = wonOpps.length > 0 ? totalRevenue / wonOpps.length : 0;

    // Calculate cycle time for won deals
    let avgCycleTime = 0;
    if (wonOpps.length > 0) {
      const cycleTimes = wonOpps
        .filter((o) => o.closedDate)
        .map((o) => {
          const closed = new Date(o.closedDate!);
          const created = new Date(o.createdAt);
          return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });
      avgCycleTime = cycleTimes.length > 0
        ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
        : 0;
    }

    // Get activity count
    const activities = await this.prisma.activity.count({
      where: {
        userId: repId,
        activityDate: { gte: startDate, lte: endDate },
      },
    });

    // Calculate pipeline coverage
    const pipelineValue = openOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    // Assume quarterly quota = 4x monthly revenue average
    const quotaEstimate = (totalRevenue / Math.max(1, wonOpps.length)) * 3;
    const pipelineCoverage = quotaEstimate > 0 ? (pipelineValue / quotaEstimate) : 0;

    return {
      winRate,
      avgDealSize,
      activityLevel: activities,
      pipelineCoverage,
      avgCycleTime,
      dealsWon: wonOpps.length,
      dealsLost: lostOpps.length,
      totalRevenue,
    };
  }

  /**
   * Get action item statistics for a manager
   */
  private async getActionItemStats(
    managerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ActionItemCompletionMetrics> {
    const actionItems = await this.prisma.coachingActionItem.findMany({
      where: {
        managerId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const completed = actionItems.filter((i) => i.status === ActionItemStatus.COMPLETED);
    const overdue = actionItems.filter((i) => i.isOverdue);

    // Calculate on-time completions
    const onTime = completed.filter(
      (i) => i.completedAt && i.completedAt <= i.dueDate,
    );

    // Group by category
    const categoryMap = new Map<string, { assigned: number; completed: number }>();
    actionItems.forEach((item) => {
      const cat = item.category || 'Uncategorized';
      const current = categoryMap.get(cat) || { assigned: 0, completed: 0 };
      current.assigned++;
      if (item.status === ActionItemStatus.COMPLETED) current.completed++;
      categoryMap.set(cat, current);
    });

    // Group by priority
    const priorityMap = new Map<string, { assigned: number; completed: number }>();
    actionItems.forEach((item) => {
      const pri = item.priority || ActionItemPriority.MEDIUM;
      const current = priorityMap.get(pri) || { assigned: 0, completed: 0 };
      current.assigned++;
      if (item.status === ActionItemStatus.COMPLETED) current.completed++;
      priorityMap.set(pri, current);
    });

    // Calculate average days to complete
    let avgDaysToComplete = 0;
    if (completed.length > 0) {
      const completionTimes = completed
        .filter((i) => i.completedAt)
        .map((i) => {
          const completedAt = new Date(i.completedAt!);
          const created = new Date(i.createdAt);
          return (completedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });
      avgDaysToComplete = completionTimes.length > 0
        ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
        : 0;
    }

    return {
      totalAssigned: actionItems.length,
      totalCompleted: completed.length,
      totalOverdue: overdue.length,
      completionRate:
        actionItems.length > 0 ? (completed.length / actionItems.length) * 100 : 0,
      onTimeRate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0,
      avgDaysToComplete,
      byCategory: Array.from(categoryMap.entries()).map(([category, stats]) => ({
        category,
        assigned: stats.assigned,
        completed: stats.completed,
        completionRate:
          stats.assigned > 0 ? (stats.completed / stats.assigned) * 100 : 0,
      })),
      byPriority: Array.from(priorityMap.entries()).map(([priority, stats]) => ({
        priority,
        assigned: stats.assigned,
        completed: stats.completed,
        completionRate:
          stats.assigned > 0 ? (stats.completed / stats.assigned) * 100 : 0,
      })),
    };
  }

  /**
   * Get action item metrics for a specific rep
   */
  private async getRepActionItemMetrics(
    repId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ActionItemCompletionMetrics> {
    const actionItems = await this.prisma.coachingActionItem.findMany({
      where: {
        repId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const completed = actionItems.filter((i) => i.status === ActionItemStatus.COMPLETED);
    const overdue = actionItems.filter((i) => i.isOverdue);
    const onTime = completed.filter((i) => i.completedAt && i.completedAt <= i.dueDate);

    // Group by category
    const categoryMap = new Map<string, { assigned: number; completed: number }>();
    actionItems.forEach((item) => {
      const cat = item.category || 'Uncategorized';
      const current = categoryMap.get(cat) || { assigned: 0, completed: 0 };
      current.assigned++;
      if (item.status === ActionItemStatus.COMPLETED) current.completed++;
      categoryMap.set(cat, current);
    });

    // Group by priority
    const priorityMap = new Map<string, { assigned: number; completed: number }>();
    actionItems.forEach((item) => {
      const pri = item.priority || ActionItemPriority.MEDIUM;
      const current = priorityMap.get(pri) || { assigned: 0, completed: 0 };
      current.assigned++;
      if (item.status === ActionItemStatus.COMPLETED) current.completed++;
      priorityMap.set(pri, current);
    });

    let avgDaysToComplete = 0;
    if (completed.length > 0) {
      const completionTimes = completed
        .filter((i) => i.completedAt)
        .map((i) => {
          const completedAt = new Date(i.completedAt!);
          const created = new Date(i.createdAt);
          return (completedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });
      avgDaysToComplete = completionTimes.length > 0
        ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
        : 0;
    }

    return {
      totalAssigned: actionItems.length,
      totalCompleted: completed.length,
      totalOverdue: overdue.length,
      completionRate: actionItems.length > 0 ? (completed.length / actionItems.length) * 100 : 0,
      onTimeRate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0,
      avgDaysToComplete,
      byCategory: Array.from(categoryMap.entries()).map(([category, stats]) => ({
        category,
        assigned: stats.assigned,
        completed: stats.completed,
        completionRate: stats.assigned > 0 ? (stats.completed / stats.assigned) * 100 : 0,
      })),
      byPriority: Array.from(priorityMap.entries()).map(([priority, stats]) => ({
        priority,
        assigned: stats.assigned,
        completed: stats.completed,
        completionRate: stats.assigned > 0 ? (stats.completed / stats.assigned) * 100 : 0,
      })),
    };
  }

  /**
   * Get performance trajectory over time
   */
  private async getPerformanceTrajectory(
    managerId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'weekly',
  ): Promise<PerformanceDataPoint[]> {
    const dataPoints: PerformanceDataPoint[] = [];

    // Get all reps managed
    const repIds = await this.prisma.coachingActionItem.findMany({
      where: { managerId },
      select: { repId: true },
      distinct: ['repId'],
    });
    const ids = repIds.map((r) => r.repId);

    // Determine period intervals
    const intervalMs =
      granularity === 'daily'
        ? 24 * 60 * 60 * 1000
        : granularity === 'weekly'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    let currentStart = new Date(startDate);
    while (currentStart < endDate) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + intervalMs, endDate.getTime()));

      // Get aggregate metrics for this period across all reps
      let totalWon = 0;
      let totalLost = 0;
      let totalRevenue = 0;
      let totalActivities = 0;
      let totalPipeline = 0;
      let coachingInterventions = 0;
      let actionItemsCompleted = 0;

      for (const repId of ids) {
        const metrics = await this.getPerformanceMetrics(repId, currentStart, currentEnd);
        totalWon += metrics.dealsWon;
        totalLost += metrics.dealsLost;
        totalRevenue += metrics.totalRevenue;
        totalActivities += metrics.activityLevel;
      }

      // Get coaching interventions in this period
      const interventions = await this.prisma.coachingAgenda.count({
        where: {
          managerId,
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      });
      coachingInterventions = interventions;

      // Get completed action items in this period
      const completedItems = await this.prisma.coachingActionItem.count({
        where: {
          managerId,
          status: ActionItemStatus.COMPLETED,
          completedAt: { gte: currentStart, lte: currentEnd },
        },
      });
      actionItemsCompleted = completedItems;

      const totalClosed = totalWon + totalLost;
      const winRate = totalClosed > 0 ? (totalWon / totalClosed) * 100 : 0;
      const avgDealSize = totalWon > 0 ? totalRevenue / totalWon : 0;

      dataPoints.push({
        period: currentStart.toISOString(),
        winRate,
        avgDealSize,
        activityScore: totalActivities,
        pipelineValue: totalPipeline,
        dealsWon: totalWon,
        dealsLost: totalLost,
        coachingInterventions,
        actionItemsCompleted,
      });

      currentStart = currentEnd;
    }

    return dataPoints;
  }

  /**
   * Get performance trajectory for a specific rep
   */
  private async getRepPerformanceTrajectory(
    repId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'weekly',
  ): Promise<PerformanceDataPoint[]> {
    const dataPoints: PerformanceDataPoint[] = [];

    const intervalMs =
      granularity === 'daily'
        ? 24 * 60 * 60 * 1000
        : granularity === 'weekly'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    let currentStart = new Date(startDate);
    while (currentStart < endDate) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + intervalMs, endDate.getTime()));

      const metrics = await this.getPerformanceMetrics(repId, currentStart, currentEnd);

      // Get coaching interventions
      const interventions = await this.prisma.coachingAgenda.count({
        where: {
          repId,
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      });

      // Get completed action items
      const completedItems = await this.prisma.coachingActionItem.count({
        where: {
          repId,
          status: ActionItemStatus.COMPLETED,
          completedAt: { gte: currentStart, lte: currentEnd },
        },
      });

      dataPoints.push({
        period: currentStart.toISOString(),
        winRate: metrics.winRate,
        avgDealSize: metrics.avgDealSize,
        activityScore: metrics.activityLevel,
        pipelineValue: metrics.pipelineCoverage,
        dealsWon: metrics.dealsWon,
        dealsLost: metrics.dealsLost,
        coachingInterventions: interventions,
        actionItemsCompleted: completedItems,
      });

      currentStart = currentEnd;
    }

    return dataPoints;
  }

  /**
   * Calculate ROI metrics for a rep
   */
  private async calculateRepROI(
    repId: string,
    startDate: Date,
    endDate: Date,
    beforeAfterMetrics: BeforeAfterMetrics,
  ): Promise<CoachingROIMetrics> {
    // Get coaching hours invested
    const agendas = await this.prisma.coachingAgenda.findMany({
      where: {
        repId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });
    const coachingHoursInvested = agendas.length; // Assume 1 hour per session

    // Get revenue from coached deals (deals closed after coaching started)
    const firstCoaching = agendas.length > 0 ? agendas[0].createdAt : startDate;
    const coachedDeals = await this.prisma.opportunity.findMany({
      where: {
        ownerId: repId,
        closedDate: { gte: firstCoaching, lte: endDate },
        isWon: true,
      },
    });

    const revenueFromCoachedDeals = coachedDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Calculate additional deals won (based on win rate improvement)
    const winRateImprovement = beforeAfterMetrics.winRateChange;
    const totalDealsWorked = await this.prisma.opportunity.count({
      where: {
        ownerId: repId,
        closedDate: { gte: firstCoaching, lte: endDate },
        isClosed: true,
      },
    });

    const additionalDealsWon = Math.round((winRateImprovement / 100) * totalDealsWorked);

    // Calculate revenue influenced
    const avgDealSizeIncrease = beforeAfterMetrics.avgDealSizeChange;
    const totalRevenueInfluenced =
      revenueFromCoachedDeals + additionalDealsWon * beforeAfterMetrics.avgDealSize;

    // Calculate ROI
    const coachingCost = coachingHoursInvested * 150; // $150/hr
    const estimatedROI = coachingCost > 0 ? totalRevenueInfluenced / coachingCost : 0;

    return {
      totalRevenueInfluenced,
      revenueFromCoachedDeals,
      avgDealSizeIncrease,
      avgDealSizeIncreasePercent: beforeAfterMetrics.avgDealSizeChangePercent,
      additionalDealsWon,
      winRateImprovement,
      winRateImprovementPercent: beforeAfterMetrics.winRateChangePercent,
      cycleTimeReduction: -beforeAfterMetrics.avgCycleTimeChange, // Negative change = reduction
      cycleTimeReductionPercent: -beforeAfterMetrics.avgCycleTimeChangePercent,
      activityIncrease: beforeAfterMetrics.activityLevelChange,
      activityIncreasePercent: beforeAfterMetrics.activityLevelChangePercent,
      estimatedROI,
      coachingHoursInvested,
      revenuePerCoachingHour:
        coachingHoursInvested > 0 ? totalRevenueInfluenced / coachingHoursInvested : 0,
    };
  }

  /**
   * Calculate overall effectiveness for a rep
   */
  private async calculateRepEffectiveness(
    repId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RepEffectivenessSummary | null> {
    try {
      const rep = await this.prisma.user.findUnique({
        where: { id: repId },
        select: { id: true, name: true, email: true },
      });

      if (!rep) return null;

      // Get coaching sessions count
      const sessions = await this.prisma.coachingAgenda.count({
        where: {
          repId,
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      // Get last coaching date
      const lastCoaching = await this.prisma.coachingAgenda.findFirst({
        where: { repId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      // Get before/after metrics
      const beforeAfter = await this.calculateBeforeAfterMetrics(repId, startDate, endDate);

      // Get action item metrics
      const actionItems = await this.getRepActionItemMetrics(repId, startDate, endDate);

      // Calculate trend
      const trendScore = this.calculateTrendScore(beforeAfter);
      const performanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' =
        trendScore > 10 ? 'IMPROVING' : trendScore < -10 ? 'DECLINING' : 'STABLE';

      // Calculate revenue influenced
      const roiMetrics = await this.calculateRepROI(repId, startDate, endDate, beforeAfter);

      // Calculate months in period
      const monthsInPeriod = Math.max(
        1,
        (endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000),
      );

      return {
        repId,
        repName: rep.name || rep.email || 'Unknown',
        email: rep.email,
        totalCoachingSessions: sessions,
        lastCoachingDate: lastCoaching?.createdAt.toISOString(),
        avgSessionsPerMonth: sessions / monthsInPeriod,
        currentWinRate: beforeAfter.winRate,
        winRateChange: beforeAfter.winRateChange,
        currentAvgDealSize: beforeAfter.avgDealSize,
        avgDealSizeChange: beforeAfter.avgDealSizeChange,
        actionItemCompletionRate: actionItems.completionRate,
        onTimeCompletionRate: actionItems.onTimeRate,
        performanceTrend,
        trendScore,
        revenueInfluenced: roiMetrics.totalRevenueInfluenced,
        estimatedCoachingImpact: roiMetrics.estimatedROI,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate effectiveness for rep ${repId}:`, error);
      return null;
    }
  }

  /**
   * Calculate trend score from before/after metrics
   */
  private calculateTrendScore(metrics: BeforeAfterMetrics): number {
    // Weight different metrics to compute overall trend score (-100 to 100)
    const winRateWeight = 0.4;
    const dealSizeWeight = 0.3;
    const activityWeight = 0.2;
    const cycleTimeWeight = 0.1;

    // Normalize changes to -100 to 100 scale
    const normalizedWinRate = Math.max(-100, Math.min(100, metrics.winRateChangePercent));
    const normalizedDealSize = Math.max(-100, Math.min(100, metrics.avgDealSizeChangePercent));
    const normalizedActivity = Math.max(-100, Math.min(100, metrics.activityLevelChangePercent));
    // For cycle time, negative change is good
    const normalizedCycleTime = Math.max(-100, Math.min(100, -metrics.avgCycleTimeChangePercent));

    return (
      normalizedWinRate * winRateWeight +
      normalizedDealSize * dealSizeWeight +
      normalizedActivity * activityWeight +
      normalizedCycleTime * cycleTimeWeight
    );
  }

  /**
   * Get coaching statistics for a manager
   */
  private async getCoachingStats(
    managerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalSessions: number; totalHours: number }> {
    const agendas = await this.prisma.coachingAgenda.count({
      where: {
        managerId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      totalSessions: agendas,
      totalHours: agendas, // Assume 1 hour per session
    };
  }

  /**
   * Get default rep summary for reps with no data
   */
  private getDefaultRepSummary(repId: string, repName: string): RepEffectivenessSummary {
    return {
      repId,
      repName,
      totalCoachingSessions: 0,
      avgSessionsPerMonth: 0,
      currentWinRate: 0,
      winRateChange: 0,
      currentAvgDealSize: 0,
      avgDealSizeChange: 0,
      actionItemCompletionRate: 0,
      onTimeCompletionRate: 0,
      performanceTrend: 'STABLE',
      trendScore: 0,
      revenueInfluenced: 0,
      estimatedCoachingImpact: 0,
    };
  }
}
