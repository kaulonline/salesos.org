import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import { PipelinesService } from './pipelines.service';
import {
  CreatePipelineDto,
  CreatePipelineStageDto,
  UpdatePipelineDto,
  UpdatePipelineStageDto,
  ReorderStagesDto,
  DuplicatePipelineDto,
} from './dto';

@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  /**
   * Get all pipelines
   */
  @Get()
  findAll(@CurrentOrganization() organizationId: string) {
    return this.pipelinesService.findAll(organizationId);
  }

  /**
   * Get the default pipeline
   */
  @Get('default')
  findDefault(@CurrentOrganization() organizationId: string) {
    return this.pipelinesService.findDefault(organizationId);
  }

  /**
   * Get a single pipeline by ID
   */
  @Get(':id')
  findById(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.findById(id, organizationId);
  }

  /**
   * Create a new pipeline
   */
  @Post()
  create(
    @Body() createDto: CreatePipelineDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.create(createDto, organizationId);
  }

  /**
   * Update a pipeline
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePipelineDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.update(id, updateDto, organizationId);
  }

  /**
   * Delete a pipeline
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.delete(id, organizationId);
  }

  /**
   * Set a pipeline as the default
   */
  @Post(':id/set-default')
  setDefault(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.setDefault(id, organizationId);
  }

  /**
   * Duplicate a pipeline
   */
  @Post(':id/duplicate')
  duplicate(
    @Param('id') id: string,
    @Body() dto: DuplicatePipelineDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.duplicate(id, dto.name, organizationId);
  }

  // ==================== STAGE ENDPOINTS ====================

  /**
   * Create a new stage in a pipeline
   */
  @Post(':pipelineId/stages')
  createStage(
    @Param('pipelineId') pipelineId: string,
    @Body() createDto: CreatePipelineStageDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.createStage(pipelineId, createDto, organizationId);
  }

  /**
   * Update a stage
   */
  @Patch(':pipelineId/stages/:stageId')
  updateStage(
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body() updateDto: UpdatePipelineStageDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.updateStage(pipelineId, stageId, updateDto, organizationId);
  }

  /**
   * Delete a stage
   */
  @Delete(':pipelineId/stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStage(
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.deleteStage(pipelineId, stageId, organizationId);
  }

  /**
   * Reorder stages in a pipeline
   */
  @Post(':pipelineId/stages/reorder')
  reorderStages(
    @Param('pipelineId') pipelineId: string,
    @Body() reorderDto: ReorderStagesDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.pipelinesService.reorderStages(pipelineId, reorderDto, organizationId);
  }
}
