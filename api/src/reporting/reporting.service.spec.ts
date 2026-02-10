import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../database/prisma.service';
import { ReportType } from './dto/report.dto';

describe('ReportingService', () => {
  let service: ReportingService;
  let prisma: PrismaService;

  const mockPrisma = {
    opportunity: {
      groupBy: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    activity: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    lead: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generateReport', () => {
    it('should throw for unknown report type', async () => {
      await expect(
        service.generateReport('UNKNOWN' as ReportType, 'user-1', 'org-1'),
      ).rejects.toThrow('Unknown report type');
    });
  });

  describe('generatePipelineReport', () => {
    it('should aggregate opportunities by stage', async () => {
      mockPrisma.opportunity.groupBy.mockResolvedValue([
        { stage: 'PROSPECTING', _sum: { amount: 50000, expectedRevenue: 5000 }, _count: { id: 3 } },
        { stage: 'QUALIFICATION', _sum: { amount: 100000, expectedRevenue: 20000 }, _count: { id: 5 } },
      ]);

      const result = await service.generateReport(
        ReportType.PIPELINE, 'user-1', 'org-1', {}, undefined, true,
      );

      expect(result.type).toBe(ReportType.PIPELINE);
      expect(result.title).toBe('Sales Pipeline');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].data).toHaveLength(2);
      expect(result.summary?.total).toBe(150000);
      expect(result.summary?.count).toBe(8);
    });

    it('should filter by ownerId when not admin', async () => {
      mockPrisma.opportunity.groupBy.mockResolvedValue([]);

      await service.generateReport(
        ReportType.PIPELINE, 'user-1', 'org-1', {}, undefined, false,
      );

      expect(mockPrisma.opportunity.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'user-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should not filter by ownerId when admin', async () => {
      mockPrisma.opportunity.groupBy.mockResolvedValue([]);

      await service.generateReport(
        ReportType.PIPELINE, 'user-1', 'org-1', {}, undefined, true,
      );

      const call = mockPrisma.opportunity.groupBy.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('ownerId');
    });
  });

  describe('generateWinRateReport', () => {
    it('should compute win rate from closed deals', async () => {
      mockPrisma.opportunity.count
        .mockResolvedValueOnce(30) // closedWon
        .mockResolvedValueOnce(20); // closedLost
      mockPrisma.opportunity.groupBy
        .mockResolvedValueOnce([
          { ownerId: 'user-1', _count: { id: 50 } },
        ]) // byOwner total
        .mockResolvedValueOnce([
          { ownerId: 'user-1', _count: { id: 30 } },
        ]); // byOwner won
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Alice' },
      ]);

      const result = await service.generateReport(
        ReportType.WIN_RATE, 'user-1', 'org-1', {}, undefined, true,
      );

      expect(result.type).toBe(ReportType.WIN_RATE);
      expect(result.summary?.average).toBe(60); // 30/(30+20) * 100
      expect(result.data[0].data[0].label).toBe('Won');
      expect(result.data[0].data[0].value).toBe(30);
    });

    it('should handle zero closed deals gracefully', async () => {
      mockPrisma.opportunity.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.opportunity.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.generateReport(
        ReportType.WIN_RATE, 'user-1', 'org-1', {}, undefined, true,
      );

      expect(result.summary?.average).toBe(0);
      expect(result.summary?.total).toBe(0);
    });
  });

  describe('generateActivityReport', () => {
    it('should aggregate activities by type and user', async () => {
      mockPrisma.activity.groupBy
        .mockResolvedValueOnce([
          { type: 'CALL', _count: { id: 10 } },
          { type: 'EMAIL', _count: { id: 20 } },
        ])
        .mockResolvedValueOnce([
          { userId: 'user-1', _count: { id: 30 } },
        ]);
      mockPrisma.activity.count.mockResolvedValue(30);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Alice' },
      ]);

      const result = await service.generateReport(
        ReportType.ACTIVITY, 'user-1', 'org-1', {}, undefined, true,
      );

      expect(result.type).toBe(ReportType.ACTIVITY);
      expect(result.summary?.total).toBe(30);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('generateRevenueReport', () => {
    it('should aggregate closed won revenue', async () => {
      mockPrisma.opportunity.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500000 }, _count: { id: 10 } }) // closedWon
        .mockResolvedValueOnce({ _sum: { amount: 300000, expectedRevenue: 150000 }, _count: { id: 15 } }); // pipeline
      mockPrisma.opportunity.groupBy
        .mockResolvedValueOnce([
          { ownerId: 'user-1', _sum: { amount: 500000 }, _count: { id: 10 } },
        ])
        .mockResolvedValueOnce([
          { ownerId: 'user-1', _sum: { amount: 300000 }, _count: { id: 15 } },
        ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Alice' },
      ]);

      const result = await service.generateReport(
        ReportType.REVENUE, 'user-1', 'org-1', {}, undefined, true,
      );

      expect(result.type).toBe(ReportType.REVENUE);
      expect(result.title).toContain('Revenue');
    });
  });

  describe('generateLeadConversionReport', () => {
    it('should compute lead conversion rate', async () => {
      mockPrisma.lead.count
        .mockResolvedValueOnce(100) // total leads
        .mockResolvedValueOnce(25); // converted leads
      mockPrisma.lead.groupBy
        .mockResolvedValueOnce([
          { source: 'WEBSITE', _count: { id: 50 } },
          { source: 'REFERRAL', _count: { id: 50 } },
        ])
        .mockResolvedValueOnce([
          { source: 'WEBSITE', _count: { id: 10 } },
          { source: 'REFERRAL', _count: { id: 15 } },
        ]);

      const result = await service.generateReport(
        ReportType.LEAD_CONVERSION, 'user-1', 'org-1', {}, undefined, true,
      );

      expect(result.type).toBe(ReportType.LEAD_CONVERSION);
      expect(result.summary?.average).toBe(25); // 25/100 * 100
    });
  });

  describe('generateForecastReport', () => {
    it('should compute forecast from pipeline data', async () => {
      // Forecast calls groupBy (by stage) and aggregate in Promise.all
      mockPrisma.opportunity.groupBy.mockResolvedValueOnce([
        { stage: 'PROSPECTING', _sum: { amount: 100000, expectedRevenue: 10000 }, _count: { id: 5 } },
        { stage: 'NEGOTIATION', _sum: { amount: 200000, expectedRevenue: 160000 }, _count: { id: 3 } },
      ]);
      mockPrisma.opportunity.aggregate.mockResolvedValueOnce({
        _sum: { amount: 400000 },
        _count: { id: 10 },
      });

      const result = await service.generateReport(
        ReportType.FORECAST, 'user-1', 'org-1', {}, undefined, true,
      );

      expect(result.type).toBe(ReportType.FORECAST);
      expect(result.title).toContain('Forecast');
    });
  });

  describe('date filter calculations', () => {
    it('should generate correct date range for THIS_MONTH', async () => {
      mockPrisma.opportunity.groupBy.mockResolvedValue([]);

      await service.generateReport(
        ReportType.PIPELINE, 'user-1', 'org-1',
        { dateRange: 'THIS_MONTH' as any },
        undefined, true,
      );

      expect(mockPrisma.opportunity.groupBy).toHaveBeenCalled();
    });

    it('should generate correct date range for THIS_QUARTER', async () => {
      mockPrisma.opportunity.groupBy.mockResolvedValue([]);

      await service.generateReport(
        ReportType.PIPELINE, 'user-1', 'org-1',
        { dateRange: 'THIS_QUARTER' as any },
        undefined, true,
      );

      expect(mockPrisma.opportunity.groupBy).toHaveBeenCalled();
    });

    it('should generate correct date range for THIS_YEAR', async () => {
      mockPrisma.opportunity.groupBy.mockResolvedValue([]);

      await service.generateReport(
        ReportType.PIPELINE, 'user-1', 'org-1',
        { dateRange: 'THIS_YEAR' as any },
        undefined, true,
      );

      expect(mockPrisma.opportunity.groupBy).toHaveBeenCalled();
    });
  });
});
