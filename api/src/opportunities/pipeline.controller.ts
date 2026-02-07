import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PipelineIntelligenceService } from './pipeline-intelligence.service';
import {
  PipelineFiltersDto,
  UpdateMEDDICDto,
  UpdateForecastCategoryDto,
} from './dto/pipeline.dto';

@Controller('pipeline')
@UseGuards(JwtAuthGuard)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineIntelligenceService) {}

  /**
   * Get pipeline deals with MEDDIC and forecast data
   */
  @Get('deals')
  async getPipelineDeals(@Query() filters: PipelineFiltersDto, @Request() req: any) {
    return this.pipelineService.getPipelineDeals(
      filters,
      req.user.userId,
      req.user.role?.toUpperCase() === 'ADMIN',
    );
  }

  /**
   * Get pipeline statistics and forecast summaries
   */
  @Get('stats')
  async getPipelineStats(@Query() filters: PipelineFiltersDto, @Request() req: any) {
    return this.pipelineService.getPipelineStats(
      filters,
      req.user.userId,
      req.user.role?.toUpperCase() === 'ADMIN',
    );
  }

  /**
   * Update MEDDIC score for an opportunity
   */
  @Put('meddic')
  async updateMEDDIC(@Body() dto: UpdateMEDDICDto, @Request() req: any) {
    return this.pipelineService.updateMEDDIC(dto, req.user.userId);
  }

  /**
   * Update forecast category for an opportunity
   */
  @Put('forecast')
  async updateForecastCategory(@Body() dto: UpdateForecastCategoryDto, @Request() req: any) {
    return this.pipelineService.updateForecastCategory(dto, req.user.userId);
  }

  /**
   * Get AI-powered MEDDIC analysis for an opportunity
   */
  @Get('meddic/analyze/:opportunityId')
  async analyzeMEDDIC(@Param('opportunityId') opportunityId: string) {
    return this.pipelineService.analyzeMEDDIC(opportunityId);
  }
}
