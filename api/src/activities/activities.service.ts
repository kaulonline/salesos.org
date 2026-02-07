import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { Activity, ActivityType, Sentiment, Prisma } from '@prisma/client';
import { validateCrmForeignKeys } from '../common/validators/foreign-key.validator';

interface CreateActivityDto {
  type: ActivityType;
  subject: string;
  description?: string;
  outcome?: string;
  activityDate?: Date;
  duration?: number;
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  conversationId?: string;
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  // Create activity
  async createActivity(data: CreateActivityDto, userId: string, organizationId: string): Promise<Activity> {
    this.logger.log(`Creating activity: ${data.type} - ${data.subject}`);

    // Validate all foreign key IDs are in correct format (not Salesforce IDs)
    validateCrmForeignKeys(data);

    const activity = await this.prisma.activity.create({
      data: {
        type: data.type,
        subject: data.subject,
        description: data.description,
        outcome: data.outcome,
        activityDate: data.activityDate || new Date(),
        duration: data.duration,
        userId,
        leadId: data.leadId,
        accountId: data.accountId,
        contactId: data.contactId,
        opportunityId: data.opportunityId,
        conversationId: data.conversationId,
        keyPoints: [],
        actionItems: [],
        concerns: [],
        nextSteps: [],
        organizationId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Extract insights asynchronously
    this.extractInsightsAsync(activity.id, userId, organizationId).catch((err) => {
      this.logger.error(`Failed to extract insights for activity ${activity.id}: ${err.message}`);
    });

    return activity;
  }

  // Get activity by ID (with ownership verification)
  async getActivity(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.userId = userId;
    }
    where.organizationId = organizationId;
    const activity = await this.prisma.activity.findFirst({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        account: {
          select: { id: true, name: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity ${id} not found`);
    }

    return activity;
  }

  // List activities with filtering
  async listActivities(filters: {
    type?: ActivityType;
    userId?: string;
    leadId?: string;
    accountId?: string;
    contactId?: string;
    opportunityId?: string;
    startDate?: Date;
    endDate?: Date;
  } | undefined, organizationId: string, isAdmin?: boolean): Promise<Activity[]> {
    const where: Prisma.ActivityWhereInput = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.userId && !isAdmin) {
      where.userId = filters.userId;
    }

    if (filters?.leadId) {
      where.leadId = filters.leadId;
    }

    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters?.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters?.opportunityId) {
      where.opportunityId = filters.opportunityId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.activityDate = {};
      if (filters.startDate) {
        where.activityDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.activityDate.lte = filters.endDate;
      }
    }

    where.organizationId = organizationId;

    return this.prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        account: {
          select: { id: true, name: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        activityDate: 'desc',
      },
    });
  }

  // Extract AI insights from activity (with ownership verification)
  async extractInsights(activityId: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<Activity> {
    const where: any = { id: activityId };
    if (!isAdmin) {
      where.userId = userId;
    }
    where.organizationId = organizationId;
    const activity = await this.prisma.activity.findFirst({
      where,
    });

    if (!activity) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }

    if (!activity.description) {
      this.logger.warn(`Activity ${activityId} has no description to analyze`);
      return activity;
    }

    try {
      const prompt = `Analyze this sales activity and extract key insights:

Activity Type: ${activity.type}
Subject: ${activity.subject}
Description: ${activity.description}
Outcome: ${activity.outcome || 'Not specified'}

Please provide your analysis in this JSON format:
{
  "sentiment": "<VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE>",
  "keyPoints": ["<key point 1>", "<key point 2>", ...],
  "actionItems": ["<action item 1>", "<action item 2>", ...],
  "concerns": ["<concern 1>", "<concern 2>", ...],
  "nextSteps": ["<next step 1>", "<next step 2>", ...]
}

Extract:
- Sentiment: Overall tone of the interaction
- Key Points: Important topics discussed
- Action Items: Specific tasks or commitments made
- Concerns: Customer objections, risks, or issues raised
- Next Steps: Recommended follow-up actions

Respond ONLY with the JSON object.`;

      const response = await this.anthropic.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content:
              'You are an AI sales analyst. Extract insights from sales activities. Respond in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 1000,
      });

      const insights = JSON.parse(response);

      const updated = await this.prisma.activity.update({
        where: { id: activityId },
        data: {
          sentiment: insights.sentiment as Sentiment,
          keyPoints: insights.keyPoints || [],
          actionItems: insights.actionItems || [],
          concerns: insights.concerns || [],
          nextSteps: insights.nextSteps || [],
        },
      });

      this.logger.log(`Extracted insights for activity ${activityId}: ${insights.sentiment}`);

      return updated;
    } catch (error) {
      this.logger.error(`Failed to extract insights for activity ${activityId}: ${error.message}`);
      return activity;
    }
  }

  // Async insight extraction
  private async extractInsightsAsync(activityId: string, userId: string, organizationId: string): Promise<void> {
    try {
      await this.extractInsights(activityId, userId, organizationId, undefined);
    } catch (error) {
      this.logger.error(`Async insight extraction failed for activity ${activityId}: ${error.message}`);
    }
  }

  // Get activity timeline for a record
  async getTimeline(recordType: string, recordId: string, organizationId: string, userId?: string, isAdmin?: boolean): Promise<Activity[]> {
    const where: Prisma.ActivityWhereInput = {};

    switch (recordType.toLowerCase()) {
      case 'lead':
        where.leadId = recordId;
        break;
      case 'account':
        where.accountId = recordId;
        break;
      case 'contact':
        where.contactId = recordId;
        break;
      case 'opportunity':
        where.opportunityId = recordId;
        break;
      default:
        throw new Error(`Invalid record type: ${recordType}`);
    }

    if (userId && !isAdmin) {
      where.userId = userId;
    }

    where.organizationId = organizationId;

    return this.prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        activityDate: 'desc',
      },
    });
  }

  // Get activity statistics
  async getActivityStats(organizationId: string, userId?: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.ActivityWhereInput = (userId && !isAdmin) ? { userId } : {};

    where.organizationId = organizationId;

    const [total, byType, bySentiment, last7Days] = await Promise.all([
      this.prisma.activity.count({ where }),
      this.prisma.activity.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.activity.groupBy({
        by: ['sentiment'],
        where: { ...where, sentiment: { not: null } },
        _count: true,
      }),
      this.prisma.activity.count({
        where: {
          ...where,
          activityDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      byType,
      bySentiment,
      last7Days,
    };
  }

  // Get activity count by date and optional type
  async getActivityCountByDate(
    userId: string,
    organizationId: string,
    date?: string,
    type?: ActivityType,
    isAdmin?: boolean,
  ): Promise<{ count: number; date: string; type: string | null }> {
    // Parse date or default to today
    let targetDate: Date;
    if (date === 'today' || !date) {
      targetDate = new Date();
    } else {
      targetDate = new Date(date);
    }

    // Get start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Prisma.ActivityWhereInput = {
      activityDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    // Apply user filter if not admin
    if (!isAdmin) {
      where.userId = userId;
    }

    // Apply type filter if provided
    if (type) {
      where.type = type;
    }

    // Apply organization filter (mandatory)
    where.organizationId = organizationId;

    const count = await this.prisma.activity.count({ where });

    return {
      count,
      date: startOfDay.toISOString().split('T')[0],
      type: type || null,
    };
  }
}
