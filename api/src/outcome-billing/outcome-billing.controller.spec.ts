import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  OutcomeBillingController,
  AdminOutcomeBillingController,
} from './outcome-billing.controller';
import { OutcomeBillingService } from './outcome-billing.service';
import { OutcomeInvoiceGeneratorService } from './outcome-invoice-generator.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('Outcome Billing Controllers', () => {
  // ============= Shared Mock Data =============

  const mockPlan = {
    id: 'plan-1',
    organizationId: 'org-1',
    pricingModel: 'REVENUE_SHARE',
    revenueSharePercent: 2.5,
    isActive: true,
    organization: { id: 'org-1', name: 'Test Corp', slug: 'test-corp' },
  };

  const mockEvent = {
    id: 'event-1',
    organizationId: 'org-1',
    outcomePricingPlanId: 'plan-1',
    opportunityId: 'opp-1',
    opportunityName: 'Big Deal',
    accountName: 'Acme Inc',
    dealAmount: 2500000,
    feeAmount: 62500,
    status: 'PENDING',
  };

  const mockStats = {
    currentPeriodStart: new Date('2026-02-01'),
    currentPeriodEnd: new Date('2026-02-28'),
    currentPeriodFees: 62500,
    currentPeriodDeals: 1,
    currentPeriodDealValue: 2500000,
    monthlyCap: null,
    capRemaining: null,
    capUtilizationPercent: null,
    lastPeriodFees: 0,
    lastPeriodDeals: 0,
    totalLifetimeFees: 125000,
    totalLifetimeDeals: 5,
    pricingModel: 'REVENUE_SHARE',
    planDetails: { revenueSharePercent: 2.5 },
  };

  const mockDashboardStats = {
    activePlans: 3,
    pendingEvents: 5,
    flaggedForReview: 1,
    currentMonthFees: 150000,
    currentMonthDeals: 4,
    currentMonthDealValue: 6000000,
    totalLifetimeRevenue: 500000,
  };

  const mockInvoice = {
    id: 'inv-1',
    invoiceNumber: 'OBB-ORG001-TEST',
    total: 87500,
    status: 'OPEN',
    lineItems: [],
  };

  const paginatedEvents = {
    data: [mockEvent],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const paginatedPlans = {
    data: [mockPlan],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  // ============= Service Mocks =============

  const mockBillingService = {
    getPricingPlanByOrganization: jest.fn(),
    getOutcomeEvents: jest.fn(),
    getOutcomeBillingStats: jest.fn(),
    getAdminDashboardStats: jest.fn(),
    createPricingPlan: jest.fn(),
    listPricingPlans: jest.fn(),
    getPricingPlanById: jest.fn(),
    updatePricingPlan: jest.fn(),
    deletePricingPlan: jest.fn(),
    getOutcomeEventById: jest.fn(),
    waiveEvent: jest.fn(),
    voidEvent: jest.fn(),
    resolveReview: jest.fn(),
  };

  const mockInvoiceService = {
    generateOutcomeInvoice: jest.fn(),
    processOutcomeBilling: jest.fn(),
  };

  // ============================================================
  // OutcomeBillingController (User Endpoints)
  // ============================================================

  describe('OutcomeBillingController', () => {
    let controller: OutcomeBillingController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [OutcomeBillingController],
        providers: [
          { provide: OutcomeBillingService, useValue: mockBillingService },
          { provide: Reflector, useValue: new Reflector() },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<OutcomeBillingController>(OutcomeBillingController);
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    // ===== GET /outcome-billing/plan =====

    describe('GET /outcome-billing/plan', () => {
      it('should return the organization pricing plan', async () => {
        mockBillingService.getPricingPlanByOrganization.mockResolvedValue(mockPlan);
        const req = { headers: { 'x-organization-id': 'org-1' } };

        const result = await controller.getMyPlan(req);

        expect(result).toEqual(mockPlan);
        expect(mockBillingService.getPricingPlanByOrganization).toHaveBeenCalledWith('org-1');
      });

      it('should return null when x-organization-id header is missing', async () => {
        const req = { headers: {} };

        const result = await controller.getMyPlan(req);

        expect(result).toBeNull();
        expect(mockBillingService.getPricingPlanByOrganization).not.toHaveBeenCalled();
      });

      it('should return null when service returns null (no plan)', async () => {
        mockBillingService.getPricingPlanByOrganization.mockResolvedValue(null);
        const req = { headers: { 'x-organization-id': 'org-no-plan' } };

        const result = await controller.getMyPlan(req);

        expect(result).toBeNull();
      });
    });

    // ===== GET /outcome-billing/events =====

    describe('GET /outcome-billing/events', () => {
      it('should return paginated events for organization', async () => {
        mockBillingService.getOutcomeEvents.mockResolvedValue(paginatedEvents);
        const req = { headers: { 'x-organization-id': 'org-1' } };

        const result = await controller.getMyEvents(req, { page: 1, limit: 20 });

        expect(result).toEqual(paginatedEvents);
        expect(mockBillingService.getOutcomeEvents).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          organizationId: 'org-1',
        });
      });

      it('should return empty result when x-organization-id is missing', async () => {
        const req = { headers: {} };

        const result = await controller.getMyEvents(req, {});

        expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
        expect(mockBillingService.getOutcomeEvents).not.toHaveBeenCalled();
      });

      it('should pass query filters through to service', async () => {
        mockBillingService.getOutcomeEvents.mockResolvedValue(paginatedEvents);
        const req = { headers: { 'x-organization-id': 'org-1' } };
        const query = { page: 2, limit: 10, status: 'PENDING' as any };

        await controller.getMyEvents(req, query);

        expect(mockBillingService.getOutcomeEvents).toHaveBeenCalledWith({
          page: 2,
          limit: 10,
          status: 'PENDING',
          organizationId: 'org-1',
        });
      });

      it('should always override organizationId with header value', async () => {
        mockBillingService.getOutcomeEvents.mockResolvedValue(paginatedEvents);
        const req = { headers: { 'x-organization-id': 'org-1' } };
        // Attempting to pass a different organizationId in query
        const query = { organizationId: 'org-attacker' } as any;

        await controller.getMyEvents(req, query);

        expect(mockBillingService.getOutcomeEvents).toHaveBeenCalledWith(
          expect.objectContaining({ organizationId: 'org-1' }),
        );
      });
    });

    // ===== GET /outcome-billing/stats =====

    describe('GET /outcome-billing/stats', () => {
      it('should return billing stats for organization', async () => {
        mockBillingService.getOutcomeBillingStats.mockResolvedValue(mockStats);
        const req = { headers: { 'x-organization-id': 'org-1' } };

        const result = await controller.getMyStats(req);

        expect(result).toEqual(mockStats);
        expect(mockBillingService.getOutcomeBillingStats).toHaveBeenCalledWith('org-1');
      });

      it('should return null when x-organization-id is missing', async () => {
        const req = { headers: {} };

        const result = await controller.getMyStats(req);

        expect(result).toBeNull();
        expect(mockBillingService.getOutcomeBillingStats).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // AdminOutcomeBillingController (Admin Endpoints)
  // ============================================================

  describe('AdminOutcomeBillingController', () => {
    let controller: AdminOutcomeBillingController;

    const adminReq = { user: { id: 'admin-1', role: 'ADMIN' } };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminOutcomeBillingController],
        providers: [
          { provide: OutcomeBillingService, useValue: mockBillingService },
          { provide: OutcomeInvoiceGeneratorService, useValue: mockInvoiceService },
          { provide: Reflector, useValue: new Reflector() },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<AdminOutcomeBillingController>(AdminOutcomeBillingController);
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    // ===== GET /admin/outcome-billing/dashboard =====

    describe('GET /admin/outcome-billing/dashboard', () => {
      it('should return admin dashboard stats', async () => {
        mockBillingService.getAdminDashboardStats.mockResolvedValue(mockDashboardStats);

        const result = await controller.getDashboard();

        expect(result).toEqual(mockDashboardStats);
        expect(mockBillingService.getAdminDashboardStats).toHaveBeenCalled();
      });
    });

    // ===== POST /admin/outcome-billing/plans =====

    describe('POST /admin/outcome-billing/plans', () => {
      it('should create a new pricing plan', async () => {
        mockBillingService.createPricingPlan.mockResolvedValue(mockPlan);
        const dto = {
          organizationId: 'org-1',
          pricingModel: 'REVENUE_SHARE' as any,
          revenueSharePercent: 2.5,
        };

        const result = await controller.createPlan(dto);

        expect(result).toEqual(mockPlan);
        expect(mockBillingService.createPricingPlan).toHaveBeenCalledWith(dto);
      });

      it('should propagate NotFoundException from service', async () => {
        mockBillingService.createPricingPlan.mockRejectedValue(
          new NotFoundException('Organization not found'),
        );
        const dto = {
          organizationId: 'bad-org',
          pricingModel: 'REVENUE_SHARE' as any,
          revenueSharePercent: 2.5,
        };

        await expect(controller.createPlan(dto)).rejects.toThrow(NotFoundException);
      });

      it('should propagate BadRequestException for duplicate plan', async () => {
        mockBillingService.createPricingPlan.mockRejectedValue(
          new BadRequestException('Organization already has a pricing plan'),
        );
        const dto = {
          organizationId: 'org-1',
          pricingModel: 'REVENUE_SHARE' as any,
          revenueSharePercent: 2.5,
        };

        await expect(controller.createPlan(dto)).rejects.toThrow(BadRequestException);
      });
    });

    // ===== GET /admin/outcome-billing/plans =====

    describe('GET /admin/outcome-billing/plans', () => {
      it('should return paginated plans list', async () => {
        mockBillingService.listPricingPlans.mockResolvedValue(paginatedPlans);

        const result = await controller.listPlans({ page: 1, limit: 20 });

        expect(result).toEqual(paginatedPlans);
        expect(mockBillingService.listPricingPlans).toHaveBeenCalledWith({ page: 1, limit: 20 });
      });

      it('should pass isActive filter', async () => {
        mockBillingService.listPricingPlans.mockResolvedValue(paginatedPlans);

        await controller.listPlans({ isActive: true });

        expect(mockBillingService.listPricingPlans).toHaveBeenCalledWith({ isActive: true });
      });
    });

    // ===== GET /admin/outcome-billing/plans/:id =====

    describe('GET /admin/outcome-billing/plans/:id', () => {
      it('should return plan by ID', async () => {
        mockBillingService.getPricingPlanById.mockResolvedValue(mockPlan);

        const result = await controller.getPlanById('plan-1');

        expect(result).toEqual(mockPlan);
        expect(mockBillingService.getPricingPlanById).toHaveBeenCalledWith('plan-1');
      });

      it('should return null when plan not found', async () => {
        mockBillingService.getPricingPlanById.mockResolvedValue(null);

        const result = await controller.getPlanById('non-existent');

        expect(result).toBeNull();
      });
    });

    // ===== GET /admin/outcome-billing/plans/organization/:orgId =====

    describe('GET /admin/outcome-billing/plans/organization/:orgId', () => {
      it('should return plan by organization ID', async () => {
        mockBillingService.getPricingPlanByOrganization.mockResolvedValue(mockPlan);

        const result = await controller.getPlanByOrganization('org-1');

        expect(result).toEqual(mockPlan);
        expect(mockBillingService.getPricingPlanByOrganization).toHaveBeenCalledWith('org-1');
      });
    });

    // ===== PATCH /admin/outcome-billing/plans/:id =====

    describe('PATCH /admin/outcome-billing/plans/:id', () => {
      it('should update a pricing plan', async () => {
        const updatedPlan = { ...mockPlan, revenueSharePercent: 3.0 };
        mockBillingService.updatePricingPlan.mockResolvedValue(updatedPlan);
        const dto = { revenueSharePercent: 3.0 };

        const result = await controller.updatePlan('plan-1', dto);

        expect(result.revenueSharePercent).toBe(3.0);
        expect(mockBillingService.updatePricingPlan).toHaveBeenCalledWith('plan-1', dto);
      });

      it('should propagate NotFoundException for missing plan', async () => {
        mockBillingService.updatePricingPlan.mockRejectedValue(
          new NotFoundException('Plan not found'),
        );

        await expect(
          controller.updatePlan('bad-id', { revenueSharePercent: 3.0 }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    // ===== DELETE /admin/outcome-billing/plans/:id =====

    describe('DELETE /admin/outcome-billing/plans/:id', () => {
      it('should delete a pricing plan', async () => {
        mockBillingService.deletePricingPlan.mockResolvedValue(undefined);

        await expect(controller.deletePlan('plan-1')).resolves.not.toThrow();
        expect(mockBillingService.deletePricingPlan).toHaveBeenCalledWith('plan-1');
      });

      it('should propagate BadRequestException for plan with pending events', async () => {
        mockBillingService.deletePricingPlan.mockRejectedValue(
          new BadRequestException('Cannot delete plan with pending events'),
        );

        await expect(controller.deletePlan('plan-1')).rejects.toThrow(BadRequestException);
      });
    });

    // ===== GET /admin/outcome-billing/events =====

    describe('GET /admin/outcome-billing/events', () => {
      it('should return paginated events', async () => {
        mockBillingService.getOutcomeEvents.mockResolvedValue(paginatedEvents);

        const result = await controller.listEvents({ page: 1, limit: 20 });

        expect(result).toEqual(paginatedEvents);
      });

      it('should pass all query filters to service', async () => {
        mockBillingService.getOutcomeEvents.mockResolvedValue(paginatedEvents);
        const query = {
          page: 2,
          limit: 10,
          status: 'FLAGGED_FOR_REVIEW' as any,
          organizationId: 'org-1',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        };

        await controller.listEvents(query);

        expect(mockBillingService.getOutcomeEvents).toHaveBeenCalledWith(query);
      });
    });

    // ===== GET /admin/outcome-billing/events/:id =====

    describe('GET /admin/outcome-billing/events/:id', () => {
      it('should return event by ID', async () => {
        mockBillingService.getOutcomeEventById.mockResolvedValue(mockEvent);

        const result = await controller.getEventById('event-1');

        expect(result).toEqual(mockEvent);
        expect(mockBillingService.getOutcomeEventById).toHaveBeenCalledWith('event-1');
      });

      it('should return null when event not found', async () => {
        mockBillingService.getOutcomeEventById.mockResolvedValue(null);

        const result = await controller.getEventById('non-existent');

        expect(result).toBeNull();
      });
    });

    // ===== POST /admin/outcome-billing/events/:id/waive =====

    describe('POST /admin/outcome-billing/events/:id/waive', () => {
      it('should waive an event with reason and reviewer ID', async () => {
        const waivedEvent = { ...mockEvent, status: 'WAIVED' };
        mockBillingService.waiveEvent.mockResolvedValue(waivedEvent);

        const result = await controller.waiveEvent(
          'event-1',
          { reason: 'Customer goodwill' },
          adminReq,
        );

        expect(result.status).toBe('WAIVED');
        expect(mockBillingService.waiveEvent).toHaveBeenCalledWith(
          'event-1',
          'Customer goodwill',
          'admin-1',
        );
      });

      it('should pass the authenticated user ID as reviewer', async () => {
        const superAdminReq = { user: { id: 'super-admin-1', role: 'SUPER_ADMIN' } };
        mockBillingService.waiveEvent.mockResolvedValue({ ...mockEvent, status: 'WAIVED' });

        await controller.waiveEvent('event-1', { reason: 'Override' }, superAdminReq);

        expect(mockBillingService.waiveEvent).toHaveBeenCalledWith(
          'event-1',
          'Override',
          'super-admin-1',
        );
      });

      it('should propagate NotFoundException for missing event', async () => {
        mockBillingService.waiveEvent.mockRejectedValue(
          new NotFoundException('Event not found'),
        );

        await expect(
          controller.waiveEvent('bad-id', { reason: 'test' }, adminReq),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate BadRequestException for invalid status', async () => {
        mockBillingService.waiveEvent.mockRejectedValue(
          new BadRequestException('Cannot waive INVOICED event'),
        );

        await expect(
          controller.waiveEvent('event-1', { reason: 'test' }, adminReq),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // ===== POST /admin/outcome-billing/events/:id/void =====

    describe('POST /admin/outcome-billing/events/:id/void', () => {
      it('should void an event with reason and reviewer ID', async () => {
        const voidedEvent = { ...mockEvent, status: 'VOIDED' };
        mockBillingService.voidEvent.mockResolvedValue(voidedEvent);

        const result = await controller.voidEvent(
          'event-1',
          { reason: 'Invalid deal' },
          adminReq,
        );

        expect(result.status).toBe('VOIDED');
        expect(mockBillingService.voidEvent).toHaveBeenCalledWith(
          'event-1',
          'Invalid deal',
          'admin-1',
        );
      });

      it('should propagate service errors', async () => {
        mockBillingService.voidEvent.mockRejectedValue(
          new BadRequestException('Cannot void PAID event'),
        );

        await expect(
          controller.voidEvent('event-1', { reason: 'test' }, adminReq),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // ===== POST /admin/outcome-billing/events/:id/resolve =====

    describe('POST /admin/outcome-billing/events/:id/resolve', () => {
      it('should resolve a flagged event with approve action', async () => {
        const approvedEvent = { ...mockEvent, status: 'PENDING' };
        mockBillingService.resolveReview.mockResolvedValue(approvedEvent);

        const result = await controller.resolveReview(
          'event-1',
          { action: 'approve', reason: 'Deal verified' },
          adminReq,
        );

        expect(result.status).toBe('PENDING');
        expect(mockBillingService.resolveReview).toHaveBeenCalledWith(
          'event-1',
          'approve',
          'Deal verified',
          'admin-1',
        );
      });

      it('should resolve a flagged event with void action', async () => {
        mockBillingService.resolveReview.mockResolvedValue({ ...mockEvent, status: 'VOIDED' });

        const result = await controller.resolveReview(
          'event-1',
          { action: 'void', reason: 'Fraudulent' },
          adminReq,
        );

        expect(result.status).toBe('VOIDED');
        expect(mockBillingService.resolveReview).toHaveBeenCalledWith(
          'event-1',
          'void',
          'Fraudulent',
          'admin-1',
        );
      });

      it('should resolve a flagged event with waive action', async () => {
        mockBillingService.resolveReview.mockResolvedValue({ ...mockEvent, status: 'WAIVED' });

        const result = await controller.resolveReview(
          'event-1',
          { action: 'waive' },
          adminReq,
        );

        expect(result.status).toBe('WAIVED');
        expect(mockBillingService.resolveReview).toHaveBeenCalledWith(
          'event-1',
          'waive',
          undefined,
          'admin-1',
        );
      });

      it('should propagate BadRequestException for non-flagged events', async () => {
        mockBillingService.resolveReview.mockRejectedValue(
          new BadRequestException('Event is not flagged for review'),
        );

        await expect(
          controller.resolveReview('event-1', { action: 'approve' }, adminReq),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // ===== POST /admin/outcome-billing/generate-invoice/:orgId =====

    describe('POST /admin/outcome-billing/generate-invoice/:orgId', () => {
      it('should generate invoice for organization', async () => {
        mockInvoiceService.generateOutcomeInvoice.mockResolvedValue(mockInvoice);

        const result = await controller.generateInvoice('org-1');

        expect(result).toEqual(mockInvoice);
        expect(mockInvoiceService.generateOutcomeInvoice).toHaveBeenCalledWith('org-1');
      });

      it('should return null when no pending events to invoice', async () => {
        mockInvoiceService.generateOutcomeInvoice.mockResolvedValue(null);

        const result = await controller.generateInvoice('org-1');

        expect(result).toBeNull();
      });
    });

    // ===== POST /admin/outcome-billing/process-billing =====

    describe('POST /admin/outcome-billing/process-billing', () => {
      it('should trigger billing processing and return success message', async () => {
        mockInvoiceService.processOutcomeBilling.mockResolvedValue(undefined);

        const result = await controller.processBilling();

        expect(result).toEqual({ message: 'Billing processed successfully' });
        expect(mockInvoiceService.processOutcomeBilling).toHaveBeenCalled();
      });

      it('should propagate errors from billing processor', async () => {
        mockInvoiceService.processOutcomeBilling.mockRejectedValue(
          new Error('Processing failed'),
        );

        await expect(controller.processBilling()).rejects.toThrow('Processing failed');
      });
    });

    // ===== GET /admin/outcome-billing/stats/:orgId =====

    describe('GET /admin/outcome-billing/stats/:orgId', () => {
      it('should return stats for a specific organization', async () => {
        mockBillingService.getOutcomeBillingStats.mockResolvedValue(mockStats);

        const result = await controller.getOrganizationStats('org-1');

        expect(result).toEqual(mockStats);
        expect(mockBillingService.getOutcomeBillingStats).toHaveBeenCalledWith('org-1');
      });

      it('should return null when organization has no plan', async () => {
        mockBillingService.getOutcomeBillingStats.mockResolvedValue(null);

        const result = await controller.getOrganizationStats('org-no-plan');

        expect(result).toBeNull();
      });
    });
  });

  // ============================================================
  // Security / Guard Tests
  // ============================================================

  describe('Security & Authorization', () => {
    describe('User endpoints org isolation', () => {
      let controller: OutcomeBillingController;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          controllers: [OutcomeBillingController],
          providers: [
            { provide: OutcomeBillingService, useValue: mockBillingService },
            { provide: Reflector, useValue: new Reflector() },
          ],
        })
          .overrideGuard(JwtAuthGuard)
          .useValue({ canActivate: () => true })
          .compile();

        controller = module.get<OutcomeBillingController>(OutcomeBillingController);
        jest.clearAllMocks();
      });

      it('plan endpoint should be scoped to x-organization-id header', async () => {
        mockBillingService.getPricingPlanByOrganization.mockResolvedValue(mockPlan);
        const req = { headers: { 'x-organization-id': 'org-specific' } };

        await controller.getMyPlan(req);

        expect(mockBillingService.getPricingPlanByOrganization).toHaveBeenCalledWith('org-specific');
      });

      it('events endpoint should enforce organizationId from header', async () => {
        mockBillingService.getOutcomeEvents.mockResolvedValue(paginatedEvents);
        const req = { headers: { 'x-organization-id': 'org-specific' } };

        await controller.getMyEvents(req, {});

        expect(mockBillingService.getOutcomeEvents).toHaveBeenCalledWith(
          expect.objectContaining({ organizationId: 'org-specific' }),
        );
      });

      it('stats endpoint should be scoped to x-organization-id header', async () => {
        mockBillingService.getOutcomeBillingStats.mockResolvedValue(mockStats);
        const req = { headers: { 'x-organization-id': 'org-specific' } };

        await controller.getMyStats(req);

        expect(mockBillingService.getOutcomeBillingStats).toHaveBeenCalledWith('org-specific');
      });

      it('should not call service when organization header is empty string', async () => {
        const req = { headers: { 'x-organization-id': '' } };

        const planResult = await controller.getMyPlan(req);
        const statsResult = await controller.getMyStats(req);

        // Empty string is falsy, so should return null/default
        expect(planResult).toBeNull();
        expect(statsResult).toBeNull();
        expect(mockBillingService.getPricingPlanByOrganization).not.toHaveBeenCalled();
        expect(mockBillingService.getOutcomeBillingStats).not.toHaveBeenCalled();
      });
    });

    describe('Admin endpoint user ID extraction', () => {
      let controller: AdminOutcomeBillingController;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          controllers: [AdminOutcomeBillingController],
          providers: [
            { provide: OutcomeBillingService, useValue: mockBillingService },
            { provide: OutcomeInvoiceGeneratorService, useValue: mockInvoiceService },
            { provide: Reflector, useValue: new Reflector() },
          ],
        })
          .overrideGuard(JwtAuthGuard)
          .useValue({ canActivate: () => true })
          .compile();

        controller = module.get<AdminOutcomeBillingController>(AdminOutcomeBillingController);
        jest.clearAllMocks();
      });

      it('waive should extract user.id from request for audit trail', async () => {
        mockBillingService.waiveEvent.mockResolvedValue({ ...mockEvent, status: 'WAIVED' });
        const req = { user: { id: 'audit-user-123', role: 'ADMIN' } };

        await controller.waiveEvent('event-1', { reason: 'test' }, req);

        expect(mockBillingService.waiveEvent).toHaveBeenCalledWith(
          'event-1',
          'test',
          'audit-user-123',
        );
      });

      it('void should extract user.id from request for audit trail', async () => {
        mockBillingService.voidEvent.mockResolvedValue({ ...mockEvent, status: 'VOIDED' });
        const req = { user: { id: 'audit-user-456', role: 'SUPER_ADMIN' } };

        await controller.voidEvent('event-1', { reason: 'test' }, req);

        expect(mockBillingService.voidEvent).toHaveBeenCalledWith(
          'event-1',
          'test',
          'audit-user-456',
        );
      });

      it('resolve should extract user.id from request for audit trail', async () => {
        mockBillingService.resolveReview.mockResolvedValue({ ...mockEvent, status: 'PENDING' });
        const req = { user: { id: 'audit-user-789', role: 'ADMIN' } };

        await controller.resolveReview('event-1', { action: 'approve', reason: 'ok' }, req);

        expect(mockBillingService.resolveReview).toHaveBeenCalledWith(
          'event-1',
          'approve',
          'ok',
          'audit-user-789',
        );
      });
    });
  });
});
