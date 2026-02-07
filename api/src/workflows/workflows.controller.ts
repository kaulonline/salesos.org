import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  TriggerWorkflowDto,
  WorkflowListQueryDto,
  ExecutionListQueryDto,
  WorkflowTriggerType,
  WorkflowActionType,
  ConditionOperator,
  WorkflowEntityType,
} from './dto/workflow.dto';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  /**
   * Get workflow configuration options (trigger types, action types, etc.)
   */
  @Get('config')
  getConfiguration() {
    return {
      triggerTypes: Object.values(WorkflowTriggerType).map((type) => ({
        value: type,
        label: this.formatLabel(type),
        description: this.getTriggerDescription(type),
      })),
      actionTypes: Object.values(WorkflowActionType).map((type) => ({
        value: type,
        label: this.formatLabel(type),
        description: this.getActionDescription(type),
      })),
      conditionOperators: Object.values(ConditionOperator).map((op) => ({
        value: op,
        label: this.formatLabel(op),
      })),
      entityTypes: Object.values(WorkflowEntityType).map((type) => ({
        value: type,
        label: type,
      })),
    };
  }

  /**
   * Get workflow statistics
   */
  @Get('stats')
  getStats() {
    return this.workflowsService.getStats();
  }

  /**
   * List all workflows
   */
  @Get()
  findAll(@Query() query: WorkflowListQueryDto) {
    return this.workflowsService.findAll(query);
  }

  /**
   * Get execution history
   */
  @Get('executions')
  getExecutions(@Query() query: ExecutionListQueryDto) {
    return this.workflowsService.getExecutions(query);
  }

  /**
   * Get a single workflow by ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  /**
   * Create a new workflow
   */
  @Post()
  create(@Request() req, @Body() dto: CreateWorkflowDto) {
    const userId = req.user.userId;
    return this.workflowsService.create(userId, dto);
  }

  /**
   * Update a workflow
   */
  @Put(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateWorkflowDto) {
    const userId = req.user.userId;
    return this.workflowsService.update(id, userId, dto);
  }

  /**
   * Delete a workflow
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.workflowsService.delete(id);
  }

  /**
   * Activate a workflow
   */
  @Post(':id/activate')
  activate(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.workflowsService.activate(id, userId);
  }

  /**
   * Deactivate a workflow
   */
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.workflowsService.deactivate(id, userId);
  }

  /**
   * Manually trigger a workflow
   */
  @Post('trigger')
  trigger(@Request() req, @Body() dto: TriggerWorkflowDto) {
    const userId = req.user.userId;
    return this.workflowsService.triggerManually(dto, userId);
  }

  /**
   * Get executions for a specific workflow
   */
  @Get(':id/executions')
  getWorkflowExecutions(@Param('id') id: string, @Query() query: ExecutionListQueryDto) {
    return this.workflowsService.getExecutions({ ...query, workflowId: id });
  }

  private formatLabel(value: string): string {
    return value
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getTriggerDescription(type: WorkflowTriggerType): string {
    const descriptions: Record<WorkflowTriggerType, string> = {
      [WorkflowTriggerType.RECORD_CREATED]: 'Trigger when a new record is created',
      [WorkflowTriggerType.RECORD_UPDATED]: 'Trigger when a record is updated',
      [WorkflowTriggerType.RECORD_DELETED]: 'Trigger when a record is deleted',
      [WorkflowTriggerType.FIELD_CHANGED]: 'Trigger when a specific field value changes',
      [WorkflowTriggerType.STAGE_CHANGED]: 'Trigger when a deal stage changes',
      [WorkflowTriggerType.TIME_BASED]: 'Trigger on a scheduled time',
      [WorkflowTriggerType.WEBHOOK]: 'Trigger via external webhook',
      [WorkflowTriggerType.MANUAL]: 'Trigger manually by a user',
    };
    return descriptions[type] || '';
  }

  private getActionDescription(type: WorkflowActionType): string {
    const descriptions: Record<WorkflowActionType, string> = {
      [WorkflowActionType.SEND_EMAIL]: 'Send an email notification',
      [WorkflowActionType.CREATE_TASK]: 'Create a follow-up task',
      [WorkflowActionType.UPDATE_FIELD]: 'Update a field value on the record',
      [WorkflowActionType.SEND_NOTIFICATION]: 'Send an in-app notification',
      [WorkflowActionType.WEBHOOK_CALL]: 'Make an HTTP request to an external URL',
      [WorkflowActionType.ASSIGN_OWNER]: 'Assign or change the record owner',
      [WorkflowActionType.ADD_TAG]: 'Add a tag to the record',
      [WorkflowActionType.REMOVE_TAG]: 'Remove a tag from the record',
      [WorkflowActionType.CREATE_ACTIVITY]: 'Log an activity on the record',
    };
    return descriptions[type] || '';
  }
}
