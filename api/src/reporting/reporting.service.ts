import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ReportType,
  ChartType,
  DateRange,
  GroupBy,
  ReportFilterDto,
  ReportResult,
  PipelineReport,
  WinRateReport,
  ActivityReport,
  RevenueReport,
  LeadConversionReport,
} from './dto/report.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a report based on type and filters
   */
  async generateReport(
    type: ReportType,
    userId: string,
    organizationId: string,
    filters: ReportFilterDto = {},
    groupBy?: GroupBy,
    isAdmin?: boolean,
  ): Promise<ReportResult> {
    const dateFilters = this.getDateFilters(filters);

    switch (type) {
      case ReportType.PIPELINE:
        return this.generatePipelineReport(userId, organizationId, dateFilters, isAdmin);
      case ReportType.WIN_RATE:
        return this.generateWinRateReport(userId, organizationId, dateFilters, groupBy, isAdmin);
      case ReportType.ACTIVITY:
        return this.generateActivityReport(userId, organizationId, dateFilters, groupBy, isAdmin);
      case ReportType.REVENUE:
        return this.generateRevenueReport(userId, organizationId, dateFilters, isAdmin);
      case ReportType.LEAD_CONVERSION:
        return this.generateLeadConversionReport(userId, organizationId, dateFilters, isAdmin);
      case ReportType.FORECAST:
        return this.generateForecastReport(userId, organizationId, dateFilters, isAdmin);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  /**
   * Pipeline Report - Shows opportunities by stage
   */
  async generatePipelineReport(
    userId: string,
    organizationId: string,
    dateFilters: { gte?: Date; lte?: Date },
    isAdmin?: boolean,
  ): Promise<ReportResult> {
    const where: any = {
      isClosed: false,
      organizationId,
      ...(dateFilters.gte && { createdAt: { gte: dateFilters.gte } }),
    };
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const opportunities = await this.prisma.opportunity.groupBy({
      by: ['stage'],
      where,
      _sum: { amount: true, expectedRevenue: true },
      _count: { id: true },
    });

    const total = opportunities.reduce((sum, s) => sum + (s._sum.amount || 0), 0);
    const totalCount = opportunities.reduce((sum, s) => sum + s._count.id, 0);

    const stageOrder = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

    const data = opportunities
      .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage))
      .map((s) => ({
        label: this.formatStage(s.stage),
        value: s._sum.amount || 0,
        metadata: {
          count: s._count.id,
          percentage: total > 0 ? Math.round((s._sum.amount || 0) / total * 100) : 0,
          expectedRevenue: s._sum.expectedRevenue || 0,
        },
      }));

    return {
      id: uuidv4(),
      type: ReportType.PIPELINE,
      title: 'Sales Pipeline',
      description: 'Active opportunities by stage',
      chartType: ChartType.FUNNEL,
      data: [{ name: 'Pipeline Value', data }],
      summary: {
        total,
        count: totalCount,
        average: totalCount > 0 ? Math.round(total / totalCount) : 0,
      },
      generatedAt: new Date(),
      filters: dateFilters as any,
    };
  }

  /**
   * Win Rate Report - Shows closed won vs lost
   */
  async generateWinRateReport(
    userId: string,
    organizationId: string,
    dateFilters: { gte?: Date; lte?: Date },
    groupBy?: GroupBy,
    isAdmin?: boolean,
  ): Promise<ReportResult> {
    const where: any = {
      isClosed: true,
      organizationId,
      ...(dateFilters.gte && { closedDate: { gte: dateFilters.gte, lte: dateFilters.lte } }),
    };
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const [closedWon, closedLost, byOwner] = await Promise.all([
      this.prisma.opportunity.count({ where: { ...where, isWon: true } }),
      this.prisma.opportunity.count({ where: { ...where, isWon: false } }),
      this.prisma.opportunity.groupBy({
        by: ['ownerId'],
        where,
        _count: { id: true },
      }),
    ]);

    const total = closedWon + closedLost;
    const winRate = total > 0 ? Math.round((closedWon / total) * 100) : 0;

    // Get owner details
    const ownerIds = byOwner.map((o) => o.ownerId);
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true },
    });

    const ownerMap = new Map(owners.map((o) => [o.id, o.name]));

    // Get win rate by owner
    const wonByOwner = await this.prisma.opportunity.groupBy({
      by: ['ownerId'],
      where: { ...where, isWon: true },
      _count: { id: true },
    });

    const wonMap = new Map(wonByOwner.map((w) => [w.ownerId, w._count.id]));

    const ownerData = byOwner.map((o) => {
      const won = wonMap.get(o.ownerId) || 0;
      const ownerTotal = o._count.id;
      return {
        label: ownerMap.get(o.ownerId) || 'Unknown',
        value: ownerTotal > 0 ? Math.round((won / ownerTotal) * 100) : 0,
        metadata: {
          won,
          lost: ownerTotal - won,
          total: ownerTotal,
        },
      };
    });

    return {
      id: uuidv4(),
      type: ReportType.WIN_RATE,
      title: 'Win Rate Analysis',
      description: 'Closed won vs lost opportunities',
      chartType: ChartType.PIE,
      data: [
        {
          name: 'Win/Loss',
          data: [
            { label: 'Won', value: closedWon, metadata: { percentage: winRate } },
            { label: 'Lost', value: closedLost, metadata: { percentage: 100 - winRate } },
          ],
        },
        {
          name: 'By Owner',
          data: ownerData,
        },
      ],
      summary: {
        total,
        average: winRate,
        topItems: ownerData.slice(0, 5).map((o) => ({ label: o.label, value: o.value })),
      },
      generatedAt: new Date(),
      filters: dateFilters as any,
    };
  }

  /**
   * Activity Report - Shows activities by type
   */
  async generateActivityReport(
    userId: string,
    organizationId: string,
    dateFilters: { gte?: Date; lte?: Date },
    groupBy?: GroupBy,
    isAdmin?: boolean,
  ): Promise<ReportResult> {
    const where: any = {
      organizationId,
      ...(dateFilters.gte && { activityDate: { gte: dateFilters.gte, lte: dateFilters.lte } }),
    };
    if (!isAdmin) {
      where.userId = userId;
    }

    const [byType, byUser, total] = await Promise.all([
      this.prisma.activity.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
      this.prisma.activity.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
      }),
      this.prisma.activity.count({ where }),
    ]);

    // Get user details
    const userIds = byUser.map((u) => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const typeData = byType.map((t) => ({
      label: this.formatActivityType(t.type),
      value: t._count.id,
      metadata: { percentage: Math.round((t._count.id / total) * 100) },
    }));

    const userData = byUser.map((u) => ({
      label: userMap.get(u.userId) || 'Unknown',
      value: u._count.id,
    }));

    return {
      id: uuidv4(),
      type: ReportType.ACTIVITY,
      title: 'Activity Report',
      description: 'Sales activities by type and owner',
      chartType: ChartType.BAR,
      data: [
        { name: 'By Type', data: typeData },
        { name: 'By Owner', data: userData },
      ],
      summary: {
        total,
        topItems: typeData.slice(0, 5).map((t) => ({ label: t.label, value: t.value })),
      },
      generatedAt: new Date(),
      filters: dateFilters as any,
    };
  }

  /**
   * Revenue Report - Shows closed won revenue
   */
  async generateRevenueReport(
    userId: string,
    organizationId: string,
    dateFilters: { gte?: Date; lte?: Date },
    isAdmin?: boolean,
  ): Promise<ReportResult> {
    const where: any = {
      isWon: true,
      organizationId,
      ...(dateFilters.gte && { closedDate: { gte: dateFilters.gte, lte: dateFilters.lte } }),
    };
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const pipelineWhere: any = {
      isClosed: false,
      organizationId,
    };
    if (!isAdmin) {
      pipelineWhere.ownerId = userId;
    }

    const [closedWon, pipeline, byOwner] = await Promise.all([
      this.prisma.opportunity.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.opportunity.aggregate({
        where: pipelineWhere,
        _sum: { amount: true, expectedRevenue: true },
      }),
      this.prisma.opportunity.groupBy({
        by: ['ownerId'],
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Get owner details
    const ownerIds = byOwner.map((o) => o.ownerId);
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true },
    });

    const ownerMap = new Map(owners.map((o) => [o.id, o.name]));

    const ownerData = byOwner
      .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0))
      .map((o) => ({
        label: ownerMap.get(o.ownerId) || 'Unknown',
        value: o._sum.amount || 0,
        metadata: { count: o._count.id },
      }));

    const totalClosed = closedWon._sum.amount || 0;
    const totalPipeline = pipeline._sum.amount || 0;
    const expectedRevenue = pipeline._sum.expectedRevenue || 0;

    return {
      id: uuidv4(),
      type: ReportType.REVENUE,
      title: 'Revenue Report',
      description: 'Closed won revenue and pipeline',
      chartType: ChartType.BAR,
      data: [
        {
          name: 'Revenue',
          data: [
            { label: 'Closed Won', value: totalClosed },
            { label: 'Pipeline', value: totalPipeline },
            { label: 'Expected', value: expectedRevenue },
          ],
        },
        { name: 'By Owner', data: ownerData },
      ],
      summary: {
        total: totalClosed,
        count: closedWon._count.id,
        average: closedWon._count.id > 0 ? Math.round(totalClosed / closedWon._count.id) : 0,
        topItems: ownerData.slice(0, 5).map((o) => ({ label: o.label, value: o.value })),
      },
      generatedAt: new Date(),
      filters: dateFilters as any,
    };
  }

  /**
   * Lead Conversion Report
   */
  async generateLeadConversionReport(
    userId: string,
    organizationId: string,
    dateFilters: { gte?: Date; lte?: Date },
    isAdmin?: boolean,
  ): Promise<ReportResult> {
    const where: any = {
      organizationId,
      ...(dateFilters.gte && { createdAt: { gte: dateFilters.gte, lte: dateFilters.lte } }),
    };
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const [total, converted, bySource] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: 'CONVERTED' } }),
      this.prisma.lead.groupBy({
        by: ['leadSource'],
        where,
        _count: { id: true },
      }),
    ]);

    // Get converted count by source
    const convertedBySource = await this.prisma.lead.groupBy({
      by: ['leadSource'],
      where: { ...where, status: 'CONVERTED' },
      _count: { id: true },
    });

    const convertedMap = new Map(convertedBySource.map((c) => [c.leadSource, c._count.id]));

    const sourceData = bySource
      .sort((a, b) => b._count.id - a._count.id)
      .map((s) => {
        const sourceConverted = convertedMap.get(s.leadSource) || 0;
        return {
          label: s.leadSource || 'Unknown',
          value: s._count.id > 0 ? Math.round((sourceConverted / s._count.id) * 100) : 0,
          metadata: {
            total: s._count.id,
            converted: sourceConverted,
          },
        };
      });

    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    return {
      id: uuidv4(),
      type: ReportType.LEAD_CONVERSION,
      title: 'Lead Conversion Report',
      description: 'Lead conversion rates by source',
      chartType: ChartType.BAR,
      data: [
        {
          name: 'Overall',
          data: [
            { label: 'Converted', value: converted },
            { label: 'Not Converted', value: total - converted },
          ],
        },
        { name: 'By Source', data: sourceData },
      ],
      summary: {
        total,
        count: converted,
        average: conversionRate,
        topItems: sourceData.slice(0, 5).map((s) => ({ label: s.label, value: s.value })),
      },
      generatedAt: new Date(),
      filters: dateFilters as any,
    };
  }

  /**
   * Forecast Report
   */
  async generateForecastReport(
    userId: string,
    organizationId: string,
    dateFilters: { gte?: Date; lte?: Date },
    isAdmin?: boolean,
  ): Promise<ReportResult> {
    const now = new Date();
    const endOfQuarter = new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 0);

    const where: any = {
      isClosed: false,
      organizationId,
      closeDate: { lte: endOfQuarter },
    };
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const closedThisQuarterWhere: any = {
      isWon: true,
      organizationId,
      closedDate: {
        gte: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      },
    };
    if (!isAdmin) {
      closedThisQuarterWhere.ownerId = userId;
    }

    const [byStage, closedThisQuarter] = await Promise.all([
      this.prisma.opportunity.groupBy({
        by: ['stage'],
        where,
        _sum: { amount: true, expectedRevenue: true },
        _count: { id: true },
      }),
      this.prisma.opportunity.aggregate({
        where: closedThisQuarterWhere,
        _sum: { amount: true },
      }),
    ]);

    const stageWeights: Record<string, number> = {
      PROSPECTING: 0.1,
      QUALIFICATION: 0.25,
      PROPOSAL: 0.5,
      NEGOTIATION: 0.75,
    };

    let weightedForecast = 0;
    const stageData = byStage.map((s) => {
      const weight = stageWeights[s.stage] || 0.5;
      const weighted = (s._sum.amount || 0) * weight;
      weightedForecast += weighted;

      return {
        label: this.formatStage(s.stage),
        value: s._sum.amount || 0,
        metadata: {
          count: s._count.id,
          weighted,
          probability: Math.round(weight * 100),
        },
      };
    });

    const closedAmount = closedThisQuarter._sum.amount || 0;
    const totalForecast = closedAmount + weightedForecast;

    return {
      id: uuidv4(),
      type: ReportType.FORECAST,
      title: 'Sales Forecast',
      description: 'Predicted revenue for current quarter',
      chartType: ChartType.BAR,
      data: [
        {
          name: 'Forecast',
          data: [
            { label: 'Closed', value: closedAmount },
            { label: 'Weighted Pipeline', value: weightedForecast },
            { label: 'Total Forecast', value: totalForecast },
          ],
        },
        { name: 'By Stage', data: stageData },
      ],
      summary: {
        total: totalForecast,
        topItems: [
          { label: 'Closed', value: closedAmount },
          { label: 'Forecast', value: weightedForecast },
        ],
      },
      generatedAt: new Date(),
      filters: dateFilters as any,
    };
  }

  /**
   * Get available report types
   */
  getReportTypes() {
    return [
      { type: ReportType.PIPELINE, title: 'Sales Pipeline', description: 'View opportunities by stage' },
      { type: ReportType.WIN_RATE, title: 'Win Rate Analysis', description: 'Analyze win/loss ratios' },
      { type: ReportType.ACTIVITY, title: 'Activity Report', description: 'Track sales activities' },
      { type: ReportType.REVENUE, title: 'Revenue Report', description: 'Closed won and pipeline value' },
      { type: ReportType.LEAD_CONVERSION, title: 'Lead Conversion', description: 'Lead conversion rates' },
      { type: ReportType.FORECAST, title: 'Sales Forecast', description: 'Predicted revenue' },
    ];
  }

  // Helper methods
  private getDateFilters(filters: ReportFilterDto): { gte?: Date; lte?: Date } {
    if (filters.startDate || filters.endDate) {
      return {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      };
    }

    const now = new Date();
    switch (filters.dateRange) {
      case DateRange.TODAY:
        return { gte: new Date(now.setHours(0, 0, 0, 0)) };
      case DateRange.THIS_WEEK:
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return { gte: startOfWeek };
      case DateRange.THIS_MONTH:
        return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      case DateRange.THIS_QUARTER:
        return { gte: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1) };
      case DateRange.THIS_YEAR:
        return { gte: new Date(now.getFullYear(), 0, 1) };
      case DateRange.LAST_MONTH:
        return {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lte: new Date(now.getFullYear(), now.getMonth(), 0),
        };
      case DateRange.LAST_QUARTER:
        const lastQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
        const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
        return { gte: lastQuarterStart, lte: lastQuarterEnd };
      default:
        // Default to this quarter
        return { gte: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1) };
    }
  }

  private formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private formatActivityType(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
