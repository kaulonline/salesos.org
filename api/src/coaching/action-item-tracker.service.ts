/**
 * Action Item Tracker Service
 *
 * Tracks action items from coaching sessions and 1:1 meetings.
 * Detects slippage and generates alerts when items are overdue.
 * Supports escalation paths for persistent issues.
 *
 * Part of Phase 2 Vertiv O2O Journey - AI-Enabled Sales Coaching
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import {
  ActionItemStatus,
  ActionItemPriority,
  ActionItemSourceType,
  SlippageReason,
  EscalationLevel,
  SlippageAlertType,
  Prisma,
} from '@prisma/client';
import {
  CreateActionItemDto,
  CreateActionItemFromAgendaDto,
  UpdateActionItemStatusDto,
  UpdateActionItemDto,
  GetActionItemsQueryDto,
  ActionItemResponse,
  SlippageReportResponse,
  ActionItemProgressResponse,
} from './dto/action-item.dto';

@Injectable()
export class ActionItemTrackerService {
  private readonly logger = new Logger(ActionItemTrackerService.name);

  // Escalation thresholds (in days)
  private readonly MANAGER_ESCALATION_DAYS = 3;
  private readonly SKIP_LEVEL_ESCALATION_DAYS = 7;
  private readonly EXECUTIVE_ESCALATION_DAYS = 14;

  // Pattern detection thresholds
  private readonly PATTERN_THRESHOLD_COUNT = 3; // 3+ missed items indicates a pattern
  private readonly PATTERN_THRESHOLD_DAYS = 30; // within 30 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationScheduler: NotificationSchedulerService,
    private readonly anthropicService: AnthropicService,
  ) {}

  // ==================== CRUD OPERATIONS ====================

  /**
   * Create a new action item
   */
  async createActionItem(
    managerId: string,
    dto: CreateActionItemDto,
  ): Promise<ActionItemResponse> {
    this.logger.log(`Creating action item for rep ${dto.repId}: ${dto.title}`);

    const actionItem = await this.prisma.coachingActionItem.create({
      data: {
        repId: dto.repId,
        managerId,
        sourceType: dto.sourceType || ActionItemSourceType.MANUAL,
        coachingAgendaId: dto.coachingAgendaId,
        meetingSessionId: dto.meetingSessionId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority || ActionItemPriority.MEDIUM,
        status: ActionItemStatus.PENDING,
        dueDate: new Date(dto.dueDate),
        aiRecommendation: dto.aiRecommendation,
        impactScore: dto.impactScore,
      },
    });

    // Send notification to rep
    await this.notificationScheduler.sendSystemNotification(
      dto.repId,
      'New Action Item Assigned',
      `${dto.title} - Due: ${new Date(dto.dueDate).toLocaleDateString()}`,
      {
        type: 'ACTION_ITEM',
        priority: dto.priority === ActionItemPriority.URGENT ? 'HIGH' : 'NORMAL',
        action: 'view_action_item',
        actionData: { actionItemId: actionItem.id },
      },
    );

    return this.mapToResponse(actionItem);
  }

  /**
   * Create action items from a coaching agenda
   */
  async createFromAgenda(
    managerId: string,
    dto: CreateActionItemFromAgendaDto,
  ): Promise<ActionItemResponse[]> {
    // Get the agenda to find the rep
    const agenda = await this.prisma.coachingAgenda.findUnique({
      where: { id: dto.coachingAgendaId },
    });

    if (!agenda) {
      throw new NotFoundException('Coaching agenda not found');
    }

    const createdItems: ActionItemResponse[] = [];

    for (const item of dto.actionItems) {
      const actionItem = await this.createActionItem(managerId, {
        repId: agenda.repId,
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        dueDate: item.dueDate,
        sourceType: ActionItemSourceType.COACHING_AGENDA,
        coachingAgendaId: dto.coachingAgendaId,
      });
      createdItems.push(actionItem);
    }

    return createdItems;
  }

  /**
   * Get action items with filtering
   */
  async getActionItems(
    query: GetActionItemsQueryDto,
  ): Promise<{ items: ActionItemResponse[]; total: number; page: number; pageSize: number }> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CoachingActionItemWhereInput = {};

    if (query.repId) where.repId = query.repId;
    if (query.managerId) where.managerId = query.managerId;
    if (query.status) where.status = query.status;
    if (query.isOverdue !== undefined) where.isOverdue = query.isOverdue;
    if (query.escalationLevel) where.escalationLevel = query.escalationLevel;
    if (query.dueBefore || query.dueAfter) {
      where.dueDate = {};
      if (query.dueBefore) where.dueDate.lte = new Date(query.dueBefore);
      if (query.dueAfter) where.dueDate.gte = new Date(query.dueAfter);
    }

    const [items, total] = await Promise.all([
      this.prisma.coachingActionItem.findMany({
        where,
        orderBy: [{ isOverdue: 'desc' }, { dueDate: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.coachingActionItem.count({ where }),
    ]);

    // Get user names for the items
    const userIdSet = new Set<string>();
    items.forEach((i) => {
      userIdSet.add(i.repId);
      userIdSet.add(i.managerId);
    });
    const userIds = Array.from(userIdSet);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

    return {
      items: items.map((item) => ({
        ...this.mapToResponse(item),
        repName: userMap.get(item.repId),
        managerName: userMap.get(item.managerId),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single action item by ID
   */
  async getActionItemById(id: string): Promise<ActionItemResponse> {
    const item = await this.prisma.coachingActionItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Action item not found');
    }

    return this.mapToResponse(item);
  }

  /**
   * Update action item status
   */
  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateActionItemStatusDto,
  ): Promise<ActionItemResponse> {
    const item = await this.prisma.coachingActionItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Action item not found');
    }

    const updateData: Prisma.CoachingActionItemUpdateInput = {
      status: dto.status,
    };

    // Handle completion
    if (dto.status === ActionItemStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.completionNotes = dto.completionNotes;
      updateData.completionEvidence = dto.completionEvidence as Prisma.InputJsonValue;
      updateData.isOverdue = false;
    }

    // Handle slippage reason (for overdue or blocked items)
    if (dto.slippageReason) {
      updateData.slippageReason = dto.slippageReason;
      updateData.slippageNotes = dto.slippageNotes;
    }

    const updated = await this.prisma.coachingActionItem.update({
      where: { id },
      data: updateData,
    });

    // If completed, notify manager
    if (dto.status === ActionItemStatus.COMPLETED) {
      await this.notificationScheduler.sendSystemNotification(
        item.managerId,
        'Action Item Completed',
        `${item.repId} completed: ${item.title}`,
        {
          type: 'ACTION_ITEM_COMPLETED',
          action: 'view_action_item',
          actionData: { actionItemId: id },
        },
      );
    }

    return this.mapToResponse(updated);
  }

  /**
   * Update action item details
   */
  async updateActionItem(
    id: string,
    userId: string,
    dto: UpdateActionItemDto,
  ): Promise<ActionItemResponse> {
    const item = await this.prisma.coachingActionItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Action item not found');
    }

    // Only manager can update
    if (item.managerId !== userId) {
      throw new BadRequestException('Only the assigning manager can update this item');
    }

    const updated = await this.prisma.coachingActionItem.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete an action item
   */
  async deleteActionItem(id: string, userId: string): Promise<void> {
    const item = await this.prisma.coachingActionItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Action item not found');
    }

    if (item.managerId !== userId) {
      throw new BadRequestException('Only the assigning manager can delete this item');
    }

    await this.prisma.coachingActionItem.delete({
      where: { id },
    });
  }

  // ==================== SLIPPAGE DETECTION ====================

  /**
   * Check for overdue items and update status
   * Runs every 15 minutes
   */
  @Cron('0 */15 * * * *')
  async checkSlippage(): Promise<void> {
    const now = new Date();
    this.logger.log('Checking for overdue action items...');

    // Find items that are past due and not completed
    const overdueItems = await this.prisma.coachingActionItem.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: [ActionItemStatus.PENDING, ActionItemStatus.IN_PROGRESS] },
        isOverdue: false,
      },
    });

    for (const item of overdueItems) {
      const daysOverdue = Math.floor(
        (now.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      await this.prisma.coachingActionItem.update({
        where: { id: item.id },
        data: {
          status: ActionItemStatus.OVERDUE,
          isOverdue: true,
          daysOverdue,
        },
      });

      // Create slippage alert
      await this.createSlippageAlert(item, daysOverdue);
    }

    // Update days overdue for already overdue items
    const existingOverdue = await this.prisma.coachingActionItem.findMany({
      where: {
        isOverdue: true,
        status: { notIn: [ActionItemStatus.COMPLETED, ActionItemStatus.CANCELLED] },
      },
    });

    for (const item of existingOverdue) {
      const daysOverdue = Math.floor(
        (now.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOverdue !== item.daysOverdue) {
        await this.prisma.coachingActionItem.update({
          where: { id: item.id },
          data: { daysOverdue },
        });

        // Check if escalation needed
        await this.checkEscalation(item, daysOverdue);
      }
    }

    this.logger.log(`Processed ${overdueItems.length} newly overdue items`);
  }

  /**
   * Create a slippage alert
   */
  private async createSlippageAlert(
    item: any,
    daysOverdue: number,
  ): Promise<void> {
    // Get rep info for alert message
    const rep = await this.prisma.user.findUnique({
      where: { id: item.repId },
      select: { name: true, email: true },
    });

    const repName = rep?.name || rep?.email || 'Unknown Rep';

    const alert = await this.prisma.slippageAlert.create({
      data: {
        actionItemId: item.id,
        recipientId: item.managerId,
        alertType: SlippageAlertType.ITEM_OVERDUE,
        escalationLevel: EscalationLevel.MANAGER,
        title: `Action Item Overdue: ${item.title}`,
        message: `${repName}'s action item "${item.title}" is ${daysOverdue} day(s) overdue.`,
        actionUrl: `/coaching/action-items/${item.id}`,
        sentAt: new Date(),
      },
    });

    // Send notification to manager
    await this.notificationScheduler.sendSystemNotification(
      item.managerId,
      'Action Item Overdue',
      `${repName}: "${item.title}" is ${daysOverdue} day(s) overdue`,
      {
        type: 'SLIPPAGE_ALERT',
        priority: daysOverdue > 3 ? 'HIGH' : 'NORMAL',
        action: 'view_action_item',
        actionData: { actionItemId: item.id, alertId: alert.id },
      },
    );
  }

  /**
   * Check if escalation is needed based on days overdue
   */
  private async checkEscalation(item: any, daysOverdue: number): Promise<void> {
    let newEscalationLevel: EscalationLevel | null = null;

    if (daysOverdue >= this.EXECUTIVE_ESCALATION_DAYS && item.escalationLevel !== EscalationLevel.EXECUTIVE) {
      newEscalationLevel = EscalationLevel.EXECUTIVE;
    } else if (daysOverdue >= this.SKIP_LEVEL_ESCALATION_DAYS &&
               item.escalationLevel !== EscalationLevel.SKIP_LEVEL &&
               item.escalationLevel !== EscalationLevel.EXECUTIVE) {
      newEscalationLevel = EscalationLevel.SKIP_LEVEL;
    } else if (daysOverdue >= this.MANAGER_ESCALATION_DAYS &&
               item.escalationLevel === EscalationLevel.NONE) {
      newEscalationLevel = EscalationLevel.MANAGER;
    }

    if (newEscalationLevel) {
      await this.escalateItem(item.id, newEscalationLevel);
    }
  }

  /**
   * Manually escalate an action item
   */
  async escalateItem(
    id: string,
    level: EscalationLevel,
    escalateTo?: string,
    reason?: string,
  ): Promise<ActionItemResponse> {
    const item = await this.prisma.coachingActionItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Action item not found');
    }

    // Build escalation history
    const escalationHistory = (item.escalationHistory as any[]) || [];
    escalationHistory.push({
      level,
      escalatedAt: new Date().toISOString(),
      escalatedTo: escalateTo,
      reason,
    });

    const updated = await this.prisma.coachingActionItem.update({
      where: { id },
      data: {
        escalationLevel: level,
        escalatedAt: new Date(),
        escalatedTo: escalateTo,
        escalationHistory,
      },
    });

    // Get the escalation recipient
    let recipientId: string | undefined = escalateTo;
    if (!recipientId) {
      // Find the appropriate escalation recipient
      const foundRecipient = await this.findEscalationRecipient(item.managerId, level);
      recipientId = foundRecipient || undefined;
    }

    if (recipientId) {
      // Create escalation alert
      await this.prisma.slippageAlert.create({
        data: {
          actionItemId: id,
          recipientId,
          alertType: SlippageAlertType.ESCALATION_NOTICE,
          escalationLevel: level,
          title: `Escalation: ${item.title}`,
          message: `Action item has been escalated to ${level} level. ${reason || ''}`,
          actionUrl: `/coaching/action-items/${id}`,
          sentAt: new Date(),
        },
      });

      // Send notification
      await this.notificationScheduler.sendSystemNotification(
        recipientId,
        `Action Item Escalation - ${level}`,
        `"${item.title}" has been escalated and requires attention`,
        {
          type: 'ESCALATION',
          priority: 'HIGH',
          action: 'view_action_item',
          actionData: { actionItemId: id },
        },
      );
    }

    return this.mapToResponse(updated);
  }

  /**
   * Find the appropriate escalation recipient
   */
  private async findEscalationRecipient(
    managerId: string,
    level: EscalationLevel,
  ): Promise<string | null> {
    // For now, we'll find users by role
    // In a real implementation, this would use an org hierarchy
    let targetRole: string;

    switch (level) {
      case EscalationLevel.MANAGER:
        return managerId;
      case EscalationLevel.SKIP_LEVEL:
        targetRole = 'ADMIN'; // Or could be 'SENIOR_MANAGER'
        break;
      case EscalationLevel.EXECUTIVE:
        targetRole = 'ADMIN';
        break;
      default:
        return managerId;
    }

    const user = await this.prisma.user.findFirst({
      where: { role: targetRole as any, status: 'ACTIVE' },
      select: { id: true },
    });

    return user?.id || managerId;
  }

  // ==================== PATTERN DETECTION ====================

  /**
   * Detect patterns of missed deadlines for a rep
   * Runs daily at 6 AM
   */
  @Cron('0 6 * * *')
  async detectPatterns(): Promise<void> {
    this.logger.log('Running pattern detection for slippage...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.PATTERN_THRESHOLD_DAYS);

    // Group overdue items by rep
    const overdueByRep = await this.prisma.coachingActionItem.groupBy({
      by: ['repId'],
      where: {
        isOverdue: true,
        createdAt: { gte: cutoffDate },
        status: { notIn: [ActionItemStatus.COMPLETED, ActionItemStatus.CANCELLED] },
      },
      _count: { id: true },
    });

    for (const repData of overdueByRep) {
      if (repData._count.id >= this.PATTERN_THRESHOLD_COUNT) {
        // Pattern detected - notify manager
        const items = await this.prisma.coachingActionItem.findMany({
          where: {
            repId: repData.repId,
            isOverdue: true,
            status: { notIn: [ActionItemStatus.COMPLETED, ActionItemStatus.CANCELLED] },
          },
          take: 1,
        });

        if (items.length > 0) {
          const rep = await this.prisma.user.findUnique({
            where: { id: repData.repId },
            select: { name: true, email: true },
          });

          const repName = rep?.name || rep?.email || 'Rep';

          await this.prisma.slippageAlert.create({
            data: {
              actionItemId: items[0].id,
              recipientId: items[0].managerId,
              alertType: SlippageAlertType.PATTERN_DETECTED,
              escalationLevel: EscalationLevel.MANAGER,
              title: `Pattern Detected: ${repName}`,
              message: `${repName} has ${repData._count.id} overdue action items in the last ${this.PATTERN_THRESHOLD_DAYS} days. This may indicate a coaching opportunity.`,
              actionUrl: `/coaching/action-items?repId=${repData.repId}&isOverdue=true`,
              sentAt: new Date(),
            },
          });

          await this.notificationScheduler.sendSystemNotification(
            items[0].managerId,
            'Slippage Pattern Detected',
            `${repName} has ${repData._count.id} overdue items - review recommended`,
            {
              type: 'PATTERN_ALERT',
              priority: 'HIGH',
              action: 'view_slippage_report',
              actionData: { repId: repData.repId },
            },
          );
        }
      }
    }
  }

  // ==================== REPORTING ====================

  /**
   * Get comprehensive slippage report
   */
  async getSlippageReport(
    managerId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SlippageReportResponse> {
    const now = endDate || new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: Prisma.CoachingActionItemWhereInput = {
      createdAt: { gte: start, lte: now },
    };
    if (managerId) where.managerId = managerId;

    // Get all items in period
    const allItems = await this.prisma.coachingActionItem.findMany({
      where,
    });

    // Calculate summary
    const completed = allItems.filter((i) => i.status === ActionItemStatus.COMPLETED);
    const completedOnTime = completed.filter(
      (i) => i.completedAt && i.completedAt <= i.dueDate,
    );
    const completedLate = completed.filter(
      (i) => i.completedAt && i.completedAt > i.dueDate,
    );
    const currentlyOverdue = allItems.filter((i) => i.isOverdue);

    const avgDaysOverdue = currentlyOverdue.length > 0
      ? currentlyOverdue.reduce((sum, i) => sum + i.daysOverdue, 0) / currentlyOverdue.length
      : 0;

    // Get user info
    const userIdSet = new Set(allItems.map((i) => i.repId));
    const userIds = Array.from(userIdSet);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email || 'Unknown']));

    // By rep analysis
    const byRep = userIds.map((repId) => {
      const repItems = allItems.filter((i) => i.repId === repId);
      const repCompleted = repItems.filter((i) => i.status === ActionItemStatus.COMPLETED);
      const repOverdue = repItems.filter((i) => i.isOverdue);

      const avgDays = repCompleted.length > 0
        ? repCompleted.reduce((sum, i) => {
            if (i.completedAt) {
              return sum + (i.completedAt.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            }
            return sum;
          }, 0) / repCompleted.length
        : 0;

      return {
        repId,
        repName: userMap.get(repId) || 'Unknown',
        totalItems: repItems.length,
        completed: repCompleted.length,
        overdue: repOverdue.length,
        overdueItems: repOverdue.map((i) => this.mapToResponse(i)),
        completionRate: repItems.length > 0 ? (repCompleted.length / repItems.length) * 100 : 0,
        averageDaysToComplete: Math.round(avgDays),
      };
    });

    // By category analysis
    const categorySet = new Set(allItems.map((i) => i.category || 'Uncategorized'));
    const categories = Array.from(categorySet);
    const byCategory = categories.map((category) => {
      const catItems = allItems.filter((i) => (i.category || 'Uncategorized') === category);
      const catCompleted = catItems.filter((i) => i.status === ActionItemStatus.COMPLETED);
      const catOverdue = catItems.filter((i) => i.isOverdue);

      return {
        category,
        totalItems: catItems.length,
        completed: catCompleted.length,
        overdue: catOverdue.length,
        completionRate: catItems.length > 0 ? (catCompleted.length / catItems.length) * 100 : 0,
      };
    });

    // By slippage reason
    const slippageReasons = completed.filter((i) => i.slippageReason);
    const reasonCounts = new Map<SlippageReason, number>();
    for (const item of slippageReasons) {
      if (item.slippageReason) {
        reasonCounts.set(
          item.slippageReason,
          (reasonCounts.get(item.slippageReason) || 0) + 1,
        );
      }
    }

    const totalWithReason = slippageReasons.length || 1;
    const bySlippageReason = Array.from(reasonCounts.entries()).map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / totalWithReason) * 100,
    }));

    // Escalation stats
    const escalatedItems = allItems.filter((i) => i.escalationLevel !== EscalationLevel.NONE);
    const escalationByLevel = new Map<EscalationLevel, number>();
    for (const item of escalatedItems) {
      escalationByLevel.set(
        item.escalationLevel,
        (escalationByLevel.get(item.escalationLevel) || 0) + 1,
      );
    }

    // Calculate weekly trends
    const trends: Array<{
      period: string;
      completedOnTime: number;
      completedLate: number;
      stillOverdue: number;
    }> = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    let weekStart = start;
    while (weekStart < now) {
      const weekEnd = new Date(weekStart.getTime() + weekMs);
      const weekItems = allItems.filter(
        (i) => i.createdAt >= weekStart && i.createdAt < weekEnd,
      );
      const weekCompletedOnTime = weekItems.filter(
        (i) => i.status === ActionItemStatus.COMPLETED && i.completedAt && i.completedAt <= i.dueDate,
      );
      const weekCompletedLate = weekItems.filter(
        (i) => i.status === ActionItemStatus.COMPLETED && i.completedAt && i.completedAt > i.dueDate,
      );
      const weekStillOverdue = weekItems.filter((i) => i.isOverdue);

      trends.push({
        period: weekStart.toISOString().split('T')[0],
        completedOnTime: weekCompletedOnTime.length,
        completedLate: weekCompletedLate.length,
        stillOverdue: weekStillOverdue.length,
      });

      weekStart = weekEnd;
    }

    return {
      summary: {
        totalActionItems: allItems.length,
        completedOnTime: completedOnTime.length,
        completedLate: completedLate.length,
        currentlyOverdue: currentlyOverdue.length,
        averageDaysOverdue: Math.round(avgDaysOverdue * 10) / 10,
        onTimeCompletionRate: completed.length > 0
          ? Math.round((completedOnTime.length / completed.length) * 100)
          : 0,
      },
      byRep: byRep.sort((a, b) => b.overdue - a.overdue),
      byCategory: byCategory.sort((a, b) => b.totalItems - a.totalItems),
      bySlippageReason,
      trends,
      escalationStats: {
        totalEscalations: escalatedItems.length,
        byLevel: Object.fromEntries(escalationByLevel) as Record<EscalationLevel, number>,
        averageTimeToEscalation: 0, // Would need more data to calculate
      },
    };
  }

  /**
   * Get progress report for a specific rep
   */
  async getRepProgress(
    repId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ActionItemProgressResponse> {
    const now = endDate || new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const items = await this.prisma.coachingActionItem.findMany({
      where: {
        repId,
        createdAt: { gte: start, lte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rep = await this.prisma.user.findUnique({
      where: { id: repId },
      select: { name: true, email: true },
    });

    const completed = items.filter((i) => i.status === ActionItemStatus.COMPLETED);
    const inProgress = items.filter((i) => i.status === ActionItemStatus.IN_PROGRESS);
    const overdue = items.filter((i) => i.isOverdue);
    const blocked = items.filter((i) => i.status === ActionItemStatus.BLOCKED);
    const completedOnTime = completed.filter(
      (i) => i.completedAt && i.completedAt <= i.dueDate,
    );

    // By priority
    const priorities = [
      ActionItemPriority.URGENT,
      ActionItemPriority.HIGH,
      ActionItemPriority.MEDIUM,
      ActionItemPriority.LOW,
    ];
    const byPriority = priorities.map((priority) => {
      const priorityItems = items.filter((i) => i.priority === priority);
      return {
        priority,
        total: priorityItems.length,
        completed: priorityItems.filter((i) => i.status === ActionItemStatus.COMPLETED).length,
        overdue: priorityItems.filter((i) => i.isOverdue).length,
      };
    });

    // Recent activity (last 10 status changes)
    const recentActivity = items
      .filter((i) => i.status === ActionItemStatus.COMPLETED)
      .slice(0, 10)
      .map((i) => ({
        date: i.completedAt?.toISOString() || i.updatedAt.toISOString(),
        action: 'Completed',
        itemTitle: i.title,
      }));

    return {
      repId,
      repName: rep?.name || rep?.email || 'Unknown',
      period: {
        start: start.toISOString(),
        end: now.toISOString(),
      },
      metrics: {
        totalAssigned: items.length,
        completed: completed.length,
        inProgress: inProgress.length,
        overdue: overdue.length,
        blocked: blocked.length,
        completionRate: items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0,
        onTimeRate: completed.length > 0 ? Math.round((completedOnTime.length / completed.length) * 100) : 0,
      },
      byPriority,
      recentActivity,
    };
  }

  // ==================== AI RECOMMENDATIONS ====================

  /**
   * Generate AI recommendations for completing an action item
   */
  async generateAIRecommendation(id: string): Promise<string> {
    const item = await this.prisma.coachingActionItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Action item not found');
    }

    // Get rep's context (recent completed items, patterns)
    const recentCompleted = await this.prisma.coachingActionItem.findMany({
      where: {
        repId: item.repId,
        status: ActionItemStatus.COMPLETED,
        category: item.category,
      },
      take: 5,
      orderBy: { completedAt: 'desc' },
    });

    const prompt = `You are a sales coaching assistant. A sales rep needs help completing an action item.

ACTION ITEM:
Title: ${item.title}
Description: ${item.description || 'No description provided'}
Category: ${item.category || 'General'}
Priority: ${item.priority}
Due Date: ${item.dueDate.toLocaleDateString()}
Days Overdue: ${item.isOverdue ? item.daysOverdue : 0}

${recentCompleted.length > 0 ? `
SIMILAR COMPLETED ITEMS:
${recentCompleted.map((i) => `- ${i.title}: ${i.completionNotes || 'No notes'}`).join('\n')}
` : ''}

Provide a brief, actionable recommendation (2-3 sentences) to help the rep complete this action item effectively. Focus on practical steps they can take today.`;

    try {
      const response = await this.anthropicService.generateChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 200,
      });

      // Update the item with the recommendation
      await this.prisma.coachingActionItem.update({
        where: { id },
        data: { aiRecommendation: response },
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to generate AI recommendation', error);
      return 'Unable to generate recommendation at this time. Please review the action item details and reach out to your manager for guidance.';
    }
  }

  // ==================== REMINDERS ====================

  /**
   * Send reminders for upcoming due items
   * Runs daily at 8 AM
   */
  @Cron('0 8 * * *')
  async sendReminders(): Promise<void> {
    this.logger.log('Sending action item reminders...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find items due within next 24 hours that haven't been reminded
    const upcomingItems = await this.prisma.coachingActionItem.findMany({
      where: {
        dueDate: { gte: today, lte: tomorrow },
        status: { in: [ActionItemStatus.PENDING, ActionItemStatus.IN_PROGRESS] },
        reminderSent: false,
      },
    });

    for (const item of upcomingItems) {
      await this.notificationScheduler.sendSystemNotification(
        item.repId,
        'Action Item Due Soon',
        `"${item.title}" is due ${item.dueDate.toLocaleDateString()}`,
        {
          type: 'ACTION_ITEM_REMINDER',
          priority: item.priority === ActionItemPriority.URGENT ? 'HIGH' : 'NORMAL',
          action: 'view_action_item',
          actionData: { actionItemId: item.id },
        },
      );

      await this.prisma.coachingActionItem.update({
        where: { id: item.id },
        data: { reminderSent: true, lastRemindedAt: new Date() },
      });
    }

    this.logger.log(`Sent ${upcomingItems.length} reminders`);
  }

  // ==================== HELPER METHODS ====================

  private mapToResponse(item: any): ActionItemResponse {
    return {
      id: item.id,
      repId: item.repId,
      managerId: item.managerId,
      sourceType: item.sourceType,
      coachingAgendaId: item.coachingAgendaId,
      meetingSessionId: item.meetingSessionId,
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      status: item.status,
      dueDate: item.dueDate.toISOString(),
      completedAt: item.completedAt?.toISOString(),
      isOverdue: item.isOverdue,
      daysOverdue: item.daysOverdue,
      slippageReason: item.slippageReason,
      slippageNotes: item.slippageNotes,
      escalationLevel: item.escalationLevel,
      escalatedAt: item.escalatedAt?.toISOString(),
      completionNotes: item.completionNotes,
      aiRecommendation: item.aiRecommendation,
      impactScore: item.impactScore,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
