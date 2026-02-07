/**
 * Action Item Tracker Controller
 *
 * REST API endpoints for Action Item Tracking with Slippage Alerts.
 * Part of Phase 2 Vertiv O2O Journey - AI-Enabled Sales Coaching
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ActionItemTrackerService } from './action-item-tracker.service';
import {
  CreateActionItemDto,
  CreateActionItemFromAgendaDto,
  UpdateActionItemStatusDto,
  UpdateActionItemDto,
  GetActionItemsQueryDto,
  EscalateActionItemDto,
  AcknowledgeAlertDto,
} from './dto/action-item.dto';

@Controller('coaching/action-items')
@UseGuards(JwtAuthGuard)
export class ActionItemTrackerController {
  constructor(private readonly actionItemService: ActionItemTrackerService) {}

  // ==================== REPORTING (must come before :id routes) ====================

  /**
   * Get slippage report
   * GET /coaching/action-items/reports/slippage
   */
  @Get('reports/slippage')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getSlippageReport(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const managerId = req.user.role === 'ADMIN' ? undefined : req.user.id;
    return this.actionItemService.getSlippageReport(
      managerId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get progress report for a rep
   * GET /coaching/action-items/reports/progress/:repId
   */
  @Get('reports/progress/:repId')
  async getRepProgress(
    @Req() req: any,
    @Param('repId') repId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Reps can only see their own progress
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER' && req.user.id !== repId) {
      repId = req.user.id;
    }
    return this.actionItemService.getRepProgress(
      repId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get my progress (for reps)
   * GET /coaching/action-items/reports/my-progress
   */
  @Get('reports/my-progress')
  async getMyProgress(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.actionItemService.getRepProgress(
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ==================== ACTION ITEM CRUD ====================

  /**
   * Create a new action item
   * POST /coaching/action-items
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async createActionItem(@Req() req: any, @Body() dto: CreateActionItemDto) {
    return this.actionItemService.createActionItem(req.user.id, dto);
  }

  /**
   * Create action items from a coaching agenda
   * POST /coaching/action-items/from-agenda
   */
  @Post('from-agenda')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async createFromAgenda(
    @Req() req: any,
    @Body() dto: CreateActionItemFromAgendaDto,
  ) {
    return this.actionItemService.createFromAgenda(req.user.id, dto);
  }

  /**
   * Get action items with filtering
   * GET /coaching/action-items
   */
  @Get()
  async getActionItems(@Req() req: any, @Query() query: GetActionItemsQueryDto) {
    // If user is not manager/admin, only show their own items
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      query.repId = req.user.id;
    }
    return this.actionItemService.getActionItems(query);
  }

  /**
   * Get my action items (for reps)
   * GET /coaching/action-items/my-items
   */
  @Get('my-items')
  async getMyActionItems(@Req() req: any, @Query() query: GetActionItemsQueryDto) {
    query.repId = req.user.id;
    return this.actionItemService.getActionItems(query);
  }

  /**
   * Get action items I've assigned (for managers)
   * GET /coaching/action-items/assigned
   */
  @Get('assigned')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getAssignedItems(@Req() req: any, @Query() query: GetActionItemsQueryDto) {
    query.managerId = req.user.id;
    return this.actionItemService.getActionItems(query);
  }

  /**
   * Get overdue items (for managers)
   * GET /coaching/action-items/overdue
   */
  @Get('overdue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getOverdueItems(@Req() req: any, @Query() query: GetActionItemsQueryDto) {
    query.isOverdue = true;
    if (req.user.role !== 'ADMIN') {
      query.managerId = req.user.id;
    }
    return this.actionItemService.getActionItems(query);
  }

  /**
   * Get a single action item
   * GET /coaching/action-items/:id
   */
  @Get(':id')
  async getActionItem(@Param('id') id: string) {
    return this.actionItemService.getActionItemById(id);
  }

  /**
   * Update action item status
   * PATCH /coaching/action-items/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateActionItemStatusDto,
  ) {
    return this.actionItemService.updateStatus(id, req.user.id, dto);
  }

  /**
   * Update action item details
   * PUT /coaching/action-items/:id
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async updateActionItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateActionItemDto,
  ) {
    return this.actionItemService.updateActionItem(id, req.user.id, dto);
  }

  /**
   * Delete an action item
   * DELETE /coaching/action-items/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async deleteActionItem(@Req() req: any, @Param('id') id: string) {
    await this.actionItemService.deleteActionItem(id, req.user.id);
  }

  // ==================== ESCALATION ====================

  /**
   * Escalate an action item
   * POST /coaching/action-items/:id/escalate
   */
  @Post(':id/escalate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async escalateItem(
    @Param('id') id: string,
    @Body() dto: EscalateActionItemDto,
  ) {
    return this.actionItemService.escalateItem(
      id,
      dto.escalationLevel,
      dto.escalateTo,
      dto.reason,
    );
  }

  // ==================== AI RECOMMENDATIONS ====================

  /**
   * Generate AI recommendation for an action item
   * POST /coaching/action-items/:id/recommend
   */
  @Post(':id/recommend')
  async generateRecommendation(@Param('id') id: string) {
    const recommendation = await this.actionItemService.generateAIRecommendation(id);
    return { recommendation };
  }
}
