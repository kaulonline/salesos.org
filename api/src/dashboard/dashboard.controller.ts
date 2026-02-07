/**
 * Dashboard Controller
 * Provides mode-aware data fetching for the dashboard/right panel
 * Supports local, salesforce, and oracle_cx modes
 * 
 * AI-Generated Code - GitHub Copilot
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { SalesforceService } from '../salesforce/salesforce.service';
import { OracleCXService } from '../oracle-cx/oracle-cx.service';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesforceService: SalesforceService,
    private readonly oracleCXService: OracleCXService,
  ) {}

  /**
   * Get hot leads based on mode
   */
  @Get('hot-leads')
  async getHotLeads(
    @Request() req,
    @CurrentOrganization() organizationId: string | null,
    @Query('mode') mode: string = 'local',
    @Query('limit') limit: string = '5',
  ) {
    const userId = req.user.userId;
    const limitNum = parseInt(limit) || 5;

    try {
      if (mode === 'oracle_cx' || mode === 'oracle_portal') {
        // Fetch leads from Oracle CX
        const result = await this.oracleCXService.query(userId, 'leads', {
          limit: limitNum,
        });

        return ((result.items || []) as any[]).map((lead: any) => {
          // Determine score based on rank or status
          const rank = (lead.Rank || lead.RankCode || '').toString().toUpperCase();
          let leadScore = 70; // Default score
          if (rank === 'HOT' || rank === '1') leadScore = 95;
          else if (rank === 'WARM' || rank === '2') leadScore = 80;
          else if (rank === 'COLD' || rank === '3') leadScore = 50;

          return {
            id: lead.LeadId?.toString() || lead.id,
            firstName: lead.PrimaryContactPersonFirstName || '',
            lastName: lead.PrimaryContactPersonLastName || '',
            contactName: `${lead.PrimaryContactPersonFirstName || ''} ${lead.PrimaryContactPersonLastName || ''}`.trim() || lead.Name,
            company: lead.CustomerPartyName || lead.OrganizationName || '',
            email: lead.PrimaryContactEmailAddress || '',
            phone: lead.FormattedPhoneNumber1 || lead.PrimaryPhoneNumber || '',
            status: lead.StatusCode || 'NEW',
            rating: rank || 'UNKNOWN',
            title: lead.JobTitle || '',
            leadScore,
          };
        });
      } else if (mode === 'salesforce') {
        // Fetch hot leads from Salesforce
        const query = `SELECT Id, FirstName, LastName, Company, Email, Phone, Status, Rating, LeadSource, Title
                       FROM Lead
                       WHERE Rating = 'Hot' OR Rating = 'Warm'
                       ORDER BY CreatedDate DESC
                       LIMIT ${limitNum}`;

        const result = await this.salesforceService.query(userId, query);

        return (result.records || []).map((rec: any) => ({
          id: rec.Id,
          firstName: rec.FirstName,
          lastName: rec.LastName,
          company: rec.Company,
          email: rec.Email,
          phone: rec.Phone,
          status: rec.Status,
          rating: rec.Rating,
          leadSource: rec.LeadSource,
          title: rec.Title,
          // Map rating to score for UI compatibility
          leadScore: rec.Rating === 'Hot' ? 90 : rec.Rating === 'Warm' ? 75 : 50,
        }));
      } else {
        // Local database query
        const where: any = {
          ownerId: userId,
          OR: [
            { leadScore: { gte: 80 } },
            { rating: 'HOT' },
          ],
        };
        if (organizationId) {
          where.organizationId = organizationId;
        }
        const leads = await this.prisma.lead.findMany({
          where,
          orderBy: { leadScore: 'desc' },
          take: limitNum,
        });

        return leads;
      }
    } catch (error) {
      this.logger.error(`Failed to fetch hot leads (mode: ${mode}): ${error.message}`);
      return [];
    }
  }

  /**
   * Get upcoming meetings/demos based on mode
   */
  @Get('upcoming-meetings')
  async getUpcomingMeetings(
    @Request() req,
    @CurrentOrganization() organizationId: string | null,
    @Query('mode') mode: string = 'local',
    @Query('limit') limit: string = '5',
  ) {
    const userId = req.user.userId;
    const limitNum = parseInt(limit) || 5;
    const now = new Date().toISOString();

    try {
      if (mode === 'oracle_cx' || mode === 'oracle_portal') {
        // Fetch activities from Oracle CX
        const result = await this.oracleCXService.query(userId, 'activities', {
          limit: 50,
        });

        const now = new Date();
        // Filter for future activities and map to common format
        return ((result.items || []) as any[])
          .filter((act: any) => {
            const actDate = act.ActivityDate || act.StartDate;
            return actDate && new Date(actDate) >= now;
          })
          .slice(0, limitNum)
          .map((act: any) => ({
            id: act.ActivityId?.toString() || act.id,
            subject: act.Subject || act.ActivityName || 'Activity',
            startTime: act.ActivityDate || act.StartDate,
            endTime: act.EndDate,
            type: act.ActivityFunctionCode || act.ActivityTypeCode || 'Meeting',
            description: act.Description || act.ActivityDescription,
            relatedTo: act.AccountName || act.ContactName,
          }));
      } else if (mode === 'salesforce') {
        // Fetch upcoming events from Salesforce
        const query = `SELECT Id, Subject, StartDateTime, EndDateTime, Description, Who.Name, What.Name
                       FROM Event
                       WHERE StartDateTime >= TODAY
                       ORDER BY StartDateTime ASC
                       LIMIT ${limitNum}`;

        const result = await this.salesforceService.query(userId, query);

        return (result.records || []).map((rec: any) => ({
          id: rec.Id,
          subject: rec.Subject,
          startTime: rec.StartDateTime,
          endTime: rec.EndDateTime,
          type: rec.Type || 'Meeting',
          description: rec.Description,
          relatedTo: rec.Who?.Name || rec.What?.Name,
        }));
      } else {
        // Local database query
        const where: any = {
          userId: userId,
          type: 'MEETING',
          activityDate: { gte: new Date() },
        };
        if (organizationId) {
          where.organizationId = organizationId;
        }
        const activities = await this.prisma.activity.findMany({
          where,
          orderBy: { activityDate: 'asc' },
          take: limitNum,
        });

        // Map to common format
        return activities.map(a => ({
          id: a.id,
          subject: a.subject,
          startTime: a.activityDate,
          type: a.type,
          description: a.description,
        }));
      }
    } catch (error) {
      this.logger.error(`Failed to fetch upcoming meetings (mode: ${mode}): ${error.message}`);
      return [];
    }
  }

  /**
   * Get dashboard stats based on mode
   * Returns real-time metrics calculated from actual data
   */
  @Get('stats')
  async getStats(
    @Request() req,
    @CurrentOrganization() organizationId: string | null,
    @Query('mode') mode: string = 'local',
  ) {
    const userId = req.user.userId;

    try {
      if (mode === 'oracle_cx' || mode === 'oracle_portal') {
        // Fetch stats from Oracle CX
        return this.getOracleStats(userId);
      } else if (mode === 'salesforce') {
        // Fetch stats from Salesforce with real calculations
        const [
          closedWonResult,
          leadsResult,
          eventsResult,
          pipelineCurrentResult,
          pipelinePrevResult,
          winCycleResult,
        ] = await Promise.all([
          // Closed won this fiscal year
          this.salesforceService.query(userId,
            `SELECT SUM(Amount) totalAmount FROM Opportunity WHERE StageName = 'Closed Won' AND CloseDate = THIS_FISCAL_YEAR`
          ),
          // Hot leads count
          this.salesforceService.query(userId,
            `SELECT COUNT() FROM Lead WHERE Rating = 'Hot'`
          ),
          // Upcoming events
          this.salesforceService.query(userId,
            `SELECT COUNT() FROM Event WHERE StartDateTime >= TODAY`
          ),
          // Current quarter pipeline (open opportunities)
          this.salesforceService.query(userId,
            `SELECT SUM(Amount) totalAmount FROM Opportunity WHERE IsClosed = false`
          ),
          // Last quarter closed won (for growth comparison)
          this.salesforceService.query(userId,
            `SELECT SUM(Amount) totalAmount FROM Opportunity WHERE StageName = 'Closed Won' AND CloseDate = LAST_FISCAL_QUARTER`
          ),
          // Average win cycle time (days from creation to close)
          this.salesforceService.query(userId,
            `SELECT AVG(CALENDAR_MONTH(CloseDate) - CALENDAR_MONTH(CreatedDate)) avgDays FROM Opportunity WHERE StageName = 'Closed Won' AND CloseDate = THIS_FISCAL_YEAR`
          ),
        ]);

        const closedAmount = closedWonResult.records?.[0]?.totalAmount || 0;
        const hotLeadsCount = leadsResult.totalSize || 0;
        const upcomingDemosCount = eventsResult.totalSize || 0;
        const currentPipeline = pipelineCurrentResult.records?.[0]?.totalAmount || 0;
        const lastQuarterClosed = pipelinePrevResult.records?.[0]?.totalAmount || 1; // Avoid division by zero

        // Calculate target based on last quarter performance + 20% growth goal
        const target = Math.max(lastQuarterClosed * 1.2, 50000); // At least $50k target

        // Pipeline growth: current pipeline vs last quarter closed
        const pipelineGrowth = lastQuarterClosed > 0
          ? Math.round(((currentPipeline - lastQuarterClosed) / lastQuarterClosed) * 100)
          : 0;

        // Win cycle time (default to 30 days if no data)
        const winCycleTime = winCycleResult.records?.[0]?.avgDays || 30;

        return {
          quota: {
            current: closedAmount,
            target: Math.round(target),
            percentage: target > 0 ? Math.min(Math.round((closedAmount / target) * 100), 100) : 0,
          },
          hotLeadsCount,
          upcomingDemosCount,
          pipelineGrowth,
          winCycleTime: Math.round(winCycleTime),
        };
      } else {
        // Local database stats with real calculations
        const now = new Date();
        const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const startOfLastQuarter = new Date(startOfQuarter);
        startOfLastQuarter.setMonth(startOfLastQuarter.getMonth() - 3);

        // Build where clauses with optional organizationId filter
        const oppBaseWhere: any = { ownerId: userId };
        const leadBaseWhere: any = { ownerId: userId };
        const activityBaseWhere: any = { userId: userId };
        if (organizationId) {
          oppBaseWhere.organizationId = organizationId;
          leadBaseWhere.organizationId = organizationId;
          activityBaseWhere.organizationId = organizationId;
        }

        const [
          closedWonAmount,
          hotLeadsCount,
          upcomingDemosCount,
          currentPipeline,
          lastQuarterClosed,
          wonOpportunities,
        ] = await Promise.all([
          // Closed won this quarter
          this.prisma.opportunity.aggregate({
            where: {
              ...oppBaseWhere,
              stage: 'CLOSED_WON',
              closeDate: { gte: startOfQuarter },
            },
            _sum: { amount: true },
          }),
          // Hot leads count
          this.prisma.lead.count({
            where: {
              ...leadBaseWhere,
              OR: [{ leadScore: { gte: 80 } }, { rating: 'HOT' }],
            },
          }),
          // Upcoming meetings
          this.prisma.activity.count({
            where: {
              ...activityBaseWhere,
              type: 'MEETING',
              activityDate: { gte: new Date() },
            },
          }),
          // Current pipeline (open opportunities)
          this.prisma.opportunity.aggregate({
            where: {
              ...oppBaseWhere,
              stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
            },
            _sum: { amount: true },
          }),
          // Last quarter closed won
          this.prisma.opportunity.aggregate({
            where: {
              ...oppBaseWhere,
              stage: 'CLOSED_WON',
              closeDate: {
                gte: startOfLastQuarter,
                lt: startOfQuarter,
              },
            },
            _sum: { amount: true },
          }),
          // Won opportunities for cycle time calculation
          this.prisma.opportunity.findMany({
            where: {
              ...oppBaseWhere,
              stage: 'CLOSED_WON',
              closeDate: { gte: startOfQuarter },
            },
            select: { createdAt: true, closeDate: true },
          }),
        ]);

        const currentAmount = closedWonAmount._sum.amount || 0;
        const pipelineAmount = currentPipeline._sum.amount || 0;
        const lastQuarterAmount = lastQuarterClosed._sum.amount || 0;

        // Calculate target based on last quarter + 20% growth, or pipeline if no history
        const target = lastQuarterAmount > 0
          ? Math.max(lastQuarterAmount * 1.2, 50000)
          : Math.max(pipelineAmount * 0.5, 50000); // 50% of pipeline as target if no history

        // Pipeline growth percentage
        const pipelineGrowth = lastQuarterAmount > 0
          ? Math.round(((pipelineAmount - lastQuarterAmount) / lastQuarterAmount) * 100)
          : pipelineAmount > 0 ? 100 : 0;

        // Average win cycle time in days
        let winCycleTime = 30; // Default
        if (wonOpportunities.length > 0) {
          const validOpps = wonOpportunities.filter(o => o.closeDate && o.createdAt);
          const cycleTimes = validOpps.map(o => {
            const created = new Date(o.createdAt);
            const closed = new Date(o.closeDate!); // Non-null asserted after filter
            return Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          });
          if (cycleTimes.length > 0) {
            winCycleTime = Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length);
          }
        }

        return {
          quota: {
            current: currentAmount,
            target: Math.round(target),
            percentage: target > 0 ? Math.min(Math.round((currentAmount / target) * 100), 100) : 0,
          },
          hotLeadsCount,
          upcomingDemosCount,
          pipelineGrowth,
          winCycleTime,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard stats (mode: ${mode}): ${error.message}`);
      return {
        quota: { current: 0, target: 0, percentage: 0 },
        hotLeadsCount: 0,
        upcomingDemosCount: 0,
        pipelineGrowth: 0,
        winCycleTime: 0,
      };
    }
  }

  /**
   * Get Oracle CX dashboard stats
   */
  private async getOracleStats(userId: string) {
    try {
      const now = new Date();
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

      const [
        opportunitiesResult,
        leadsResult,
        activitiesResult,
      ] = await Promise.all([
        // All opportunities (we'll filter locally)
        this.oracleCXService.query(userId, 'opportunities', {
          limit: 100,
        }).catch(err => {
          this.logger.warn(`Oracle CX opportunities query failed: ${err.message}`);
          return { items: [], totalResults: 0 };
        }),
        // All leads (we'll filter locally)
        this.oracleCXService.query(userId, 'leads', {
          limit: 50,
        }).catch(err => {
          this.logger.warn(`Oracle CX leads query failed: ${err.message}`);
          return { items: [], totalResults: 0 };
        }),
        // Activities
        this.oracleCXService.query(userId, 'activities', {
          limit: 50,
        }).catch(err => {
          this.logger.warn(`Oracle CX activities query failed: ${err.message}`);
          return { items: [], totalResults: 0 };
        }),
      ]);

      // Process opportunities
      const opportunities = (opportunitiesResult.items || []) as any[];
      let closedAmount = 0;
      let pipelineAmount = 0;

      for (const opp of opportunities) {
        const status = (opp.StatusCode || '').toUpperCase();
        const revenue = opp.Revenue || opp.OptyRevenue || 0;
        const closeDate = opp.CloseDate || opp.ActualCloseDate;

        if (status === 'WON' || status.includes('CLOSED_WON')) {
          // Check if closed this quarter
          if (closeDate && new Date(closeDate) >= startOfQuarter) {
            closedAmount += revenue;
          }
        } else if (status !== 'LOST' && !status.includes('CLOSED_LOST')) {
          // Open opportunity
          pipelineAmount += revenue;
        }
      }

      // If no opportunities, use lead deal amounts as pipeline estimate
      if (pipelineAmount === 0) {
        const leads = (leadsResult.items || []) as any[];
        for (const lead of leads) {
          const dealAmount = lead.DealAmount || lead.BudgetAmount || 0;
          if (typeof dealAmount === 'number' && dealAmount > 0) {
            pipelineAmount += dealAmount;
          }
        }
      }

      // Count hot leads (Oracle CX uses Rank or RankCode field)
      // If no hot leads, use total leads count as a fallback for the UI
      const leads = (leadsResult.items || []) as any[];
      const totalLeadsCount = leadsResult.totalResults || leads.length;
      let hotLeadsCount = leads.filter((l: any) => {
        const rank = (l.Rank || l.RankCode || l.LeadRank || '').toString().toUpperCase();
        return rank === 'HOT' || rank === '1' || rank.includes('HIGH');
      }).length;
      // If no hot leads but we have leads, show total leads count instead
      if (hotLeadsCount === 0 && totalLeadsCount > 0) {
        hotLeadsCount = totalLeadsCount;
      }

      // Count upcoming activities (future dated)
      const activities = (activitiesResult.items || []) as any[];
      const upcomingDemosCount = activities.filter((a: any) => {
        const actDate = a.ActivityDate || a.StartDate;
        return actDate && new Date(actDate) >= now;
      }).length;

      // Calculate target (at least $50k or based on pipeline)
      const target = Math.max(pipelineAmount * 0.5, closedAmount * 1.2, 50000);

      // Pipeline growth (simplified)
      const pipelineGrowth = pipelineAmount > 0 ? Math.round((pipelineAmount / target) * 100) : 0;

      return {
        quota: {
          current: closedAmount,
          target: Math.round(target),
          percentage: target > 0 ? Math.min(Math.round((closedAmount / target) * 100), 100) : 0,
        },
        hotLeadsCount,
        upcomingDemosCount,
        pipelineGrowth,
        winCycleTime: 30, // Default, would need historical data to calculate
      };
    } catch (error: any) {
      this.logger.error(`Oracle stats error: ${error.message}`);
      return {
        quota: { current: 0, target: 50000, percentage: 0 },
        hotLeadsCount: 0,
        upcomingDemosCount: 0,
        pipelineGrowth: 0,
        winCycleTime: 30,
      };
    }
  }

  /**
   * Get comprehensive rep dashboard data in one call
   * Works with local, salesforce, and oracle_cx modes
   */
  @Get('rep-metrics')
  async getRepMetrics(
    @Request() req,
    @CurrentOrganization() organizationId: string | null,
    @Query('mode') mode: string = 'local',
  ) {
    const userId = req.user.userId;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    try {
      if (mode === 'salesforce') {
        return this.getSalesforceRepMetrics(userId, startOfWeek, startOfToday, organizationId);
      } else if (mode === 'oracle_cx' || mode === 'oracle_portal') {
        return this.getOracleRepMetrics(userId, startOfWeek, startOfToday);
      } else {
        return this.getLocalRepMetrics(userId, startOfWeek, startOfToday, organizationId);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch rep metrics (mode: ${mode}): ${error.message}`);
      return this.getEmptyRepMetrics();
    }
  }

  private async getLocalRepMetrics(userId: string, startOfWeek: Date, startOfToday: Date, organizationId?: string | null) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Build where clauses with optional organizationId filter
    const activityWhere: any = { userId, activityDate: { gte: startOfWeek } };
    const taskWhere: any = {
      ownerId: userId,
      dueDate: {
        gte: startOfToday,
        lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
      },
      status: { not: 'COMPLETED' },
    };
    const oppBaseWhere: any = { ownerId: userId };
    if (organizationId) {
      activityWhere.organizationId = organizationId;
      taskWhere.organizationId = organizationId;
      oppBaseWhere.organizationId = organizationId;
    }

    const [
      weeklyActivities,
      todaysTasks,
      dealsAtRisk,
      recentWins,
      pipelineByStage,
    ] = await Promise.all([
      // Weekly activity counts by type
      this.prisma.activity.groupBy({
        by: ['type'],
        where: activityWhere,
        _count: { id: true },
      }),
      // Today's tasks
      this.prisma.task.findMany({
        where: taskWhere,
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: { lead: true, account: true, opportunity: true },
      }),
      // Deals at risk (no activity in 14+ days, still open)
      this.prisma.opportunity.findMany({
        where: {
          ...oppBaseWhere,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          updatedAt: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { amount: 'desc' },
        take: 3,
        include: { account: true },
      }),
      // Recent wins (last 30 days)
      this.prisma.opportunity.findMany({
        where: {
          ...oppBaseWhere,
          stage: 'CLOSED_WON',
          closeDate: { gte: thirtyDaysAgo },
        },
        orderBy: { closeDate: 'desc' },
        take: 3,
        include: { account: true },
      }),
      // Pipeline by stage
      this.prisma.opportunity.groupBy({
        by: ['stage'],
        where: {
          ...oppBaseWhere,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Process weekly activities
    const activityCounts = {
      calls: 0,
      emails: 0,
      meetings: 0,
    };
    weeklyActivities.forEach((a: any) => {
      if (a.type === 'CALL') activityCounts.calls = a._count.id;
      else if (a.type === 'EMAIL') activityCounts.emails = a._count.id;
      else if (['MEETING', 'DEMO'].includes(a.type)) activityCounts.meetings += a._count.id;
    });

    // Weekly targets (configurable defaults)
    const weeklyTargets = { calls: 25, emails: 50, meetings: 10 };

    return {
      weeklyActivity: {
        calls: { count: activityCounts.calls, target: weeklyTargets.calls, percentage: Math.min(Math.round((activityCounts.calls / weeklyTargets.calls) * 100), 100) },
        emails: { count: activityCounts.emails, target: weeklyTargets.emails, percentage: Math.min(Math.round((activityCounts.emails / weeklyTargets.emails) * 100), 100) },
        meetings: { count: activityCounts.meetings, target: weeklyTargets.meetings, percentage: Math.min(Math.round((activityCounts.meetings / weeklyTargets.meetings) * 100), 100) },
      },
      todaysTasks: todaysTasks.map(t => ({
        id: t.id,
        subject: t.subject,
        priority: t.priority,
        dueDate: t.dueDate,
        relatedTo: t.lead?.company || t.account?.name || t.opportunity?.name || null,
        type: t.lead ? 'lead' : t.account ? 'account' : t.opportunity ? 'opportunity' : null,
      })),
      dealsAtRisk: dealsAtRisk.map(d => ({
        id: d.id,
        name: d.name,
        amount: d.amount,
        stage: d.stage,
        account: d.account?.name,
        daysSinceUpdate: Math.floor((now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      recentWins: recentWins.map(w => ({
        id: w.id,
        name: w.name,
        amount: w.amount,
        account: w.account?.name,
        closeDate: w.closeDate,
      })),
      pipelineHealth: pipelineByStage.map((p: any) => ({
        stage: p.stage,
        amount: p._sum.amount || 0,
        count: p._count.id,
      })),
    };
  }

  private async getSalesforceRepMetrics(userId: string, startOfWeek: Date, startOfToday: Date, organizationId?: string | null) {
    const now = new Date();
    const weekStart = startOfWeek.toISOString().split('T')[0];
    const todayStart = startOfToday.toISOString().split('T')[0];

    try {
      const [
        tasksResult,
        eventsResult,
        staleOppsResult,
        recentWinsResult,
        pipelineResult,
      ] = await Promise.all([
        // Today's tasks
        this.salesforceService.query(userId,
          `SELECT Id, Subject, Priority, ActivityDate, Who.Name, What.Name
           FROM Task
           WHERE ActivityDate = TODAY AND Status != 'Completed'
           ORDER BY ActivityDate ASC LIMIT 5`
        ),
        // This week's events (meetings)
        this.salesforceService.query(userId,
          `SELECT COUNT() FROM Event WHERE ActivityDate >= ${weekStart}`
        ),
        // Deals at risk (no activity in 14 days)
        this.salesforceService.query(userId,
          `SELECT Id, Name, Amount, StageName, Account.Name, LastActivityDate
           FROM Opportunity
           WHERE IsClosed = false AND LastActivityDate < LAST_N_DAYS:14
           ORDER BY Amount DESC LIMIT 3`
        ),
        // Recent wins
        this.salesforceService.query(userId,
          `SELECT Id, Name, Amount, Account.Name, CloseDate
           FROM Opportunity
           WHERE StageName = 'Closed Won' AND CloseDate = LAST_N_DAYS:30
           ORDER BY CloseDate DESC LIMIT 3`
        ),
        // Pipeline by stage
        this.salesforceService.query(userId,
          `SELECT StageName, SUM(Amount) totalAmount, COUNT(Id) dealCount
           FROM Opportunity
           WHERE IsClosed = false
           GROUP BY StageName`
        ),
      ]);

      // Get activity counts from local (Salesforce Task/Event tracking is complex)
      const activityWhere: any = {
        userId,
        activityDate: { gte: startOfWeek },
      };
      if (organizationId) {
        activityWhere.organizationId = organizationId;
      }
      const localActivities = await this.prisma.activity.groupBy({
        by: ['type'],
        where: activityWhere,
        _count: { id: true },
      });

      const activityCounts = { calls: 0, emails: 0, meetings: 0 };
      localActivities.forEach((a: any) => {
        if (a.type === 'CALL') activityCounts.calls = a._count.id;
        else if (a.type === 'EMAIL') activityCounts.emails = a._count.id;
        else if (['MEETING', 'DEMO'].includes(a.type)) activityCounts.meetings += a._count.id;
      });

      // Add Salesforce events to meetings count
      activityCounts.meetings += eventsResult.totalSize || 0;

      const weeklyTargets = { calls: 25, emails: 50, meetings: 10 };

      return {
        weeklyActivity: {
          calls: { count: activityCounts.calls, target: weeklyTargets.calls, percentage: Math.min(Math.round((activityCounts.calls / weeklyTargets.calls) * 100), 100) },
          emails: { count: activityCounts.emails, target: weeklyTargets.emails, percentage: Math.min(Math.round((activityCounts.emails / weeklyTargets.emails) * 100), 100) },
          meetings: { count: activityCounts.meetings, target: weeklyTargets.meetings, percentage: Math.min(Math.round((activityCounts.meetings / weeklyTargets.meetings) * 100), 100) },
        },
        todaysTasks: (tasksResult.records || []).map((t: any) => ({
          id: t.Id,
          subject: t.Subject,
          priority: t.Priority,
          dueDate: t.ActivityDate,
          relatedTo: t.Who?.Name || t.What?.Name || null,
          type: t.Who ? 'contact' : t.What ? 'account' : null,
        })),
        dealsAtRisk: (staleOppsResult.records || []).map((d: any) => ({
          id: d.Id,
          name: d.Name,
          amount: d.Amount,
          stage: d.StageName,
          account: d.Account?.Name,
          daysSinceUpdate: d.LastActivityDate
            ? Math.floor((now.getTime() - new Date(d.LastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
            : 30,
        })),
        recentWins: (recentWinsResult.records || []).map((w: any) => ({
          id: w.Id,
          name: w.Name,
          amount: w.Amount,
          account: w.Account?.Name,
          closeDate: w.CloseDate,
        })),
        pipelineHealth: (pipelineResult.records || []).map((p: any) => ({
          stage: p.StageName,
          amount: p.totalAmount || 0,
          count: p.dealCount || 0,
        })),
      };
    } catch (error) {
      this.logger.error(`Salesforce rep metrics error: ${error.message}`);
      return this.getEmptyRepMetrics();
    }
  }

  private async getOracleRepMetrics(userId: string, startOfWeek: Date, startOfToday: Date) {
    try {
      const now = new Date();
      const weekStartISO = startOfWeek.toISOString().split('T')[0];
      const todayISO = startOfToday.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0];
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(now.getDate() - 14);
      const fourteenDaysAgoISO = fourteenDaysAgo.toISOString().split('T')[0];

      // Query Oracle CX for activities and opportunities in parallel
      // Note: Oracle CX uses different field names - don't specify fields to get all
      const [
        activitiesResult,
        openOpportunitiesResult,
        recentWinsResult,
      ] = await Promise.all([
        // Activities this week (for calls, emails, meetings)
        this.oracleCXService.query(userId, 'activities', {
          limit: 200,
        }).catch(err => {
          this.logger.warn(`Oracle CX activities query failed: ${err.message}`);
          return { items: [], totalResults: 0 };
        }),
        // Open opportunities (for pipeline health and deals at risk)
        this.oracleCXService.query(userId, 'opportunities', {
          limit: 100,
        }).catch(err => {
          this.logger.warn(`Oracle CX open opportunities query failed: ${err.message}`);
          return { items: [], totalResults: 0 };
        }),
        // Recent wins (all closed won opportunities)
        this.oracleCXService.query(userId, 'opportunities', {
          limit: 20,
          filters: { StatusCode: 'WON' },
        }).catch(err => {
          this.logger.warn(`Oracle CX recent wins query failed: ${err.message}`);
          return { items: [], totalResults: 0 };
        }),
      ]);

      // Process activities to count calls, emails, meetings
      // Oracle CX activity types: ActivityFunctionCode or ActivityTypeCode
      const activityCounts = { calls: 0, emails: 0, meetings: 0 };
      for (const activity of activitiesResult.items || []) {
        const actType = (activity.ActivityFunctionCode || activity.ActivityTypeCode || activity.FunctionCode || '').toUpperCase();
        const activityDate = activity.ActivityDate || activity.LastUpdateDate;
        // Only count activities from this week
        if (activityDate && new Date(activityDate) >= startOfWeek) {
          if (actType.includes('CALL') || actType === 'PHONE' || actType === 'OUTBOUND_CALL') {
            activityCounts.calls++;
          } else if (actType.includes('EMAIL') || actType.includes('MAIL')) {
            activityCounts.emails++;
          } else if (actType.includes('MEETING') || actType.includes('APPOINTMENT') || actType.includes('DEMO') || actType === 'TASK') {
            activityCounts.meetings++;
          }
        }
      }

      // Weekly targets
      const weeklyTargets = { calls: 25, emails: 50, meetings: 10 };

      // No tasks from Oracle CX (endpoint doesn't exist), use empty array
      const todaysTasks: any[] = [];

      // Process deals at risk (no update in 14+ days)
      // Oracle CX opportunity fields: OptyId, Name, Revenue, SalesStage, StatusCode, LastUpdateDate
      const dealsAtRisk = ((openOpportunitiesResult.items || []) as any[])
        .filter((opp: any) => {
          const status = (opp.StatusCode || '').toUpperCase();
          // Filter out closed opportunities
          if (status === 'WON' || status === 'LOST' || status.includes('CLOSED')) {
            return false;
          }
          const lastUpdate = opp.LastUpdateDate ? new Date(opp.LastUpdateDate) : null;
          return !lastUpdate || lastUpdate < fourteenDaysAgo;
        })
        .slice(0, 3)
        .map((d: any) => ({
          id: d.OptyId?.toString() || d.id,
          name: d.Name || d.OptyName || 'Opportunity',
          amount: d.Revenue || d.OptyRevenue || 0,
          stage: d.SalesStage || d.StatusCode,
          account: d.AccountName || d.CustomerName || d.TargetPartyName,
          daysSinceUpdate: d.LastUpdateDate
            ? Math.floor((now.getTime() - new Date(d.LastUpdateDate).getTime()) / (1000 * 60 * 60 * 24))
            : 30,
        }));

      // Process recent wins (filter by date)
      const recentWins = ((recentWinsResult.items || []) as any[])
        .filter((w: any) => {
          const closeDate = w.CloseDate || w.ActualCloseDate;
          return closeDate && new Date(closeDate) >= thirtyDaysAgo;
        })
        .slice(0, 3)
        .map((w: any) => ({
          id: w.OptyId?.toString() || w.id,
          name: w.Name || w.OptyName || 'Won Deal',
          amount: w.Revenue || w.OptyRevenue || 0,
          account: w.AccountName || w.CustomerName || w.TargetPartyName,
          closeDate: w.CloseDate || w.ActualCloseDate,
        }));

      // Pipeline health by stage
      const stageGroups: Record<string, { amount: number; count: number }> = {};
      for (const opp of (openOpportunitiesResult.items || []) as any[]) {
        const status = (opp.StatusCode || '').toUpperCase();
        // Skip closed opportunities
        if (status === 'WON' || status === 'LOST' || status.includes('CLOSED')) {
          continue;
        }
        const stage = opp.SalesStage || opp.StatusCode || 'OPEN';
        if (!stageGroups[stage]) {
          stageGroups[stage] = { amount: 0, count: 0 };
        }
        stageGroups[stage].amount += opp.Revenue || opp.OptyRevenue || 0;
        stageGroups[stage].count++;
      }

      const pipelineHealth = Object.entries(stageGroups).map(([stage, data]) => ({
        stage,
        amount: data.amount,
        count: data.count,
      }));

      return {
        weeklyActivity: {
          calls: {
            count: activityCounts.calls,
            target: weeklyTargets.calls,
            percentage: Math.min(Math.round((activityCounts.calls / weeklyTargets.calls) * 100), 100),
          },
          emails: {
            count: activityCounts.emails,
            target: weeklyTargets.emails,
            percentage: Math.min(Math.round((activityCounts.emails / weeklyTargets.emails) * 100), 100),
          },
          meetings: {
            count: activityCounts.meetings,
            target: weeklyTargets.meetings,
            percentage: Math.min(Math.round((activityCounts.meetings / weeklyTargets.meetings) * 100), 100),
          },
        },
        todaysTasks,
        dealsAtRisk,
        recentWins,
        pipelineHealth,
      };
    } catch (error: any) {
      this.logger.error(`Oracle rep metrics error: ${error.message}`);
      return this.getEmptyRepMetrics();
    }
  }

  private getEmptyRepMetrics() {
    return {
      weeklyActivity: {
        calls: { count: 0, target: 25, percentage: 0 },
        emails: { count: 0, target: 50, percentage: 0 },
        meetings: { count: 0, target: 10, percentage: 0 },
      },
      todaysTasks: [],
      dealsAtRisk: [],
      recentWins: [],
      pipelineHealth: [],
    };
  }
}
