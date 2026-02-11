import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';

// Auto-mock heavy modules to prevent ts-jest from compiling their large dependency trees
jest.mock('../anthropic/anthropic.service');

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const mockPrisma = {
    activity: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    contact: {
      findUnique: jest.fn(),
    },
    opportunity: {
      findUnique: jest.fn(),
    },
  };

  const mockAnthropic = {
    generateChatCompletion: jest.fn(),
  };

  const userId = 'user-1';
  const orgId = 'org-1';
  const activityId = 'activity-1';

  beforeEach(async () => {
    jest.resetAllMocks();

    mockAnthropic.generateChatCompletion.mockResolvedValue(
      JSON.stringify({
        sentiment: 'POSITIVE',
        keyPoints: ['Point 1'],
        actionItems: ['Action 1'],
        concerns: [],
        nextSteps: ['Next step'],
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnthropicService, useValue: mockAnthropic },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createActivity', () => {
    it('should create an activity successfully', async () => {
      const createDto = {
        type: 'CALL' as any,
        subject: 'Discovery call',
        description: 'Discussed requirements',
      };

      mockPrisma.activity.create.mockResolvedValue({
        id: activityId,
        ...createDto,
        userId,
        organizationId: orgId,
        activityDate: new Date(),
        keyPoints: [],
        actionItems: [],
        concerns: [],
        nextSteps: [],
      });

      const result = await service.createActivity(createDto, userId, orgId);

      expect(result.id).toBe(activityId);
      expect(result.subject).toBe('Discovery call');
    });

    it('should create activity with valid foreign key references', async () => {
      const leadId = 'clrqm8e0g000008l27hma6lea';
      const createDto = {
        type: 'MEETING' as any,
        subject: 'Test',
        leadId,
      };

      mockPrisma.activity.create.mockResolvedValue({
        id: activityId,
        ...createDto,
        userId,
        organizationId: orgId,
      });

      const result = await service.createActivity(createDto, userId, orgId);

      expect(result.leadId).toBe(leadId);
    });
  });

  describe('getActivity', () => {
    it('should return an activity by ID', async () => {
      const mockActivity = {
        id: activityId,
        type: 'CALL',
        subject: 'Call',
        userId,
        organizationId: orgId,
      };

      mockPrisma.activity.findFirst.mockResolvedValue(mockActivity);

      const result = await service.getActivity(activityId, userId, orgId);

      expect(result.id).toBe(activityId);
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await expect(service.getActivity('nonexistent', userId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by userId when not admin', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: activityId,
        userId,
      });

      await service.getActivity(activityId, userId, orgId, false);

      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        }),
      );
    });

    it('should not filter by userId when admin', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: activityId,
      });

      await service.getActivity(activityId, userId, orgId, true);

      const callArgs = mockPrisma.activity.findFirst.mock.calls[0][0];
      expect(callArgs.where.userId).toBeUndefined();
    });
  });

  describe('listActivities', () => {
    it('should return a list of activities', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([
        { id: 'a1', subject: 'Activity 1' },
        { id: 'a2', subject: 'Activity 2' },
      ]);

      const result = await service.listActivities({}, orgId);

      expect(result).toHaveLength(2);
    });

    it('should filter by type', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await service.listActivities({ type: 'CALL' as any }, orgId);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'CALL',
          }),
        }),
      );
    });

    it('should filter by leadId', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await service.listActivities({ leadId: 'lead-1' }, orgId);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadId: 'lead-1',
          }),
        }),
      );
    });

    it('should filter by userId for non-admin when userId in filters', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await service.listActivities({ userId }, orgId, false);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        }),
      );
    });
  });

  describe('getActivityStats', () => {
    it('should return activity statistics', async () => {
      mockPrisma.activity.count.mockResolvedValue(100);
      mockPrisma.activity.groupBy.mockResolvedValueOnce([
        { type: 'CALL', _count: 50 },
        { type: 'MEETING', _count: 30 },
      ]);
      mockPrisma.activity.groupBy.mockResolvedValueOnce([
        { sentiment: 'POSITIVE', _count: 60 },
        { sentiment: 'NEUTRAL', _count: 40 },
      ]);

      const result = await service.getActivityStats(orgId);

      expect(result.total).toBe(100);
      expect(result.byType).toHaveLength(2);
      expect(result.bySentiment).toHaveLength(2);
    });

    it('should filter by userId for non-admin', async () => {
      mockPrisma.activity.count.mockResolvedValue(10);
      mockPrisma.activity.groupBy.mockResolvedValue([]);

      await service.getActivityStats(orgId, userId, false);

      expect(mockPrisma.activity.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        }),
      );
    });
  });

  describe('getTimeline', () => {
    it('should return activities for a lead', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([
        { id: 'a1', type: 'CALL', subject: 'Call 1' },
      ]);

      const result = await service.getTimeline('lead', 'lead-1', orgId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadId: 'lead-1',
          }),
        }),
      );
    });

    it('should return activities for an account', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await service.getTimeline('account', 'acc-1', orgId);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'acc-1',
          }),
        }),
      );
    });

    it('should filter by userId for non-admin', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await service.getTimeline('lead', 'lead-1', orgId, userId, false);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        }),
      );
    });
  });

  describe('extractInsights', () => {
    it('should extract AI insights for an activity', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: activityId,
        description: 'Had a great call',
        outcome: 'Customer is interested',
        userId,
        organizationId: orgId,
      });

      mockPrisma.activity.update.mockResolvedValue({
        id: activityId,
        sentiment: 'POSITIVE',
        keyPoints: ['Point 1'],
      });

      const result = await service.extractInsights(activityId, userId, orgId);

      expect(result.id).toBe(activityId);
      expect(mockAnthropic.generateChatCompletion).toHaveBeenCalled();
      expect(mockPrisma.activity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: activityId },
          data: expect.objectContaining({
            sentiment: 'POSITIVE',
            keyPoints: ['Point 1'],
            actionItems: ['Action 1'],
          }),
        }),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await expect(service.extractInsights('nonexistent', userId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
