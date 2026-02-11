import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PrismaService } from '../database/prisma.service';

describe('PipelinesService', () => {
  let service: PipelinesService;

  const mockStages = [
    {
      id: 'stage-1',
      pipelineId: 'pipeline-1',
      organizationId: 'org-1',
      name: 'PROSPECTING',
      displayName: 'Prospecting',
      color: '#0ea5e9',
      probability: 10,
      isClosedWon: false,
      isClosedLost: false,
      sortOrder: 0,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'stage-2',
      pipelineId: 'pipeline-1',
      organizationId: 'org-1',
      name: 'QUALIFICATION',
      displayName: 'Qualification',
      color: '#06b6d4',
      probability: 20,
      isClosedWon: false,
      isClosedLost: false,
      sortOrder: 1,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'stage-3',
      pipelineId: 'pipeline-1',
      organizationId: 'org-1',
      name: 'CLOSED_WON',
      displayName: 'Closed Won',
      color: '#22c55e',
      probability: 100,
      isClosedWon: true,
      isClosedLost: false,
      sortOrder: 2,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockPipeline = {
    id: 'pipeline-1',
    organizationId: 'org-1',
    name: 'Sales Pipeline',
    description: 'Default sales pipeline',
    isDefault: true,
    isActive: true,
    color: '#6366f1',
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    stages: mockStages,
  };

  const mockPrisma = {
    pipeline: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    pipelineStage: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    opportunity: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all pipelines with stages ordered by sortOrder', async () => {
      mockPrisma.pipeline.findMany.mockResolvedValue([mockPipeline]);

      const result = await service.findAll('org-1');

      expect(result).toEqual([mockPipeline]);
      expect(mockPrisma.pipeline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
          include: expect.objectContaining({
            stages: expect.objectContaining({
              orderBy: { sortOrder: 'asc' },
            }),
          }),
          orderBy: [
            { isDefault: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        }),
      );
    });

    it('should return empty array when no pipelines exist', async () => {
      mockPrisma.pipeline.findMany.mockResolvedValue([]);

      const result = await service.findAll('org-1');

      expect(result).toEqual([]);
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a pipeline when found', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);

      const result = await service.findById('pipeline-1', 'org-1');

      expect(result).toEqual(mockPipeline);
      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'pipeline-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('non-existent', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findDefault ──────────────────────────────────────────────────────────

  describe('findDefault', () => {
    it('should return the default pipeline when it exists', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);

      const result = await service.findDefault('org-1');

      expect(result).toEqual(mockPipeline);
      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDefault: true,
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should create a default pipeline when none exists', async () => {
      // findFirst for findDefault returns null
      mockPrisma.pipeline.findFirst.mockResolvedValueOnce(null);

      // create pipeline calls: updateMany (unset defaults), aggregate (max sort), create
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      const result = await service.findDefault('org-1');

      expect(result).toEqual(mockPipeline);
      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Sales Pipeline',
            isDefault: true,
            organizationId: 'org-1',
          }),
        }),
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a pipeline with custom stages', async () => {
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      const result = await service.create({
        name: 'New Pipeline',
        description: 'A new pipeline',
        stages: [
          { name: 'STEP_1', displayName: 'Step 1', color: '#fff', probability: 25 },
          { name: 'STEP_2', displayName: 'Step 2', color: '#000', probability: 75 },
        ],
      }, 'org-1');

      expect(result).toEqual(mockPipeline);
      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Pipeline',
            sortOrder: 3, // 2 + 1
            organizationId: 'org-1',
            stages: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ name: 'STEP_1', displayName: 'Step 1' }),
                expect.objectContaining({ name: 'STEP_2', displayName: 'Step 2' }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should use default stages when none provided', async () => {
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      await service.create({ name: 'Default Stages Pipeline' }, 'org-1');

      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stages: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ name: 'PROSPECTING' }),
                expect.objectContaining({ name: 'CLOSED_WON' }),
                expect.objectContaining({ name: 'CLOSED_LOST' }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should use default stages when stages is empty array', async () => {
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      await service.create({ name: 'Empty Stages Pipeline', stages: [] }, 'org-1');

      const createCall = mockPrisma.pipeline.create.mock.calls[0][0];
      // Should have default 10 stages
      expect(createCall.data.stages.create.length).toBe(10);
    });

    it('should unset other defaults when isDefault is true', async () => {
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      await service.create({ name: 'New Default', isDefault: true }, 'org-1');

      expect(mockPrisma.pipeline.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDefault: true,
            organizationId: 'org-1',
          }),
          data: { isDefault: false },
        }),
      );
    });

    it('should not unset defaults when isDefault is false', async () => {
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      await service.create({ name: 'Not Default', isDefault: false }, 'org-1');

      expect(mockPrisma.pipeline.updateMany).not.toHaveBeenCalled();
    });

    it('should calculate next sort order from max', async () => {
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      await service.create({ name: 'Pipeline' }, 'org-1');

      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 6,
          }),
        }),
      );
    });

    it('should handle null max sort order (first pipeline)', async () => {
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      await service.create({ name: 'First Pipeline' }, 'org-1');

      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 0, // (null ?? -1) + 1
          }),
        }),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a pipeline', async () => {
      const updatedPipeline = { ...mockPipeline, name: 'Updated Pipeline' };
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline); // findById
      mockPrisma.pipeline.update.mockResolvedValue(updatedPipeline);

      const result = await service.update('pipeline-1', { name: 'Updated Pipeline' }, 'org-1');

      expect(result.name).toBe('Updated Pipeline');
      expect(mockPrisma.pipeline.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pipeline-1' },
          data: expect.objectContaining({ name: 'Updated Pipeline' }),
        }),
      );
    });

    it('should unset other defaults when setting isDefault to true', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pipeline.update.mockResolvedValue(mockPipeline);

      await service.update('pipeline-1', { isDefault: true }, 'org-1');

      expect(mockPrisma.pipeline.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDefault: true,
            id: { not: 'pipeline-1' },
            organizationId: 'org-1',
          }),
          data: { isDefault: false },
        }),
      );
    });

    it('should not unset defaults when isDefault is not provided', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipeline.update.mockResolvedValue(mockPipeline);

      await service.update('pipeline-1', { name: 'Foo' }, 'org-1');

      expect(mockPrisma.pipeline.updateMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Foo' }, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete a non-default pipeline with no opportunities', async () => {
      const nonDefaultPipeline = { ...mockPipeline, isDefault: false };
      mockPrisma.pipeline.findFirst.mockResolvedValue(nonDefaultPipeline);
      mockPrisma.opportunity.count.mockResolvedValue(0);
      mockPrisma.pipeline.delete.mockResolvedValue(nonDefaultPipeline);

      await service.delete('pipeline-1', 'org-1');

      expect(mockPrisma.pipeline.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pipeline-1' } }),
      );
    });

    it('should throw BadRequestException when deleting the default pipeline', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline); // isDefault: true

      await expect(
        service.delete('pipeline-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pipeline has associated opportunities', async () => {
      const nonDefaultPipeline = { ...mockPipeline, isDefault: false };
      mockPrisma.pipeline.findFirst.mockResolvedValue(nonDefaultPipeline);
      mockPrisma.opportunity.count.mockResolvedValue(5);

      await expect(
        service.delete('pipeline-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include opportunity count in error message', async () => {
      const nonDefaultPipeline = { ...mockPipeline, isDefault: false };
      mockPrisma.pipeline.findFirst.mockResolvedValue(nonDefaultPipeline);
      mockPrisma.opportunity.count.mockResolvedValue(3);

      await expect(
        service.delete('pipeline-1', 'org-1'),
      ).rejects.toThrow(/3 associated opportunities/);
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('non-existent', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── setDefault ───────────────────────────────────────────────────────────

  describe('setDefault', () => {
    it('should set a pipeline as the default', async () => {
      const nonDefaultPipeline = { ...mockPipeline, isDefault: false };
      mockPrisma.pipeline.findFirst.mockResolvedValue(nonDefaultPipeline); // findById
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pipeline.update.mockResolvedValue({ ...mockPipeline, isDefault: true });

      const result = await service.setDefault('pipeline-1', 'org-1');

      expect(result.isDefault).toBe(true);
    });

    it('should unset all other defaults before setting new default', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pipeline.update.mockResolvedValue(mockPipeline);

      await service.setDefault('pipeline-1', 'org-1');

      expect(mockPrisma.pipeline.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDefault: true,
            organizationId: 'org-1',
          }),
          data: { isDefault: false },
        }),
      );
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.setDefault('non-existent', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── duplicate ────────────────────────────────────────────────────────────

  describe('duplicate', () => {
    it('should duplicate a pipeline with all its stages', async () => {
      const duplicated = { ...mockPipeline, id: 'pipeline-2', name: 'Copy of Sales Pipeline', isDefault: false };

      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline); // findById
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: 1 } }); // create
      mockPrisma.pipeline.create.mockResolvedValue(duplicated);

      const result = await service.duplicate('pipeline-1', 'Copy of Sales Pipeline', 'org-1');

      expect(result.name).toBe('Copy of Sales Pipeline');
      expect(result.isDefault).toBe(false);
      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Copy of Sales Pipeline',
            isDefault: false,
            stages: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ name: 'PROSPECTING' }),
                expect.objectContaining({ name: 'QUALIFICATION' }),
                expect.objectContaining({ name: 'CLOSED_WON', isClosedWon: true }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should set isDefault to false on duplicated pipeline', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.pipeline.create.mockResolvedValue({ ...mockPipeline, isDefault: false });

      await service.duplicate('pipeline-1', 'Dup', 'org-1');

      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDefault: false,
          }),
        }),
      );
    });

    it('should throw NotFoundException when original pipeline does not exist', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.duplicate('non-existent', 'Copy', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createStage ──────────────────────────────────────────────────────────

  describe('createStage', () => {
    const stageDto = {
      name: 'NEW_STAGE',
      displayName: 'New Stage',
      color: '#ff0000',
      probability: 50,
    };

    it('should create a stage in the pipeline', async () => {
      const newStage = {
        id: 'stage-new',
        pipelineId: 'pipeline-1',
        ...stageDto,
        isClosedWon: false,
        isClosedLost: false,
        sortOrder: 3,
        organizationId: 'org-1',
      };

      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline); // findById
      mockPrisma.pipelineStage.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
      mockPrisma.pipelineStage.create.mockResolvedValue(newStage);

      const result = await service.createStage('pipeline-1', stageDto, 'org-1');

      expect(result).toEqual(newStage);
      expect(mockPrisma.pipelineStage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pipelineId: 'pipeline-1',
            name: 'NEW_STAGE',
            displayName: 'New Stage',
            color: '#ff0000',
            probability: 50,
            isClosedWon: false,
            isClosedLost: false,
            sortOrder: 3,
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should use provided sortOrder when specified', async () => {
      const stageDtoWithOrder = { ...stageDto, sortOrder: 99 };
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipelineStage.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
      mockPrisma.pipelineStage.create.mockResolvedValue({
        id: 'stage-new',
        ...stageDtoWithOrder,
        pipelineId: 'pipeline-1',
      });

      await service.createStage('pipeline-1', stageDtoWithOrder, 'org-1');

      expect(mockPrisma.pipelineStage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 99,
          }),
        }),
      );
    });

    it('should auto-calculate sortOrder when not specified', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipelineStage.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      mockPrisma.pipelineStage.create.mockResolvedValue({ id: 'stage-new', ...stageDto });

      await service.createStage('pipeline-1', stageDto, 'org-1');

      expect(mockPrisma.pipelineStage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 6,
          }),
        }),
      );
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.createStage('non-existent', stageDto, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStage ──────────────────────────────────────────────────────────

  describe('updateStage', () => {
    it('should update a stage', async () => {
      const updatedStage = { ...mockStages[0], displayName: 'Updated Name' };

      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.update.mockResolvedValue(updatedStage);

      const result = await service.updateStage('pipeline-1', 'stage-1', { displayName: 'Updated Name' }, 'org-1');

      expect(result.displayName).toBe('Updated Name');
    });

    it('should unset isClosedLost when setting isClosedWon to true', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.update.mockResolvedValue({ ...mockStages[0], isClosedWon: true, isClosedLost: false });

      await service.updateStage('pipeline-1', 'stage-1', { isClosedWon: true }, 'org-1');

      expect(mockPrisma.pipelineStage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isClosedWon: true,
            isClosedLost: false,
          }),
        }),
      );
    });

    it('should unset isClosedWon when setting isClosedLost to true', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.update.mockResolvedValue({ ...mockStages[0], isClosedLost: true, isClosedWon: false });

      await service.updateStage('pipeline-1', 'stage-1', { isClosedLost: true }, 'org-1');

      expect(mockPrisma.pipelineStage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isClosedLost: true,
            isClosedWon: false,
          }),
        }),
      );
    });

    it('should throw NotFoundException when stage does not exist', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStage('pipeline-1', 'non-existent', { displayName: 'Foo' }, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify stage belongs to the specified pipeline', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStage('other-pipeline', 'stage-1', { displayName: 'Foo' }, 'org-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.pipelineStage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'stage-1',
            pipelineId: 'other-pipeline',
            organizationId: 'org-1',
          }),
        }),
      );
    });
  });

  // ─── deleteStage ──────────────────────────────────────────────────────────

  describe('deleteStage', () => {
    it('should delete a stage when pipeline has more than 2 stages and no opportunities', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.count.mockResolvedValue(5);
      mockPrisma.opportunity.count.mockResolvedValue(0);
      mockPrisma.pipelineStage.delete.mockResolvedValue(mockStages[0]);

      await service.deleteStage('pipeline-1', 'stage-1', 'org-1');

      expect(mockPrisma.pipelineStage.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'stage-1' } }),
      );
    });

    it('should throw NotFoundException when stage does not exist', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteStage('pipeline-1', 'non-existent', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when pipeline has only 2 stages', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.count.mockResolvedValue(2);

      await expect(
        service.deleteStage('pipeline-1', 'stage-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pipeline has fewer than 2 stages', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.count.mockResolvedValue(1);

      await expect(
        service.deleteStage('pipeline-1', 'stage-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when stage has associated opportunities', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.count.mockResolvedValue(5);
      mockPrisma.opportunity.count.mockResolvedValue(3);

      await expect(
        service.deleteStage('pipeline-1', 'stage-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include opportunity count in error message for stage with opportunities', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockStages[0]);
      mockPrisma.pipelineStage.count.mockResolvedValue(5);
      mockPrisma.opportunity.count.mockResolvedValue(7);

      await expect(
        service.deleteStage('pipeline-1', 'stage-1', 'org-1'),
      ).rejects.toThrow(/7 associated opportunities/);
    });
  });

  // ─── reorderStages ────────────────────────────────────────────────────────

  describe('reorderStages', () => {
    it('should reorder stages using a transaction', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline); // findById
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.pipelineStage.findMany.mockResolvedValue(mockStages);

      const result = await service.reorderStages(
        'pipeline-1',
        { stageIds: ['stage-3', 'stage-1', 'stage-2'] },
        'org-1',
      );

      expect(result).toEqual(mockStages);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.anything(),
          expect.anything(),
          expect.anything(),
        ]),
      );
    });

    it('should set sortOrder based on position in stageIds array', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.pipelineStage.findMany.mockResolvedValue(mockStages);

      await service.reorderStages(
        'pipeline-1',
        { stageIds: ['stage-3', 'stage-1', 'stage-2'] },
        'org-1',
      );

      // The transaction should receive update operations
      const transactionArg = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionArg).toHaveLength(3);
    });

    it('should return the reordered stages', async () => {
      const reorderedStages = [mockStages[2], mockStages[0], mockStages[1]];
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.pipelineStage.findMany.mockResolvedValue(reorderedStages);

      const result = await service.reorderStages(
        'pipeline-1',
        { stageIds: ['stage-3', 'stage-1', 'stage-2'] },
        'org-1',
      );

      expect(result).toEqual(reorderedStages);
      expect(mockPrisma.pipelineStage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pipelineId: 'pipeline-1' },
          orderBy: { sortOrder: 'asc' },
        }),
      );
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderStages('non-existent', { stageIds: ['stage-1'] }, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── ensureDefaultPipeline ────────────────────────────────────────────────

  describe('ensureDefaultPipeline', () => {
    it('should do nothing when a default pipeline already exists', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);

      await service.ensureDefaultPipeline('org-1');

      expect(mockPrisma.pipeline.create).not.toHaveBeenCalled();
    });

    it('should create a default pipeline when none exists', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.pipeline.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      mockPrisma.pipeline.create.mockResolvedValue(mockPipeline);

      await service.ensureDefaultPipeline('org-1');

      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Sales Pipeline',
            isDefault: true,
            color: '#6366f1',
            organizationId: 'org-1',
          }),
        }),
      );
    });
  });
});
