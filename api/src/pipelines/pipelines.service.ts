import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Pipeline, PipelineStage, Prisma } from '@prisma/client';
import {
  CreatePipelineDto,
  CreatePipelineStageDto,
  UpdatePipelineDto,
  UpdatePipelineStageDto,
  ReorderStagesDto,
} from './dto';

// Default pipeline stages matching the legacy OpportunityStage enum
const DEFAULT_PIPELINE_STAGES: CreatePipelineStageDto[] = [
  { name: 'PROSPECTING', displayName: 'Prospecting', color: '#0ea5e9', probability: 10, sortOrder: 0 },
  { name: 'QUALIFICATION', displayName: 'Qualification', color: '#06b6d4', probability: 20, sortOrder: 1 },
  { name: 'NEEDS_ANALYSIS', displayName: 'Needs Analysis', color: '#14b8a6', probability: 30, sortOrder: 2 },
  { name: 'VALUE_PROPOSITION', displayName: 'Value Proposition', color: '#f97316', probability: 40, sortOrder: 3 },
  { name: 'DECISION_MAKERS_IDENTIFIED', displayName: 'Decision Makers', color: '#eab308', probability: 50, sortOrder: 4 },
  { name: 'PERCEPTION_ANALYSIS', displayName: 'Perception Analysis', color: '#a855f7', probability: 60, sortOrder: 5 },
  { name: 'PROPOSAL_PRICE_QUOTE', displayName: 'Proposal/Quote', color: '#f59e0b', probability: 70, sortOrder: 6 },
  { name: 'NEGOTIATION_REVIEW', displayName: 'Negotiation', color: '#8b5cf6', probability: 80, sortOrder: 7 },
  { name: 'CLOSED_WON', displayName: 'Closed Won', color: '#22c55e', probability: 100, isClosedWon: true, sortOrder: 8 },
  { name: 'CLOSED_LOST', displayName: 'Closed Lost', color: '#9ca3af', probability: 0, isClosedLost: true, sortOrder: 9 },
];

@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all pipelines with their stages
   */
  async findAll(organizationId: string): Promise<Pipeline[]> {
    const where: Prisma.PipelineWhereInput = {};
    where.organizationId = organizationId;

    return this.prisma.pipeline.findMany({
      where,
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get a single pipeline by ID
   */
  async findById(id: string, organizationId: string): Promise<Pipeline & { stages: PipelineStage[] }> {
    const where: Prisma.PipelineWhereInput = { id };
    where.organizationId = organizationId;

    const pipeline = await this.prisma.pipeline.findFirst({
      where,
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${id} not found`);
    }

    return pipeline;
  }

  /**
   * Get the default pipeline
   */
  async findDefault(organizationId: string): Promise<Pipeline & { stages: PipelineStage[] }> {
    const where: Prisma.PipelineWhereInput = { isDefault: true };
    where.organizationId = organizationId;

    let pipeline = await this.prisma.pipeline.findFirst({
      where,
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // If no default pipeline exists, create one
    if (!pipeline) {
      this.logger.log('No default pipeline found, creating one...');
      pipeline = await this.create({
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        color: '#6366f1',
        stages: DEFAULT_PIPELINE_STAGES,
      }, organizationId);
    }

    return pipeline;
  }

  /**
   * Create a new pipeline
   */
  async create(data: CreatePipelineDto, organizationId: string): Promise<Pipeline & { stages: PipelineStage[] }> {
    // If this pipeline is set as default, unset other defaults
    if (data.isDefault) {
      const updateWhere: Prisma.PipelineWhereInput = { isDefault: true };
      updateWhere.organizationId = organizationId;
      await this.prisma.pipeline.updateMany({
        where: updateWhere,
        data: { isDefault: false },
      });
    }

    // Get the next sort order
    const maxSortOrder = await this.prisma.pipeline.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // Use provided stages or default stages
    const stagesToCreate = data.stages?.length ? data.stages : DEFAULT_PIPELINE_STAGES;

    const pipeline = await this.prisma.pipeline.create({
      data: {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault ?? false,
        color: data.color,
        sortOrder: nextSortOrder,
        organizationId,
        stages: {
          create: stagesToCreate.map((stage, index) => ({
            name: stage.name,
            displayName: stage.displayName,
            color: stage.color,
            probability: stage.probability,
            isClosedWon: stage.isClosedWon ?? false,
            isClosedLost: stage.isClosedLost ?? false,
            sortOrder: stage.sortOrder ?? index,
            organizationId,
          })),
        },
      },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Created pipeline: ${pipeline.name} (${pipeline.id})`);
    return pipeline;
  }

  /**
   * Update a pipeline
   */
  async update(id: string, data: UpdatePipelineDto, organizationId: string): Promise<Pipeline & { stages: PipelineStage[] }> {
    // Check if pipeline exists
    await this.findById(id, organizationId);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      const updateWhere: Prisma.PipelineWhereInput = { isDefault: true, id: { not: id } };
      updateWhere.organizationId = organizationId;
      await this.prisma.pipeline.updateMany({
        where: updateWhere,
        data: { isDefault: false },
      });
    }

    const pipeline = await this.prisma.pipeline.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        isActive: data.isActive,
        color: data.color,
        sortOrder: data.sortOrder,
      },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Updated pipeline: ${pipeline.name} (${pipeline.id})`);
    return pipeline;
  }

  /**
   * Delete a pipeline
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const pipeline = await this.findById(id, organizationId);

    if (pipeline.isDefault) {
      throw new BadRequestException('Cannot delete the default pipeline');
    }

    // Check if there are opportunities using this pipeline
    const opportunityCount = await this.prisma.opportunity.count({
      where: { pipelineId: id },
    });

    if (opportunityCount > 0) {
      throw new BadRequestException(
        `Cannot delete pipeline with ${opportunityCount} associated opportunities. Please reassign them first.`
      );
    }

    await this.prisma.pipeline.delete({ where: { id } });
    this.logger.log(`Deleted pipeline: ${pipeline.name} (${id})`);
  }

  /**
   * Set a pipeline as the default
   */
  async setDefault(id: string, organizationId: string): Promise<Pipeline & { stages: PipelineStage[] }> {
    await this.findById(id, organizationId);

    // Unset all other defaults
    const updateWhere: Prisma.PipelineWhereInput = { isDefault: true };
    updateWhere.organizationId = organizationId;
    await this.prisma.pipeline.updateMany({
      where: updateWhere,
      data: { isDefault: false },
    });

    return this.prisma.pipeline.update({
      where: { id },
      data: { isDefault: true },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Duplicate a pipeline with all its stages
   */
  async duplicate(id: string, newName: string, organizationId: string): Promise<Pipeline & { stages: PipelineStage[] }> {
    const original = await this.findById(id, organizationId);

    return this.create({
      name: newName,
      description: original.description ?? undefined,
      isDefault: false,
      color: original.color ?? undefined,
      stages: original.stages.map((stage) => ({
        name: stage.name,
        displayName: stage.displayName,
        color: stage.color,
        probability: stage.probability,
        isClosedWon: stage.isClosedWon,
        isClosedLost: stage.isClosedLost,
        sortOrder: stage.sortOrder,
      })),
    }, organizationId);
  }

  // ==================== STAGE OPERATIONS ====================

  /**
   * Create a new stage in a pipeline
   */
  async createStage(pipelineId: string, data: CreatePipelineStageDto, organizationId: string): Promise<PipelineStage> {
    await this.findById(pipelineId, organizationId);

    // Get the next sort order
    const maxSortOrder = await this.prisma.pipelineStage.aggregate({
      where: { pipelineId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const stage = await this.prisma.pipelineStage.create({
      data: {
        pipelineId,
        name: data.name,
        displayName: data.displayName,
        color: data.color,
        probability: data.probability,
        isClosedWon: data.isClosedWon ?? false,
        isClosedLost: data.isClosedLost ?? false,
        sortOrder: data.sortOrder ?? nextSortOrder,
        organizationId,
      },
    });

    this.logger.log(`Created stage: ${stage.displayName} in pipeline ${pipelineId}`);
    return stage;
  }

  /**
   * Update a stage
   */
  async updateStage(pipelineId: string, stageId: string, data: UpdatePipelineStageDto, organizationId: string): Promise<PipelineStage> {
    // Verify the stage belongs to the pipeline
    const where: Prisma.PipelineStageWhereInput = { id: stageId, pipelineId };
    where.organizationId = organizationId;

    const stage = await this.prisma.pipelineStage.findFirst({
      where,
    });

    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found in pipeline ${pipelineId}`);
    }

    // If setting isClosedWon, unset isClosedLost and vice versa
    const updateData: Prisma.PipelineStageUpdateInput = { ...data };
    if (data.isClosedWon) {
      updateData.isClosedLost = false;
    } else if (data.isClosedLost) {
      updateData.isClosedWon = false;
    }

    const updated = await this.prisma.pipelineStage.update({
      where: { id: stageId },
      data: updateData,
    });

    this.logger.log(`Updated stage: ${updated.displayName} (${stageId})`);
    return updated;
  }

  /**
   * Delete a stage
   */
  async deleteStage(pipelineId: string, stageId: string, organizationId: string): Promise<void> {
    // Verify the stage belongs to the pipeline
    const where: Prisma.PipelineStageWhereInput = { id: stageId, pipelineId };
    where.organizationId = organizationId;

    const stage = await this.prisma.pipelineStage.findFirst({
      where,
    });

    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found in pipeline ${pipelineId}`);
    }

    // Check minimum stages
    const stageCount = await this.prisma.pipelineStage.count({
      where: { pipelineId },
    });

    if (stageCount <= 2) {
      throw new BadRequestException('Pipeline must have at least 2 stages');
    }

    // Check if there are opportunities using this stage
    const opportunityCount = await this.prisma.opportunity.count({
      where: { stageId },
    });

    if (opportunityCount > 0) {
      throw new BadRequestException(
        `Cannot delete stage with ${opportunityCount} associated opportunities. Please reassign them first.`
      );
    }

    await this.prisma.pipelineStage.delete({ where: { id: stageId } });
    this.logger.log(`Deleted stage: ${stage.displayName} (${stageId})`);
  }

  /**
   * Reorder stages in a pipeline
   */
  async reorderStages(pipelineId: string, data: ReorderStagesDto, organizationId: string): Promise<PipelineStage[]> {
    await this.findById(pipelineId, organizationId);

    // Update sort order for each stage
    const updates = data.stageIds.map((stageId, index) =>
      this.prisma.pipelineStage.update({
        where: { id: stageId },
        data: { sortOrder: index },
      })
    );

    await this.prisma.$transaction(updates);

    // Return the reordered stages
    return this.prisma.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Ensure a default pipeline exists (called on app startup)
   */
  async ensureDefaultPipeline(organizationId: string): Promise<void> {
    const where: Prisma.PipelineWhereInput = { isDefault: true };
    where.organizationId = organizationId;

    const defaultPipeline = await this.prisma.pipeline.findFirst({
      where,
    });

    if (!defaultPipeline) {
      this.logger.log('Creating default Sales Pipeline...');
      await this.create({
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        color: '#6366f1',
        stages: DEFAULT_PIPELINE_STAGES,
      }, organizationId);
    }
  }
}
