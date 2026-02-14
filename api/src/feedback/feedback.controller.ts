// RLHF Feedback Controller - API endpoints for feedback collection and export
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import {
  SubmitFeedbackDto,
  SubmitPreferencePairDto,
  CreateGoldenExampleDto,
  ExportFeedbackDto,
} from './dto/feedback.dto';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

@ApiTags('Feedback')
@ApiBearerAuth('JWT')
@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Submit feedback for a message (thumbs up/down with optional details)
   * POST /api/feedback/messages/:messageId
   */
  @Post('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @Param('messageId') messageId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(messageId, dto);
  }

  /**
   * Submit a preference pair (for A/B comparisons / DPO training)
   * POST /api/feedback/preference-pairs
   */
  @Post('preference-pairs')
  @HttpCode(HttpStatus.CREATED)
  async submitPreferencePair(@Body() dto: SubmitPreferencePairDto) {
    return this.feedbackService.submitPreferencePair(dto);
  }

  /**
   * Create a golden example manually
   * POST /api/feedback/golden-examples
   */
  @Post('golden-examples')
  @HttpCode(HttpStatus.CREATED)
  async createGoldenExample(@Body() dto: CreateGoldenExampleDto) {
    return this.feedbackService.createGoldenExample(dto);
  }

  /**
   * Get golden examples for a category (used for few-shot prompting)
   * GET /api/feedback/golden-examples?category=lead_management&limit=3
   */
  @Get('golden-examples')
  async getGoldenExamples(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.getGoldenExamples(
      category,
      limit ? parseInt(limit, 10) : 3,
    );
  }

  /**
   * Get feedback analytics and statistics
   * GET /api/feedback/analytics
   */
  @Get('analytics')
  async getAnalytics() {
    return this.feedbackService.getAnalytics();
  }

  /**
   * Export feedback data for RLHF training
   * GET /api/feedback/export?format=jsonl&category=lead_management&rating=POSITIVE
   */
  @Get('export')
  async exportForTraining(
    @Query('format') format?: 'jsonl' | 'csv' | 'dpo',
    @Query('category') category?: string,
    @Query('rating') rating?: 'POSITIVE' | 'NEGATIVE',
    @Query('limit') limit?: string,
  ) {
    const dto: ExportFeedbackDto = {
      format,
      category,
      rating: rating as any,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.feedbackService.exportForTraining(dto);
  }
}
