import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAssignmentRuleDto } from './dto/create-assignment-rule.dto';
import { UpdateAssignmentRuleDto } from './dto/update-assignment-rule.dto';
import { AssignmentRuleEntity, AssignmentMethod, ConditionOperator } from '@prisma/client';

@Injectable()
export class AssignmentRulesService {
  constructor(private prisma: PrismaService) {}

  async create(createdBy: string, dto: CreateAssignmentRuleDto) {
    const maxPriority = await this.prisma.assignmentRule.aggregate({
      where: { entity: dto.entity },
      _max: { priority: true },
    });

    return this.prisma.assignmentRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        entity: dto.entity,
        method: dto.method || 'ROUND_ROBIN',
        isActive: dto.isActive ?? true,
        priority: dto.order ?? (maxPriority._max.priority ?? 0) + 1,
        createdBy,
        conditions: dto.conditions ? {
          create: dto.conditions.map((c, idx) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
            sortOrder: c.order ?? idx,
          })),
        } : undefined,
        assignees: dto.assignees ? {
          create: dto.assignees.filter(a => a.userId).map(a => ({
            userId: a.userId!,
            weight: a.weight ?? 1,
          })),
        } : undefined,
      },
      include: {
        conditions: { orderBy: { sortOrder: 'asc' } },
        assignees: true,
      },
    });
  }

  async findAll(filters?: {
    entity?: AssignmentRuleEntity;
    isActive?: boolean;
  }) {
    return this.prisma.assignmentRule.findMany({
      where: {
        entity: filters?.entity,
        isActive: filters?.isActive,
      },
      include: {
        conditions: { orderBy: { sortOrder: 'asc' } },
        assignees: true,
      },
      orderBy: { priority: 'asc' },
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id },
      include: {
        conditions: { orderBy: { sortOrder: 'asc' } },
        assignees: true,
      },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    return rule;
  }

  async update(id: string, dto: UpdateAssignmentRuleDto) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    return this.prisma.assignmentRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        method: dto.method,
        isActive: dto.isActive,
        priority: dto.order,
      },
      include: {
        conditions: { orderBy: { sortOrder: 'asc' } },
        assignees: true,
      },
    });
  }

  async remove(id: string) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    await this.prisma.assignmentRule.delete({ where: { id } });
    return { success: true };
  }

  async addCondition(ruleId: string, condition: {
    field: string;
    operator: ConditionOperator;
    value: string;
    order?: number;
  }) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id: ruleId },
      include: { conditions: true },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    return this.prisma.assignmentRuleCondition.create({
      data: {
        ruleId,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        sortOrder: condition.order ?? rule.conditions.length,
      },
    });
  }

  async removeCondition(ruleId: string, conditionId: string) {
    const condition = await this.prisma.assignmentRuleCondition.findFirst({
      where: { id: conditionId, ruleId },
    });

    if (!condition) {
      throw new NotFoundException('Condition not found');
    }

    await this.prisma.assignmentRuleCondition.delete({
      where: { id: conditionId },
    });

    return { success: true };
  }

  async updateConditions(ruleId: string, conditions: Array<{
    field: string;
    operator: ConditionOperator;
    value: string;
    order?: number;
  }>) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    await this.prisma.assignmentRuleCondition.deleteMany({
      where: { ruleId },
    });

    await this.prisma.assignmentRuleCondition.createMany({
      data: conditions.map((c, idx) => ({
        ruleId,
        field: c.field,
        operator: c.operator,
        value: c.value,
        sortOrder: c.order ?? idx,
      })),
    });

    return this.findOne(ruleId);
  }

  async addAssignee(ruleId: string, assignee: {
    userId?: string;
    weight?: number;
  }) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    if (!assignee.userId) {
      throw new BadRequestException('userId must be provided');
    }

    return this.prisma.assignmentRuleAssignee.create({
      data: {
        ruleId,
        userId: assignee.userId,
        weight: assignee.weight ?? 1,
      },
    });
  }

  async removeAssignee(ruleId: string, assigneeId: string) {
    const assignee = await this.prisma.assignmentRuleAssignee.findFirst({
      where: { id: assigneeId, ruleId },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }

    await this.prisma.assignmentRuleAssignee.delete({
      where: { id: assigneeId },
    });

    return { success: true };
  }

  async updateAssignees(ruleId: string, assignees: Array<{
    userId?: string;
    weight?: number;
  }>) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    await this.prisma.assignmentRuleAssignee.deleteMany({
      where: { ruleId },
    });

    await this.prisma.assignmentRuleAssignee.createMany({
      data: assignees.filter(a => a.userId).map(a => ({
        ruleId,
        userId: a.userId!,
        weight: a.weight ?? 1,
      })),
    });

    return this.findOne(ruleId);
  }

  async evaluateRules(entity: AssignmentRuleEntity, recordData: Record<string, any>): Promise<string | null> {
    const rules = await this.prisma.assignmentRule.findMany({
      where: {
        entity,
        isActive: true,
      },
      include: {
        conditions: { orderBy: { sortOrder: 'asc' } },
        assignees: { where: { isActive: true } },
      },
      orderBy: { priority: 'asc' },
    });

    for (const rule of rules) {
      if (this.matchesConditions(rule.conditions, recordData)) {
        const assigneeId = await this.selectAssignee(rule);

        if (assigneeId) {
          await this.prisma.assignmentRule.update({
            where: { id: rule.id },
            data: {
              executionCount: { increment: 1 },
              lastExecutedAt: new Date(),
            },
          });

          return assigneeId;
        }
      }
    }

    return null;
  }

  private matchesConditions(
    conditions: Array<{ field: string; operator: ConditionOperator; value: string }>,
    data: Record<string, any>
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(data, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCondition(fieldValue: any, operator: ConditionOperator, conditionValue: string): boolean {
    const strFieldValue = String(fieldValue ?? '').toLowerCase();
    const strCondValue = conditionValue.toLowerCase();

    switch (operator) {
      case 'EQUALS':
        return strFieldValue === strCondValue;
      case 'NOT_EQUALS':
        return strFieldValue !== strCondValue;
      case 'CONTAINS':
        return strFieldValue.includes(strCondValue);
      case 'NOT_CONTAINS':
        return !strFieldValue.includes(strCondValue);
      case 'STARTS_WITH':
        return strFieldValue.startsWith(strCondValue);
      case 'ENDS_WITH':
        return strFieldValue.endsWith(strCondValue);
      case 'IS_EMPTY':
        return !fieldValue || strFieldValue === '';
      case 'IS_NOT_EMPTY':
        return fieldValue && strFieldValue !== '';
      case 'GREATER_THAN':
        return Number(fieldValue) > Number(conditionValue);
      case 'GREATER_THAN_OR_EQUAL':
        return Number(fieldValue) >= Number(conditionValue);
      case 'LESS_THAN':
        return Number(fieldValue) < Number(conditionValue);
      case 'LESS_THAN_OR_EQUAL':
        return Number(fieldValue) <= Number(conditionValue);
      case 'IN':
        const inValues = conditionValue.split(',').map(v => v.trim().toLowerCase());
        return inValues.includes(strFieldValue);
      case 'NOT_IN':
        const notInValues = conditionValue.split(',').map(v => v.trim().toLowerCase());
        return !notInValues.includes(strFieldValue);
      default:
        return false;
    }
  }

  private async selectAssignee(rule: {
    id: string;
    method: AssignmentMethod;
    assignees: Array<{ id: string; userId: string; weight: number }>;
    lastAssignedIndex: number;
  }): Promise<string | null> {
    const activeAssignees = rule.assignees;
    if (activeAssignees.length === 0) return null;

    let selectedUserId: string | null = null;
    let newIndex = rule.lastAssignedIndex;

    switch (rule.method) {
      case 'ROUND_ROBIN':
        newIndex = (rule.lastAssignedIndex + 1) % activeAssignees.length;
        selectedUserId = activeAssignees[newIndex].userId;
        break;

      case 'LOAD_BALANCED':
        const counts = await Promise.all(
          activeAssignees.map(async (a) => {
            const count = await this.prisma.lead.count({
              where: { ownerId: a.userId },
            });
            return { userId: a.userId, count };
          })
        );
        const minCount = Math.min(...counts.map(c => c.count));
        const leastLoaded = counts.find(c => c.count === minCount);
        selectedUserId = leastLoaded?.userId || null;
        break;

      case 'FIXED':
      default:
        selectedUserId = activeAssignees[0]?.userId || null;
        break;
    }

    if (rule.method === 'ROUND_ROBIN') {
      await this.prisma.assignmentRule.update({
        where: { id: rule.id },
        data: { lastAssignedIndex: newIndex },
      });
    }

    return selectedUserId;
  }

  async testRule(ruleId: string, testData: Record<string, any>) {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id: ruleId },
      include: {
        conditions: { orderBy: { sortOrder: 'asc' } },
        assignees: true,
      },
    });

    if (!rule) {
      throw new NotFoundException('Assignment rule not found');
    }

    const conditionResults = rule.conditions.map(condition => ({
      field: condition.field,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue: this.getNestedValue(testData, condition.field),
      matches: this.evaluateCondition(
        this.getNestedValue(testData, condition.field),
        condition.operator,
        condition.value
      ),
    }));

    const allMatch = conditionResults.every(r => r.matches);
    let selectedAssignee: typeof rule.assignees[0] | null = null;

    if (allMatch && rule.assignees.length > 0) {
      const selectedUserId = await this.selectAssignee(rule as any);
      selectedAssignee = rule.assignees.find(a => a.userId === selectedUserId) || null;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      conditionResults,
      allConditionsMatch: allMatch,
      wouldAssignTo: selectedAssignee,
    };
  }

  async getStats() {
    const [total, active, byEntity] = await Promise.all([
      this.prisma.assignmentRule.count(),
      this.prisma.assignmentRule.count({ where: { isActive: true } }),
      this.prisma.assignmentRule.groupBy({
        by: ['entity'],
        _count: true,
      }),
    ]);

    const totalExecutions = await this.prisma.assignmentRule.aggregate({
      _sum: { executionCount: true },
    });

    return {
      total,
      active,
      inactive: total - active,
      byEntity: byEntity.reduce((acc, item) => {
        acc[item.entity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      totalExecutions: totalExecutions._sum.executionCount || 0,
    };
  }

  async reorder(entity: AssignmentRuleEntity, ruleIds: string[]) {
    await this.prisma.$transaction(
      ruleIds.map((id, index) =>
        this.prisma.assignmentRule.update({
          where: { id },
          data: { priority: index },
        })
      )
    );

    return this.findAll({ entity });
  }
}
