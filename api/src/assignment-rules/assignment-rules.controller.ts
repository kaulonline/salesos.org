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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AssignmentRulesService } from './assignment-rules.service';
import { CreateAssignmentRuleDto } from './dto/create-assignment-rule.dto';
import { UpdateAssignmentRuleDto } from './dto/update-assignment-rule.dto';
import { AssignmentRuleEntity, ConditionOperator } from '@prisma/client';

@ApiTags('Assignment Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignment-rules')
export class AssignmentRulesController {
  constructor(private readonly assignmentRulesService: AssignmentRulesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new assignment rule' })
  async create(@Request() req, @Body() dto: CreateAssignmentRuleDto) {
    return this.assignmentRulesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assignment rules' })
  @ApiQuery({ name: 'entity', enum: AssignmentRuleEntity, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  async findAll(
    @Query('entity') entity?: AssignmentRuleEntity,
    @Query('isActive') isActive?: string,
  ) {
    return this.assignmentRulesService.findAll({
      entity,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get assignment rule statistics' })
  async getStats() {
    return this.assignmentRulesService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assignment rule by ID' })
  async findOne(@Param('id') id: string) {
    return this.assignmentRulesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update an assignment rule' })
  async update(@Param('id') id: string, @Body() dto: UpdateAssignmentRuleDto) {
    return this.assignmentRulesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an assignment rule' })
  async remove(@Param('id') id: string) {
    return this.assignmentRulesService.remove(id);
  }

  // Conditions management
  @Post(':id/conditions')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a condition to the rule' })
  async addCondition(
    @Param('id') id: string,
    @Body() body: { field: string; operator: ConditionOperator; value: string; order?: number },
  ) {
    return this.assignmentRulesService.addCondition(id, body);
  }

  @Delete(':id/conditions/:conditionId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove a condition from the rule' })
  async removeCondition(
    @Param('id') id: string,
    @Param('conditionId') conditionId: string,
  ) {
    return this.assignmentRulesService.removeCondition(id, conditionId);
  }

  @Patch(':id/conditions')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update all conditions for a rule' })
  async updateConditions(
    @Param('id') id: string,
    @Body() body: { conditions: Array<{ field: string; operator: ConditionOperator; value: string; order?: number }> },
  ) {
    return this.assignmentRulesService.updateConditions(id, body.conditions);
  }

  // Assignees management
  @Post(':id/assignees')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add an assignee to the rule' })
  async addAssignee(
    @Param('id') id: string,
    @Body() body: { userId?: string; teamId?: string; weight?: number; order?: number },
  ) {
    return this.assignmentRulesService.addAssignee(id, body);
  }

  @Delete(':id/assignees/:assigneeId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove an assignee from the rule' })
  async removeAssignee(
    @Param('id') id: string,
    @Param('assigneeId') assigneeId: string,
  ) {
    return this.assignmentRulesService.removeAssignee(id, assigneeId);
  }

  @Patch(':id/assignees')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update all assignees for a rule' })
  async updateAssignees(
    @Param('id') id: string,
    @Body() body: { assignees: Array<{ userId?: string; teamId?: string; weight?: number; order?: number }> },
  ) {
    return this.assignmentRulesService.updateAssignees(id, body.assignees);
  }

  // Rule testing
  @Post(':id/test')
  @ApiOperation({ summary: 'Test a rule against sample data' })
  async testRule(
    @Param('id') id: string,
    @Body() body: { testData: Record<string, any> },
  ) {
    return this.assignmentRulesService.testRule(id, body.testData);
  }

  // Reorder rules
  @Post('reorder')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reorder rules for an entity' })
  async reorder(
    @Body() body: { entity: AssignmentRuleEntity; ruleIds: string[] },
  ) {
    return this.assignmentRulesService.reorder(body.entity, body.ruleIds);
  }

  // Evaluate rules for a record (internal API)
  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate rules and get assigned user for a record' })
  async evaluateRules(
    @Body() body: { entity: AssignmentRuleEntity; recordData: Record<string, any> },
  ) {
    const assignedUserId = await this.assignmentRulesService.evaluateRules(body.entity, body.recordData);
    return { assignedUserId };
  }
}
