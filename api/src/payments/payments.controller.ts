// Payments Controller - REST API endpoints for payment operations
import {
  Controller,
  Get,
  Post,
  Put,
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
  Res,
  StreamableFile,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

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
import {
  CreateCheckoutSessionDto,
  UpdateBillingCustomerDto,
  CancelSubscriptionDto,
  ChangeSubscriptionPlanDto,
  AddPaymentMethodDto,
  SetDefaultPaymentMethodDto,
  ValidateCouponDto,
  CreateCouponDto,
  UpdateCouponDto,
  RefundPaymentDto,
  UpdateLicenseTypePricingDto,
  ListSubscriptionsQueryDto,
  ListInvoicesQueryDto,
  ListPaymentsQueryDto,
  ListCouponsQueryDto,
  UpdateGatewayConfigDto,
  TestGatewayConnectionDto,
} from './dto';
import { GatewayConfigService } from './gateway-config.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { PaymentGateway } from '@prisma/client';

// ============= Public Controller (No Auth Required) =============
@Controller('payments/public')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('coupons/validate')
  @HttpCode(HttpStatus.OK)
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.paymentsService.validateCoupon(dto);
  }
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly gatewayConfigService: GatewayConfigService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  // ============= Checkout =============

  @Post('checkout')
  async createCheckoutSession(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentsService.createCheckoutSession(req.user.id, dto);
  }

  // ============= Billing Customer =============

  @Get('billing/customer')
  async getBillingCustomer(@Request() req: any) {
    this.logger.debug(`getBillingCustomer called for userId: ${req.user?.id}`);
    return this.paymentsService.getBillingCustomer(req.user?.id);
  }

  @Put('billing/customer')
  async updateBillingCustomer(
    @Request() req: any,
    @Body() dto: UpdateBillingCustomerDto,
  ) {
    return this.paymentsService.updateBillingCustomer(req.user.id, dto);
  }

  @Post('billing/portal')
  async createCustomerPortalSession(@Request() req: any) {
    return this.paymentsService.createCustomerPortalSession(req.user.id);
  }

  // ============= Subscriptions =============

  @Get('subscriptions')
  async getSubscriptions(
    @Request() req: any,
    @Query() query: ListSubscriptionsQueryDto,
  ) {
    this.logger.debug(`getSubscriptions called for userId: ${req.user?.id}`);
    return this.paymentsService.getSubscriptions(req.user?.id, query);
  }

  @Get('subscriptions/:id')
  async getSubscription(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.paymentsService.getSubscription(req.user.id, id);
  }

  @Post('subscriptions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.paymentsService.cancelSubscription(req.user.id, id, dto);
  }

  @Post('subscriptions/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeSubscription(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.paymentsService.resumeSubscription(req.user.id, id);
  }

  @Post('subscriptions/:id/change-plan')
  @HttpCode(HttpStatus.OK)
  async changeSubscriptionPlan(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ChangeSubscriptionPlanDto,
  ) {
    return this.paymentsService.changeSubscriptionPlan(req.user.id, id, dto);
  }

  @Get('subscriptions/:id/upgrade-preview')
  async previewSubscriptionChange(
    @Request() req: any,
    @Param('id') id: string,
    @Query('newLicenseTypeId') newLicenseTypeId: string,
    @Query('billingCycle') billingCycle?: 'monthly' | 'yearly',
  ) {
    return this.paymentsService.previewSubscriptionChange(req.user.id, id, newLicenseTypeId, billingCycle);
  }

  // ============= Invoices =============

  @Get('invoices')
  async getInvoices(
    @Request() req: any,
    @Query() query: ListInvoicesQueryDto,
  ) {
    this.logger.debug(`getInvoices called for userId: ${req.user?.id}`);
    return this.paymentsService.getInvoices(req.user?.id, query);
  }

  @Get('invoices/:id')
  async getInvoice(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.paymentsService.getInvoice(req.user.id, id);
  }

  @Get('invoices/:id/pdf')
  async downloadInvoicePdf(
    @Request() req: any,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Verify user has access to this invoice
    const invoice = await this.paymentsService.getInvoice(req.user.id, id);

    // Generate PDF
    const pdfBuffer = await this.invoicePdfService.generateInvoicePdf(id);

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }

  // ============= Payment Methods =============

  @Get('payment-methods')
  async getPaymentMethods(@Request() req: any) {
    return this.paymentsService.getPaymentMethods(req.user.id);
  }

  @Post('payment-methods')
  async addPaymentMethod(
    @Request() req: any,
    @Body() dto: AddPaymentMethodDto,
  ) {
    return this.paymentsService.addPaymentMethod(req.user.id, dto);
  }

  @Delete('payment-methods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.paymentsService.removePaymentMethod(req.user.id, id);
  }

  @Put('payment-methods/:id/default')
  async setDefaultPaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.paymentsService.setDefaultPaymentMethod(req.user.id, id);
  }

  // ============= Coupons (Public) =============

  @Post('coupons/validate')
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @Request() req: any,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.paymentsService.validateCoupon(dto, req.user.id);
  }
}

// ============= Admin Controller =============

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly gatewayConfigService: GatewayConfigService,
  ) {}

  // ============= Dashboard =============

  @Get('dashboard')
  async getDashboard() {
    return this.paymentsService.getPaymentsDashboard();
  }

  // ============= Gateway Configuration =============

  @Get('gateways')
  async getGatewayConfigs() {
    return this.gatewayConfigService.getGatewayConfigs();
  }

  @Get('gateways/:provider')
  async getGatewayConfig(@Param('provider') provider: PaymentGateway) {
    return this.gatewayConfigService.getGatewayConfig(provider);
  }

  @Put('gateways/:provider')
  async updateGatewayConfig(
    @Param('provider') provider: PaymentGateway,
    @Body() dto: UpdateGatewayConfigDto,
  ) {
    return this.gatewayConfigService.updateGatewayConfig(provider, dto);
  }

  @Post('gateways/:provider/test')
  @HttpCode(HttpStatus.OK)
  async testGatewayConnection(@Param('provider') provider: PaymentGateway) {
    return this.gatewayConfigService.testConnection(provider);
  }

  // ============= Transactions =============

  @Get('transactions')
  async getTransactions(@Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.getAllPayments(query);
  }

  @Post('transactions/:id/refund')
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(id, dto);
  }

  // ============= Coupons =============

  @Get('coupons')
  async getCoupons(@Query() query: ListCouponsQueryDto) {
    return this.paymentsService.getAllCoupons(query);
  }

  @Post('coupons')
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.paymentsService.createCoupon(dto);
  }

  @Put('coupons/:id')
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.paymentsService.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCoupon(@Param('id') id: string) {
    return this.paymentsService.deleteCoupon(id);
  }

  // ============= Pricing =============

  @Put('pricing/:licenseTypeId')
  async updatePricing(
    @Param('licenseTypeId') licenseTypeId: string,
    @Body() dto: UpdateLicenseTypePricingDto,
  ) {
    return this.paymentsService.updateLicenseTypePricing(licenseTypeId, dto);
  }

  // ============= Stripe Sync =============

  @Post('sync/stripe')
  @HttpCode(HttpStatus.OK)
  async syncStripeData() {
    return this.paymentsService.syncStripeData();
  }
}
