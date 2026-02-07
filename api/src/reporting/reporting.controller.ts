import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { ReportingService } from './reporting.service';
import { GenerateReportDto, ReportType, DateRange, GroupBy } from './dto/report.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * Get available report types
   */
  @Get('types')
  getReportTypes() {
    return this.reportingService.getReportTypes();
  }

  /**
   * Generate a report
   */
  @Post('generate')
  async generateReport(
    @Request() req,
    @Body() dto: GenerateReportDto,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.reportingService.generateReport(
      dto.type,
      userId,
      organizationId,
      dto.filters,
      dto.groupBy,
      isAdmin,
    );
  }

  /**
   * Get pipeline report
   */
  @Get('pipeline')
  async getPipelineReport(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('dateRange') dateRange?: DateRange,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.reportingService.generateReport(
      ReportType.PIPELINE,
      userId,
      organizationId,
      { dateRange, startDate, endDate },
      undefined,
      isAdmin,
    );
  }

  /**
   * Get win rate report
   */
  @Get('win-rate')
  async getWinRateReport(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('dateRange') dateRange?: DateRange,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: GroupBy,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.reportingService.generateReport(
      ReportType.WIN_RATE,
      userId,
      organizationId,
      { dateRange, startDate, endDate },
      groupBy,
      isAdmin,
    );
  }

  /**
   * Get activity report
   */
  @Get('activities')
  async getActivityReport(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('dateRange') dateRange?: DateRange,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: GroupBy,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.reportingService.generateReport(
      ReportType.ACTIVITY,
      userId,
      organizationId,
      { dateRange, startDate, endDate },
      groupBy,
      isAdmin,
    );
  }

  /**
   * Get revenue report
   */
  @Get('revenue')
  async getRevenueReport(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('dateRange') dateRange?: DateRange,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.reportingService.generateReport(
      ReportType.REVENUE,
      userId,
      organizationId,
      { dateRange, startDate, endDate },
      undefined,
      isAdmin,
    );
  }

  /**
   * Get lead conversion report
   */
  @Get('lead-conversion')
  async getLeadConversionReport(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('dateRange') dateRange?: DateRange,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.reportingService.generateReport(
      ReportType.LEAD_CONVERSION,
      userId,
      organizationId,
      { dateRange, startDate, endDate },
      undefined,
      isAdmin,
    );
  }

  /**
   * Get sales forecast
   */
  @Get('forecast')
  async getForecastReport(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.reportingService.generateReport(
      ReportType.FORECAST,
      userId,
      organizationId,
      {},
      undefined,
      isAdmin,
    );
  }
}
