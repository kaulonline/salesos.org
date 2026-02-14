/**
 * AI Insights Controller
 * Provides AI-powered insights for the dashboard
 */

import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

interface AIInsight {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityType?: 'lead' | 'contact' | 'deal' | 'meeting' | 'task';
  entityId?: string;
  entityName?: string;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
  dismissed?: boolean;
}

interface InsightsResponse {
  insights: AIInsight[];
  summary: {
    atRiskDeals: number;
    hotLeads: number;
    upcomingFollowUps: number;
    meetingsNeedingPrep: number;
  };
  lastUpdated: string;
}

@ApiTags('AI')
@ApiBearerAuth('JWT')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('insights')
  async getInsights(@Request() req): Promise<InsightsResponse> {
    const userId = req.user.userId;
    const now = new Date();
    const insights: AIInsight[] = [];

    try {
      // 1. Get at-risk deals (no update in 14+ days, still open)
      const atRiskDeals = await this.prisma.opportunity.findMany({
        where: {
          ownerId: userId,
          isClosed: false,
          updatedAt: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { amount: 'desc' },
        take: 5,
        include: { account: true },
      });

      atRiskDeals.forEach((deal) => {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        insights.push({
          id: `at_risk_${deal.id}`,
          type: 'at_risk_deal',
          priority: daysSinceUpdate > 21 ? 'high' : 'medium',
          title: `Deal at risk: ${deal.name}`,
          description: `No activity for ${daysSinceUpdate} days. ${deal.account?.name ? `Account: ${deal.account.name}` : ''}`,
          entityType: 'deal',
          entityId: deal.id,
          entityName: deal.name,
          actionLabel: 'View Deal',
          actionUrl: `/dashboard/deals/${deal.id}`,
          metadata: { amount: deal.amount, stage: deal.stage, daysSinceUpdate },
          createdAt: now.toISOString(),
        });
      });

      // 2. Get hot leads (high score or HOT rating)
      const hotLeads = await this.prisma.lead.findMany({
        where: {
          ownerId: userId,
          status: { notIn: ['CONVERTED', 'LOST'] },
          OR: [{ leadScore: { gte: 80 } }, { rating: 'HOT' }],
        },
        orderBy: { leadScore: 'desc' },
        take: 5,
      });

      hotLeads.forEach((lead) => {
        insights.push({
          id: `hot_lead_${lead.id}`,
          type: 'hot_lead',
          priority: (lead.leadScore || 0) >= 90 ? 'high' : 'medium',
          title: `Hot lead: ${lead.firstName} ${lead.lastName}`,
          description: `${lead.company || 'Unknown company'} - Score: ${lead.leadScore || 'N/A'}`,
          entityType: 'lead',
          entityId: lead.id,
          entityName: `${lead.firstName} ${lead.lastName}`,
          actionLabel: 'Contact Now',
          actionUrl: `/dashboard/leads/${lead.id}`,
          metadata: { score: lead.leadScore, company: lead.company, source: lead.leadSource },
          createdAt: now.toISOString(),
        });
      });

      // 3. Get stale opportunities (close date passed but not closed)
      const staleOpportunities = await this.prisma.opportunity.findMany({
        where: {
          ownerId: userId,
          isClosed: false,
          closeDate: { lt: now },
        },
        orderBy: { closeDate: 'asc' },
        take: 5,
        include: { account: true },
      });

      staleOpportunities.forEach((opp) => {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(opp.closeDate!).getTime()) / (1000 * 60 * 60 * 24)
        );
        insights.push({
          id: `stale_${opp.id}`,
          type: 'stale_opportunity',
          priority: daysOverdue > 30 ? 'high' : daysOverdue > 14 ? 'medium' : 'low',
          title: `Overdue: ${opp.name}`,
          description: `Close date was ${daysOverdue} days ago. Update the close date or close the deal.`,
          entityType: 'deal',
          entityId: opp.id,
          entityName: opp.name,
          actionLabel: 'Update Deal',
          actionUrl: `/dashboard/deals/${opp.id}`,
          metadata: { amount: opp.amount, daysOverdue, originalCloseDate: opp.closeDate },
          createdAt: now.toISOString(),
        });
      });

      // 4. Get upcoming meetings needing prep (next 24 hours)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const upcomingMeetings = await this.prisma.meetingSession.findMany({
        where: {
          ownerId: userId,
          scheduledStart: { gte: now, lte: tomorrow },
          status: 'SCHEDULED',
        },
        orderBy: { scheduledStart: 'asc' },
        take: 5,
      });

      upcomingMeetings.forEach((meeting) => {
        const hoursUntil = Math.floor(
          (new Date(meeting.scheduledStart).getTime() - now.getTime()) / (1000 * 60 * 60)
        );
        insights.push({
          id: `meeting_prep_${meeting.id}`,
          type: 'meeting_prep',
          priority: hoursUntil <= 2 ? 'high' : hoursUntil <= 6 ? 'medium' : 'low',
          title: `Meeting in ${hoursUntil}h: ${meeting.title}`,
          description: meeting.description || 'Prepare for your upcoming meeting',
          entityType: 'meeting',
          entityId: meeting.id,
          entityName: meeting.title,
          actionLabel: 'View Meeting',
          actionUrl: `/dashboard/calendar`,
          metadata: { scheduledStart: meeting.scheduledStart },
          createdAt: now.toISOString(),
        });
      });

      // 5. Get tasks needing follow-up (overdue or due today)
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      const overdueTasks = await this.prisma.task.findMany({
        where: {
          ownerId: userId,
          status: { not: 'COMPLETED' },
          dueDate: { lte: todayEnd },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: { lead: true, account: true, opportunity: true },
      });

      overdueTasks.forEach((task) => {
        const isOverdue = new Date(task.dueDate!) < now;
        insights.push({
          id: `follow_up_${task.id}`,
          type: 'follow_up',
          priority: isOverdue ? 'high' : task.priority === 'HIGH' ? 'high' : 'medium',
          title: isOverdue ? `Overdue: ${task.subject}` : `Due today: ${task.subject}`,
          description: task.lead
            ? `Lead: ${task.lead.firstName} ${task.lead.lastName}`
            : task.account?.name
              ? `Account: ${task.account.name}`
              : task.description || 'Complete this task',
          entityType: 'task',
          entityId: task.id,
          entityName: task.subject,
          actionLabel: 'Complete Task',
          actionUrl: `/dashboard/tasks`,
          metadata: { dueDate: task.dueDate, priority: task.priority, isOverdue },
          createdAt: now.toISOString(),
        });
      });

      // Sort insights by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      // Build summary
      const summary = {
        atRiskDeals: atRiskDeals.length,
        hotLeads: hotLeads.length,
        upcomingFollowUps: overdueTasks.length,
        meetingsNeedingPrep: upcomingMeetings.length,
      };

      return {
        insights: insights.slice(0, 10), // Return top 10 insights
        summary,
        lastUpdated: now.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch AI insights: ${error.message}`);
      return {
        insights: [],
        summary: {
          atRiskDeals: 0,
          hotLeads: 0,
          upcomingFollowUps: 0,
          meetingsNeedingPrep: 0,
        },
        lastUpdated: now.toISOString(),
      };
    }
  }

  @Get('insights/deals/:id')
  async getDealInsights(@Request() req, @Param('id') dealId: string): Promise<AIInsight[]> {
    const userId = req.user.userId;
    const now = new Date();
    const insights: AIInsight[] = [];

    try {
      const deal = await this.prisma.opportunity.findFirst({
        where: { id: dealId, ownerId: userId },
        include: { account: true, activities: { take: 10, orderBy: { activityDate: 'desc' } } },
      });

      if (!deal) return [];

      // Check for stale deal
      const daysSinceUpdate = Math.floor(
        (now.getTime() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate > 7) {
        insights.push({
          id: `deal_stale_${deal.id}`,
          type: 'engagement_drop',
          priority: daysSinceUpdate > 14 ? 'high' : 'medium',
          title: 'Engagement dropping',
          description: `No updates for ${daysSinceUpdate} days. Consider reaching out.`,
          entityType: 'deal',
          entityId: deal.id,
          createdAt: now.toISOString(),
        });
      }

      // Check close date
      if (deal.closeDate && new Date(deal.closeDate) < now && !deal.isClosed) {
        insights.push({
          id: `deal_overdue_${deal.id}`,
          type: 'stale_opportunity',
          priority: 'high',
          title: 'Close date passed',
          description: 'Update the close date or close this deal.',
          entityType: 'deal',
          entityId: deal.id,
          createdAt: now.toISOString(),
        });
      }

      // Check for high probability deals nearing close
      if (deal.probability && deal.probability >= 75 && deal.closeDate) {
        const daysToClose = Math.floor(
          (new Date(deal.closeDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysToClose > 0 && daysToClose <= 14) {
          insights.push({
            id: `deal_momentum_${deal.id}`,
            type: 'momentum',
            priority: 'high',
            title: 'Strong momentum',
            description: `${deal.probability}% probability, closing in ${daysToClose} days. Push to close!`,
            entityType: 'deal',
            entityId: deal.id,
            createdAt: now.toISOString(),
          });
        }
      }

      return insights;
    } catch (error) {
      this.logger.error(`Failed to fetch deal insights: ${error.message}`);
      return [];
    }
  }

  @Get('insights/leads')
  async getLeadInsights(@Request() req): Promise<AIInsight[]> {
    const userId = req.user.userId;
    const now = new Date();
    const insights: AIInsight[] = [];

    try {
      // Get hot leads
      const hotLeads = await this.prisma.lead.findMany({
        where: {
          ownerId: userId,
          status: { notIn: ['CONVERTED', 'LOST'] },
          OR: [{ leadScore: { gte: 80 } }, { rating: 'HOT' }],
        },
        orderBy: { leadScore: 'desc' },
        take: 10,
      });

      hotLeads.forEach((lead) => {
        insights.push({
          id: `lead_hot_${lead.id}`,
          type: 'hot_lead',
          priority: (lead.leadScore || 0) >= 90 ? 'high' : 'medium',
          title: `${lead.firstName} ${lead.lastName}`,
          description: `Score: ${lead.leadScore || 'N/A'} - ${lead.company || 'Unknown'}`,
          entityType: 'lead',
          entityId: lead.id,
          entityName: `${lead.firstName} ${lead.lastName}`,
          actionLabel: 'Contact',
          actionUrl: `/dashboard/leads/${lead.id}`,
          createdAt: now.toISOString(),
        });
      });

      return insights;
    } catch (error) {
      this.logger.error(`Failed to fetch lead insights: ${error.message}`);
      return [];
    }
  }

  @Post('insights/:id/dismiss')
  async dismissInsight(@Request() req, @Param('id') insightId: string) {
    // For now, just acknowledge the dismissal
    // In a production system, you'd store this in a database
    this.logger.log(`User ${req.user.userId} dismissed insight ${insightId}`);
    return { success: true, message: 'Insight dismissed' };
  }
}
