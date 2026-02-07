import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PendingActionsService } from './services/pending-actions.service';
import {
  ApproveActionDto,
  ApproveBulkActionsDto,
  RejectActionDto,
  EditActionDto,
  ListPendingActionsQueryDto,
  PendingActionResponseDto,
  BulkApprovalResultDto,
} from './dto/pending-action.dto';
import { PendingActionStatus } from '@prisma/client';

@ApiTags('Meeting Pending Actions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meetings/pending-actions')
export class PendingActionsController {
  constructor(private readonly pendingActionsService: PendingActionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all pending actions for current user' })
  @ApiQuery({ name: 'status', required: false, enum: PendingActionStatus })
  @ApiQuery({ name: 'meetingSessionId', required: false })
  @ApiResponse({ status: 200, type: [PendingActionResponseDto] })
  async listPendingActions(
    @Request() req,
    @Query() query: ListPendingActionsQueryDto,
  ) {
    if (query.meetingSessionId) {
      return this.pendingActionsService.getPendingActionsForMeeting(query.meetingSessionId);
    }
    return this.pendingActionsService.getPendingActionsForUser(
      req.user.sub,
      query.status,
    );
  }

  @Get('meeting/:meetingSessionId')
  @ApiOperation({ summary: 'Get all pending actions for a specific meeting' })
  @ApiParam({ name: 'meetingSessionId', description: 'Meeting session ID' })
  @ApiResponse({ status: 200, type: [PendingActionResponseDto] })
  async getPendingActionsForMeeting(
    @Param('meetingSessionId') meetingSessionId: string,
  ) {
    return this.pendingActionsService.getPendingActionsForMeeting(meetingSessionId);
  }

  @Post(':actionId/approve')
  @ApiOperation({ summary: 'Approve and execute a pending action' })
  @ApiParam({ name: 'actionId', description: 'Pending action ID' })
  @ApiResponse({ status: 200, description: 'Action approved and executed' })
  async approveAction(
    @Param('actionId') actionId: string,
    @Request() req,
    @Body() dto: ApproveActionDto,
  ) {
    // If edits provided, apply them first
    if (dto.edits && Object.keys(dto.edits).length > 0) {
      await this.pendingActionsService.editAction(actionId, req.user.sub, dto.edits);
    }
    return this.pendingActionsService.approveAction(actionId, req.user.sub);
  }

  @Post('approve-bulk')
  @ApiOperation({ summary: 'Approve and execute multiple pending actions' })
  @ApiResponse({ status: 200, type: BulkApprovalResultDto })
  async approveBulkActions(
    @Body() dto: ApproveBulkActionsDto,
    @Request() req,
  ) {
    return this.pendingActionsService.approveMultipleActions(dto.actionIds, req.user.sub);
  }

  @Post('meeting/:meetingSessionId/approve-all')
  @ApiOperation({ summary: 'Approve all pending actions for a meeting' })
  @ApiParam({ name: 'meetingSessionId', description: 'Meeting session ID' })
  @ApiResponse({ status: 200, type: BulkApprovalResultDto })
  async approveAllForMeeting(
    @Param('meetingSessionId') meetingSessionId: string,
    @Request() req,
  ) {
    return this.pendingActionsService.approveAllForMeeting(meetingSessionId, req.user.sub);
  }

  @Post(':actionId/reject')
  @ApiOperation({ summary: 'Reject a pending action' })
  @ApiParam({ name: 'actionId', description: 'Pending action ID' })
  @ApiResponse({ status: 200, description: 'Action rejected' })
  async rejectAction(
    @Param('actionId') actionId: string,
    @Request() req,
    @Body() dto: RejectActionDto,
  ) {
    await this.pendingActionsService.rejectAction(actionId, req.user.sub, dto.reason);
    return { success: true };
  }

  @Patch(':actionId')
  @ApiOperation({ summary: 'Edit a pending action before approval' })
  @ApiParam({ name: 'actionId', description: 'Pending action ID' })
  @ApiResponse({ status: 200, type: PendingActionResponseDto })
  async editAction(
    @Param('actionId') actionId: string,
    @Request() req,
    @Body() dto: EditActionDto,
  ) {
    return this.pendingActionsService.editAction(actionId, req.user.sub, dto.updatedData);
  }

  @Post('meeting/:meetingSessionId/regenerate')
  @ApiOperation({ summary: 'Regenerate pending actions from existing meeting analysis' })
  @ApiParam({ name: 'meetingSessionId', description: 'Meeting session ID' })
  @ApiResponse({ status: 200, description: 'Pending actions regenerated from analysis' })
  async regeneratePendingActions(
    @Param('meetingSessionId') meetingSessionId: string,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.pendingActionsService.regenerateFromExistingAnalysis(meetingSessionId, userId);
  }
}
