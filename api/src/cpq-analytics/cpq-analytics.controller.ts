import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CpqAnalyticsService } from './cpq-analytics.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('CPQ Analytics')
@ApiBearerAuth('JWT')
@Controller('analytics/cpq')
@UseGuards(JwtAuthGuard)
export class CpqAnalyticsController {
  constructor(private readonly cpqAnalyticsService: CpqAnalyticsService) {}

  @Get('dashboard')
  async getDashboard(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getDashboard(req.user.userId, isAdmin, organizationId);
  }

  @Get('trends')
  async getTrends(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const range = groupBy === 'day' ? 30 : groupBy === 'week' ? 12 : 12;
    return this.cpqAnalyticsService.getQuotesTrend(
      req.user.userId,
      isAdmin,
      organizationId,
      groupBy,
      range,
    );
  }

  @Get('quote-pipeline')
  async getQuotePipeline(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const result = await this.cpqAnalyticsService.getQuotePipeline(req.user.userId, isAdmin, organizationId);
    return result.stages; // Return just the stages array
  }

  @Get('top-products')
  async getTopProducts(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'revenue' | 'quantity' | 'orders',
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getTopProducts(
      req.user.userId,
      isAdmin,
      organizationId,
      parseInt(limit || '5', 10),
      sortBy || 'revenue',
    );
  }

  @Get('top-accounts')
  async getTopAccounts(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getTopAccounts(
      req.user.userId,
      isAdmin,
      organizationId,
      parseInt(limit || '5', 10),
    );
  }

  @Get('sales-rep-performance')
  async getSalesRepPerformance(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getSalesRepPerformance(
      req.user.userId,
      isAdmin,
      organizationId,
    );
  }

  @Get('forecast')
  async getForecast(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('periods') periods?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getForecast(
      req.user.userId,
      isAdmin,
      organizationId,
      parseInt(periods || '3', 10),
    );
  }

  @Get('conversion-funnel')
  async getConversionFunnel(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getConversionFunnel(
      req.user.userId,
      isAdmin,
      organizationId,
    );
  }

  @Get('win-loss')
  async getWinLossAnalysis(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getWinLossAnalysis(
      req.user.userId,
      isAdmin,
      organizationId,
    );
  }

  @Get('snapshots')
  async getSnapshots(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getSnapshots(req.user.userId, isAdmin, organizationId);
  }

  @Post('snapshots')
  async createSnapshot(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.createSnapshot(req.user.userId, isAdmin, organizationId);
  }

  @Get('quotes/trend')
  async getQuotesTrend(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'month',
    @Query('range') range: string = '12',
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getQuotesTrend(
      req.user.userId,
      isAdmin,
      organizationId,
      period,
      parseInt(range, 10) || 12,
    );
  }

  @Get('orders/trend')
  async getOrdersTrend(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'month',
    @Query('range') range: string = '12',
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getOrdersTrend(
      req.user.userId,
      isAdmin,
      organizationId,
      period,
      parseInt(range, 10) || 12,
    );
  }

  @Get('products/performance')
  async getProductPerformance(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getProductPerformance(
      req.user.userId,
      isAdmin,
      organizationId,
    );
  }

  @Get('quotes/age-analysis')
  async getQuoteAgeAnalysis(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.cpqAnalyticsService.getQuoteAgeAnalysis(
      req.user.userId,
      isAdmin,
      organizationId,
    );
  }
}
