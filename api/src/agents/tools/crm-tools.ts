/**
 * IRIS Agent Framework - CRM Tools
 * 
 * Reusable tool definitions for agents to interact with CRM data.
 * These tools follow the Vercel AI SDK pattern and can be used by any agent.
 */

import { z } from 'zod';
import { AgentTool, AgentContext } from '../types';
import { PrismaService } from '../../database/prisma.service';

/**
 * Create CRM tools factory
 * Returns tools that are bound to a Prisma instance
 * 
 * Note: Using `any` for params type to avoid complex generic inference issues.
 * The Zod schema provides runtime validation.
 */
export function createCRMTools(prisma: PrismaService): AgentTool<any, any>[] {
  return [
    // ==================== OPPORTUNITY TOOLS ====================
    {
      name: 'get_opportunities',
      description: 'Get opportunities with optional filters. Returns list of opportunities with key metrics.',
      parameters: z.object({
        stage: z.string().optional().describe('Filter by stage'),
        ownerId: z.string().optional().describe('Filter by owner'),
        minAmount: z.number().optional().describe('Minimum amount'),
        maxAmount: z.number().optional().describe('Maximum amount'),
        closeDateFrom: z.string().optional().describe('Close date from (ISO)'),
        closeDateTo: z.string().optional().describe('Close date to (ISO)'),
        limit: z.number().optional().default(20).describe('Max results'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const where: any = {};
        
        if (params.stage) where.stage = params.stage;
        if (params.ownerId) where.ownerId = params.ownerId;
        if (context.userId && !params.ownerId) where.ownerId = context.userId;
        if (params.minAmount) where.amount = { gte: params.minAmount };
        if (params.maxAmount) where.amount = { ...where.amount, lte: params.maxAmount };
        if (params.closeDateFrom || params.closeDateTo) {
          where.closeDate = {};
          if (params.closeDateFrom) where.closeDate.gte = new Date(params.closeDateFrom);
          if (params.closeDateTo) where.closeDate.lte = new Date(params.closeDateTo);
        }

        return prisma.opportunity.findMany({
          where,
          take: params.limit || 20,
          orderBy: { closeDate: 'asc' },
          include: {
            account: { select: { id: true, name: true } },
            activities: { take: 5, orderBy: { activityDate: 'desc' } },
          },
        });
      },
    },

    {
      name: 'get_opportunity_details',
      description: 'Get detailed information about a specific opportunity including activities and contacts.',
      parameters: z.object({
        opportunityId: z.string().describe('The opportunity ID'),
      }),
      execute: async (params: any, context: AgentContext) => {
        return prisma.opportunity.findUnique({
          where: { id: params.opportunityId },
          include: {
            account: true,
            owner: { select: { id: true, name: true, email: true } },
            activities: { orderBy: { activityDate: 'desc' }, take: 10 },
            tasks: { where: { status: { not: 'COMPLETED' } } },
            contactRoles: { include: { contact: true } },
            notes: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        });
      },
    },

    {
      name: 'get_stalled_opportunities',
      description: 'Find opportunities that have not progressed in a specified number of days.',
      parameters: z.object({
        stalledDays: z.number().default(14).describe('Days without activity to consider stalled'),
        stages: z.array(z.string()).optional().describe('Filter to specific stages'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (params.stalledDays || 14));

        const where: any = {
          ownerId: context.userId,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          OR: [
            { lastActivityDate: { lt: cutoffDate } },
            { lastActivityDate: null },
          ],
        };

        if (params.stages) {
          where.stage = { in: params.stages };
        }

        return prisma.opportunity.findMany({
          where,
          include: {
            account: { select: { id: true, name: true } },
            activities: { take: 1, orderBy: { activityDate: 'desc' } },
          },
          orderBy: { lastActivityDate: 'asc' },
        });
      },
    },

    // ==================== LEAD TOOLS ====================
    {
      name: 'get_leads',
      description: 'Get leads with optional filters.',
      parameters: z.object({
        status: z.string().optional().describe('Filter by status'),
        minScore: z.number().optional().describe('Minimum lead score'),
        rating: z.string().optional().describe('Filter by rating (HOT, WARM, COLD)'),
        limit: z.number().optional().default(20).describe('Max results'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const where: any = { ownerId: context.userId };
        
        if (params.status) where.status = params.status;
        if (params.minScore) where.leadScore = { gte: params.minScore };
        if (params.rating) where.rating = params.rating;

        return prisma.lead.findMany({
          where,
          take: params.limit || 20,
          orderBy: { leadScore: 'desc' },
        });
      },
    },

    {
      name: 'get_uncontacted_leads',
      description: 'Find leads that have not been contacted in a specified number of days.',
      parameters: z.object({
        days: z.number().default(7).describe('Days since last contact'),
        minScore: z.number().optional().describe('Minimum lead score'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (params.days || 7));

        const where: any = {
          ownerId: context.userId,
          status: { notIn: ['CONVERTED', 'LOST', 'UNQUALIFIED'] },
          OR: [
            { lastContactedAt: { lt: cutoffDate } },
            { lastContactedAt: null },
          ],
        };

        if (params.minScore) {
          where.leadScore = { gte: params.minScore };
        }

        return prisma.lead.findMany({
          where,
          orderBy: { leadScore: 'desc' },
        });
      },
    },

    // ==================== ACCOUNT TOOLS ====================
    {
      name: 'get_account_health',
      description: 'Get account health metrics including engagement, opportunities, and recent activities.',
      parameters: z.object({
        accountId: z.string().describe('The account ID'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const account = await prisma.account.findUnique({
          where: { id: params.accountId },
          include: {
            opportunities: {
              where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
            },
            contacts: true,
            activities: { take: 20, orderBy: { activityDate: 'desc' } },
            contracts: { where: { status: 'ACTIVATED' } },
          },
        });

        if (!account) return null;

        // Calculate health metrics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentActivities = account.activities.filter(
          a => a.activityDate && a.activityDate > thirtyDaysAgo
        ).length;

        const openOpportunityValue = account.opportunities.reduce(
          (sum, o) => sum + (o.amount || 0), 0
        );

        return {
          account,
          metrics: {
            openOpportunities: account.opportunities.length,
            openOpportunityValue,
            contactCount: account.contacts.length,
            recentActivityCount: recentActivities,
            activeContracts: account.contracts.length,
            engagementLevel: recentActivities > 5 ? 'HIGH' : recentActivities > 2 ? 'MEDIUM' : 'LOW',
          },
        };
      },
    },

    // ==================== ACTIVITY TOOLS ====================
    {
      name: 'get_activity_timeline',
      description: 'Get recent activities for a user or entity.',
      parameters: z.object({
        entityType: z.string().optional().describe('Filter by entity type'),
        entityId: z.string().optional().describe('Filter by entity ID'),
        days: z.number().default(30).describe('Number of days to look back'),
        limit: z.number().default(50).describe('Max results'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (params.days || 30));

        const where: any = {
          userId: context.userId,
          activityDate: { gte: cutoffDate },
        };

        if (params.entityType === 'Opportunity' && params.entityId) {
          where.opportunityId = params.entityId;
        } else if (params.entityType === 'Lead' && params.entityId) {
          where.leadId = params.entityId;
        } else if (params.entityType === 'Account' && params.entityId) {
          where.accountId = params.entityId;
        }

        return prisma.activity.findMany({
          where,
          take: params.limit || 50,
          orderBy: { activityDate: 'desc' },
        });
      },
    },

    // ==================== TASK TOOLS ====================
    {
      name: 'get_overdue_tasks',
      description: 'Get tasks that are past their due date.',
      parameters: z.object({
        entityType: z.string().optional().describe('Filter by entity type'),
        entityId: z.string().optional().describe('Filter by entity ID'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const where: any = {
          ownerId: context.userId,
          status: { notIn: ['COMPLETED'] },
          dueDate: { lt: new Date() },
        };

        if (params.entityType === 'Opportunity' && params.entityId) {
          where.opportunityId = params.entityId;
        } else if (params.entityType === 'Lead' && params.entityId) {
          where.leadId = params.entityId;
        }

        return prisma.task.findMany({
          where,
          orderBy: { dueDate: 'asc' },
        });
      },
    },

    {
      name: 'create_task',
      description: 'Create a new task.',
      parameters: z.object({
        subject: z.string().describe('Task subject'),
        description: z.string().optional().describe('Task description'),
        dueDate: z.string().describe('Due date (ISO format)'),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
        opportunityId: z.string().optional(),
        leadId: z.string().optional(),
        accountId: z.string().optional(),
        contactId: z.string().optional(),
      }),
      execute: async (params: any, context: AgentContext) => {
        return prisma.task.create({
          data: {
            ownerId: context.userId!,
            subject: params.subject,
            description: params.description,
            dueDate: new Date(params.dueDate),
            priority: params.priority as any,
            status: 'NOT_STARTED',
            opportunityId: params.opportunityId,
            leadId: params.leadId,
            accountId: params.accountId,
            contactId: params.contactId,
          },
        });
      },
    },

    // ==================== MEETING TOOLS ====================
    {
      name: 'get_upcoming_meetings',
      description: 'Get upcoming scheduled meetings.',
      parameters: z.object({
        days: z.number().default(7).describe('Days ahead to look'),
        opportunityId: z.string().optional(),
        accountId: z.string().optional(),
      }),
      execute: async (params: any, context: AgentContext) => {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (params.days || 7));

        const where: any = {
          ownerId: context.userId,
          scheduledStart: {
            gte: new Date(),
            lte: endDate,
          },
          status: { in: ['SCHEDULED'] },
        };

        if (params.opportunityId) where.opportunityId = params.opportunityId;
        if (params.accountId) where.accountId = params.accountId;

        return prisma.meetingSession.findMany({
          where,
          orderBy: { scheduledStart: 'asc' },
          include: {
            opportunity: { select: { id: true, name: true } },
            account: { select: { id: true, name: true } },
          },
        });
      },
    },

    // ==================== EMAIL TOOLS ====================
    {
      name: 'get_awaiting_responses',
      description: 'Get email threads awaiting response.',
      parameters: z.object({
        days: z.number().default(7).describe('Days to look back'),
        overdueOnly: z.boolean().default(false).describe('Only show overdue threads'),
      }),
      execute: async (params: any, context: AgentContext) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (params.days || 7));

        const where: any = {
          userId: context.userId,
          status: 'AWAITING_RESPONSE',
          lastEmailAt: { gte: cutoffDate },
        };

        const threads = await prisma.emailThread.findMany({
          where,
          orderBy: { lastEmailAt: 'asc' },
          include: {
            lead: { select: { id: true, firstName: true, lastName: true, company: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        if (params.overdueOnly) {
          const overdueCutoff = new Date();
          overdueCutoff.setDate(overdueCutoff.getDate() - 3);
          return threads.filter(t => t.lastEmailAt && t.lastEmailAt < overdueCutoff);
        }

        return threads;
      },
    },

    // ==================== ANALYTICS TOOLS ====================
    {
      name: 'get_pipeline_summary',
      description: 'Get pipeline summary with stage breakdown and totals.',
      parameters: z.object({}),
      execute: async (_params: any, context: AgentContext) => {
        const opportunities = await prisma.opportunity.findMany({
          where: {
            ownerId: context.userId,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
          select: {
            id: true,
            name: true,
            stage: true,
            amount: true,
            probability: true,
            closeDate: true,
          },
        });

        // Group by stage
        const byStage: Record<string, { count: number; value: number; weighted: number }> = {};
        let totalValue = 0;
        let totalWeighted = 0;

        for (const opp of opportunities) {
          const stage = opp.stage;
          if (!byStage[stage]) {
            byStage[stage] = { count: 0, value: 0, weighted: 0 };
          }
          byStage[stage].count++;
          byStage[stage].value += opp.amount || 0;
          byStage[stage].weighted += (opp.amount || 0) * (opp.probability || 0) / 100;
          
          totalValue += opp.amount || 0;
          totalWeighted += (opp.amount || 0) * (opp.probability || 0) / 100;
        }

        return {
          totalOpportunities: opportunities.length,
          totalValue,
          totalWeighted,
          byStage,
          opportunities,
        };
      },
    },
  ];
}

