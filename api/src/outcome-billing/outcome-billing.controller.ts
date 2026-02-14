// Outcome Billing Controller - REST API endpoints for outcome-based billing
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  SetMetadata,
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { OutcomeBillingService } from './outcome-billing.service';
import { OutcomeInvoiceGeneratorService } from './outcome-invoice-generator.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import {
  CreateOutcomePricingPlanDto,
  UpdateOutcomePricingPlanDto,
  ListOutcomeEventsQueryDto,
  ListOutcomePlansQueryDto,
  WaiveEventDto,
  VoidEventDto,
  ResolveReviewDto,
} from './dto';

// Role-based access control
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;
    const request = context.switchToHttp().getRequest();
    return roles.includes(request.user?.role);
  }
}

// ============= Organization Endpoints (User's own org) =============

@ApiTags('Outcome Billing')
@ApiBearerAuth('JWT')
@Controller('outcome-billing')
@UseGuards(JwtAuthGuard)
export class OutcomeBillingController {
  private readonly logger = new Logger(OutcomeBillingController.name);

  constructor(private readonly outcomeBillingService: OutcomeBillingService) {}

  /**
   * Get the current user's organization pricing plan.
   */
  @Get('plan')
  async getMyPlan(@Request() req: any) {
    const organizationId = req.headers['x-organization-id'];
    if (!organizationId) {
      return null;
    }
    return this.outcomeBillingService.getPricingPlanByOrganization(
      organizationId,
    );
  }

  /**
   * Get outcome events for the current user's organization.
   */
  @Get('events')
  async getMyEvents(
    @Request() req: any,
    @Query() query: ListOutcomeEventsQueryDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    if (!organizationId) {
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
    return this.outcomeBillingService.getOutcomeEvents({
      ...query,
      organizationId,
    });
  }

  /**
   * Get billing statistics for the current user's organization.
   */
  @Get('stats')
  async getMyStats(@Request() req: any) {
    const organizationId = req.headers['x-organization-id'];
    if (!organizationId) {
      return null;
    }
    return this.outcomeBillingService.getOutcomeBillingStats(organizationId);
  }
}

// ============= Admin Endpoints =============

@ApiTags('Outcome Billing')
@ApiBearerAuth('JWT')
@Controller('admin/outcome-billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminOutcomeBillingController {
  private readonly logger = new Logger(AdminOutcomeBillingController.name);

  constructor(
    private readonly outcomeBillingService: OutcomeBillingService,
    private readonly invoiceGeneratorService: OutcomeInvoiceGeneratorService,
  ) {}

  // ============= Dashboard =============

  @Get('dashboard')
  async getDashboard() {
    return this.outcomeBillingService.getAdminDashboardStats();
  }

  // ============= Pricing Plans =============

  @Post('plans')
  async createPlan(@Body() dto: CreateOutcomePricingPlanDto) {
    return this.outcomeBillingService.createPricingPlan(dto);
  }

  @Get('plans')
  async listPlans(@Query() query: ListOutcomePlansQueryDto) {
    return this.outcomeBillingService.listPricingPlans(query);
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') id: string) {
    return this.outcomeBillingService.getPricingPlanById(id);
  }

  @Get('plans/organization/:orgId')
  async getPlanByOrganization(@Param('orgId') orgId: string) {
    return this.outcomeBillingService.getPricingPlanByOrganization(orgId);
  }

  @Patch('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateOutcomePricingPlanDto,
  ) {
    return this.outcomeBillingService.updatePricingPlan(id, dto);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlan(@Param('id') id: string) {
    await this.outcomeBillingService.deletePricingPlan(id);
  }

  // ============= Outcome Events =============

  @Get('events')
  async listEvents(@Query() query: ListOutcomeEventsQueryDto) {
    return this.outcomeBillingService.getOutcomeEvents(query);
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: string) {
    return this.outcomeBillingService.getOutcomeEventById(id);
  }

  @Post('events/:id/waive')
  @HttpCode(HttpStatus.OK)
  async waiveEvent(
    @Param('id') id: string,
    @Body() dto: WaiveEventDto,
    @Request() req: any,
  ) {
    return this.outcomeBillingService.waiveEvent(id, dto.reason, req.user.id);
  }

  @Post('events/:id/void')
  @HttpCode(HttpStatus.OK)
  async voidEvent(
    @Param('id') id: string,
    @Body() dto: VoidEventDto,
    @Request() req: any,
  ) {
    return this.outcomeBillingService.voidEvent(id, dto.reason, req.user.id);
  }

  @Post('events/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveReview(
    @Param('id') id: string,
    @Body() dto: ResolveReviewDto,
    @Request() req: any,
  ) {
    return this.outcomeBillingService.resolveReview(
      id,
      dto.action,
      dto.reason,
      req.user.id,
    );
  }

  // ============= Invoice Generation =============

  @Post('generate-invoice/:orgId')
  @HttpCode(HttpStatus.OK)
  async generateInvoice(@Param('orgId') orgId: string) {
    return this.invoiceGeneratorService.generateOutcomeInvoice(orgId);
  }

  @Post('process-billing')
  @HttpCode(HttpStatus.OK)
  async processBilling() {
    await this.invoiceGeneratorService.processOutcomeBilling();
    return { message: 'Billing processed successfully' };
  }

  // ============= Organization Stats =============

  @Get('stats/:orgId')
  async getOrganizationStats(@Param('orgId') orgId: string) {
    return this.outcomeBillingService.getOutcomeBillingStats(orgId);
  }
}
