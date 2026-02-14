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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { ApprovalWorkflowsService } from './approval-workflows.service';
import {
  CreateApprovalWorkflowDto,
  UpdateApprovalWorkflowDto,
  CreateApprovalStepDto,
  UpdateApprovalStepDto,
  SubmitForApprovalDto,
  ApprovalDecisionDto,
  ReorderStepsDto,
  CloneWorkflowDto,
  CancelRequestDto,
  ApprovalEntity,
  ApprovalStatus,
} from './dto/approval-workflow.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('Approval Workflows')
@ApiBearerAuth('JWT')
@Controller('approval-workflows')
@UseGuards(JwtAuthGuard)
export class ApprovalWorkflowsController {
  constructor(private readonly service: ApprovalWorkflowsService) {}

  // ============ Workflows ============

  @Get('stats')
  getStats(@CurrentOrganization() organizationId: string) {
    return this.service.getStats(organizationId);
  }

  @Get()
  findAll(
    @CurrentOrganization() organizationId: string,
    @Query('entity') entity?: ApprovalEntity,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(organizationId, {
      entity,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('entity/:entity')
  findByEntity(
    @Param('entity') entity: ApprovalEntity,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.findByEntity(entity, organizationId);
  }

  @Get('check/:entityType/:entityId')
  checkApprovalRequired(
    @Param('entityType') entityType: ApprovalEntity,
    @Param('entityId') entityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.checkApprovalRequired(entityType, entityId, organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrganization() organizationId: string) {
    return this.service.findOne(id, organizationId);
  }

  @Post()
  create(
    @Body() dto: CreateApprovalWorkflowDto,
    @Request() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.create(dto, req.user.id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalWorkflowDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.update(id, dto, organizationId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentOrganization() organizationId: string) {
    return this.service.delete(id, organizationId);
  }

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Body() dto: CloneWorkflowDto,
    @Request() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.clone(id, dto.name, req.user.id, organizationId);
  }

  @Post(':id/toggle-active')
  toggleActive(@Param('id') id: string, @CurrentOrganization() organizationId: string) {
    return this.service.toggleActive(id, organizationId);
  }

  // ============ Steps ============

  @Post(':workflowId/steps')
  addStep(
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateApprovalStepDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.addStep(workflowId, dto, organizationId);
  }

  @Patch(':workflowId/steps/:stepId')
  updateStep(
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateApprovalStepDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.updateStep(workflowId, stepId, dto, organizationId);
  }

  @Delete(':workflowId/steps/:stepId')
  deleteStep(
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.deleteStep(workflowId, stepId, organizationId);
  }

  @Post(':workflowId/steps/reorder')
  reorderSteps(
    @Param('workflowId') workflowId: string,
    @Body() dto: ReorderStepsDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.reorderSteps(workflowId, dto.stepIds, organizationId);
  }
}

@Controller('approval-requests')
@UseGuards(JwtAuthGuard)
export class ApprovalRequestsController {
  constructor(private readonly service: ApprovalWorkflowsService) {}

  @Get()
  findAll(
    @CurrentOrganization() organizationId: string,
    @Query('entityType') entityType?: ApprovalEntity,
    @Query('status') status?: ApprovalStatus,
    @Query('requestedById') requestedById?: string,
    @Query('approverId') approverId?: string,
  ) {
    return this.service.findAllRequests(organizationId, {
      entityType,
      status,
      requestedById,
      approverId,
    });
  }

  @Get('pending')
  findPending(@Request() req: any, @CurrentOrganization() organizationId: string) {
    return this.service.findPendingRequests(req.user.id, organizationId);
  }

  @Get('entity/:entityType/:entityId')
  findForEntity(
    @Param('entityType') entityType: ApprovalEntity,
    @Param('entityId') entityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.findRequestsForEntity(entityType, entityId, organizationId);
  }

  @Get('history/:entityType/:entityId')
  getHistory(
    @Param('entityType') entityType: ApprovalEntity,
    @Param('entityId') entityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.getApprovalHistory(entityType, entityId, organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrganization() organizationId: string) {
    return this.service.findRequestById(id, organizationId);
  }

  @Post('submit')
  submit(
    @Body() dto: SubmitForApprovalDto,
    @Request() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.submitForApproval(dto, req.user.id, organizationId);
  }

  @Post(':id/decide')
  decide(
    @Param('id') id: string,
    @Body() dto: ApprovalDecisionDto,
    @Request() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.makeDecision(id, dto, req.user.id, organizationId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelRequestDto,
    @Request() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.service.cancelRequest(id, dto.reason, req.user.id, organizationId);
  }
}
