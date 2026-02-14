/**
 * Coaching Effectiveness Controller
 *
 * API endpoints for measuring coaching impact on sales performance.
 * Phase 2 Vertiv O2O Journey - AI-Enabled Sales Coaching
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CoachingEffectivenessService } from './coaching-effectiveness.service';
import {
  GetEffectivenessQueryDto,
  GetRepEffectivenessQueryDto,
} from './dto/coaching-effectiveness.dto';

@ApiTags('Coaching Effectiveness')
@ApiBearerAuth('JWT')
@Controller('coaching/effectiveness')
@UseGuards(JwtAuthGuard)
export class CoachingEffectivenessController {
  private readonly logger = new Logger(CoachingEffectivenessController.name);

  constructor(
    private readonly effectivenessService: CoachingEffectivenessService,
  ) {}

  /**
   * GET /coaching/effectiveness/summary
   * Get overall effectiveness dashboard for the current user (manager)
   */
  @Get('summary')
  async getEffectivenessSummary(
    @Request() req: any,
    @Query() query: GetEffectivenessQueryDto,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const userRole = req.user?.role;

    this.logger.log(
      `Getting effectiveness summary for user ${userId} with role ${userRole}`,
    );

    // Only managers and admins can view effectiveness metrics
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      throw new ForbiddenException(
        'Only managers and admins can view coaching effectiveness metrics',
      );
    }

    return this.effectivenessService.getEffectivenessSummary(userId, query);
  }

  /**
   * GET /coaching/effectiveness/rep/:repId
   * Get detailed effectiveness report for a specific rep
   */
  @Get('rep/:repId')
  async getRepEffectiveness(
    @Request() req: any,
    @Param('repId') repId: string,
    @Query() query: GetRepEffectivenessQueryDto,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const userRole = req.user?.role;

    this.logger.log(
      `Getting effectiveness report for rep ${repId} by user ${userId}`,
    );

    // Users can view their own effectiveness, managers/admins can view any
    if (userId !== repId && !['ADMIN', 'MANAGER'].includes(userRole)) {
      throw new ForbiddenException(
        'You can only view your own effectiveness metrics',
      );
    }

    return this.effectivenessService.getRepEffectiveness(repId, query);
  }

  /**
   * GET /coaching/effectiveness/comparison
   * Get team comparison metrics for the current manager
   */
  @Get('comparison')
  async getTeamComparison(
    @Request() req: any,
    @Query() query: GetEffectivenessQueryDto,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const userRole = req.user?.role;

    this.logger.log(`Getting team comparison for manager ${userId}`);

    // Only managers and admins can view team comparisons
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      throw new ForbiddenException(
        'Only managers and admins can view team comparison metrics',
      );
    }

    return this.effectivenessService.getTeamComparison(userId, query);
  }

  /**
   * GET /coaching/effectiveness/my-progress
   * Get effectiveness metrics for the current user (as a rep)
   */
  @Get('my-progress')
  async getMyProgress(
    @Request() req: any,
    @Query() query: GetRepEffectivenessQueryDto,
  ) {
    const userId = req.user?.id || req.user?.sub;

    this.logger.log(`Getting personal effectiveness progress for user ${userId}`);

    return this.effectivenessService.getRepEffectiveness(userId, query);
  }
}
