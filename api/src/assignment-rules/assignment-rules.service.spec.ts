import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AssignmentRulesService } from './assignment-rules.service';
import { PrismaService } from '../database/prisma.service';

describe('AssignmentRulesService', () => {
  let service: AssignmentRulesService;

  const mockPrisma = {
    assignmentRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    assignmentRuleCondition: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    assignmentRuleAssignee: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    lead: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRule = {
    id: 'rule-1',
    name: 'Test Rule',
    description: 'A test rule',
    entity: 'LEAD',
    method: 'ROUND_ROBIN',
    isActive: true,
    priority: 1,
    lastAssignedIndex: 0,
    fallbackOwnerId: null,
    notifyAssignee: true,
    notifyTemplateId: null,
    executionCount: 0,
    lastExecutedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    conditions: [],
    assignees: [],
  };

  const mockCondition = {
    id: 'cond-1',
    ruleId: 'rule-1',
    field: 'company',
    operator: 'EQUALS',
    value: 'Acme',
    sortOrder: 0,
  };

  const mockAssignee = {
    id: 'assignee-1',
    ruleId: 'rule-1',
    userId: 'user-1',
    weight: 1,
    isActive: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentRulesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssignmentRulesService>(AssignmentRulesService);
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    it('should create a rule with default priority when none exists', async () => {
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({ _max: { priority: null } });
      mockPrisma.assignmentRule.create.mockResolvedValue(mockRule);

      const result = await service.create('user-1', {
        name: 'Test Rule',
        entity: 'LEAD' as any,
        method: 'ROUND_ROBIN' as any,
      });

      expect(result).toEqual(mockRule);
      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Rule',
            entity: 'LEAD',
            method: 'ROUND_ROBIN',
            priority: 1,
            createdBy: 'user-1',
          }),
        }),
      );
    });

    it('should increment priority based on existing max', async () => {
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({ _max: { priority: 5 } });
      mockPrisma.assignmentRule.create.mockResolvedValue({ ...mockRule, priority: 6 });

      await service.create('user-1', {
        name: 'New Rule',
        entity: 'LEAD' as any,
      });

      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 6 }),
        }),
      );
    });

    it('should use explicit order when provided', async () => {
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({ _max: { priority: 5 } });
      mockPrisma.assignmentRule.create.mockResolvedValue({ ...mockRule, priority: 3 });

      await service.create('user-1', {
        name: 'New Rule',
        entity: 'LEAD' as any,
        order: 3,
      });

      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 3 }),
        }),
      );
    });

    it('should create rule with conditions and assignees', async () => {
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({ _max: { priority: 0 } });
      mockPrisma.assignmentRule.create.mockResolvedValue({
        ...mockRule,
        conditions: [mockCondition],
        assignees: [mockAssignee],
      });

      const result = await service.create('user-1', {
        name: 'Full Rule',
        entity: 'LEAD' as any,
        conditions: [
          { field: 'company', operator: 'EQUALS' as any, value: 'Acme' },
        ],
        assignees: [
          { userId: 'user-1', weight: 1 },
        ],
      });

      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conditions: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ field: 'company', operator: 'EQUALS', value: 'Acme' }),
              ]),
            }),
            assignees: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ userId: 'user-1', weight: 1 }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should default method to ROUND_ROBIN when not provided', async () => {
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({ _max: { priority: 0 } });
      mockPrisma.assignmentRule.create.mockResolvedValue(mockRule);

      await service.create('user-1', {
        name: 'Test',
        entity: 'LEAD' as any,
      });

      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ method: 'ROUND_ROBIN' }),
        }),
      );
    });

    it('should default isActive to true when not provided', async () => {
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({ _max: { priority: 0 } });
      mockPrisma.assignmentRule.create.mockResolvedValue(mockRule);

      await service.create('user-1', {
        name: 'Test',
        entity: 'LEAD' as any,
      });

      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should filter out assignees without userId', async () => {
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({ _max: { priority: 0 } });
      mockPrisma.assignmentRule.create.mockResolvedValue(mockRule);

      await service.create('user-1', {
        name: 'Test',
        entity: 'LEAD' as any,
        assignees: [
          { userId: 'user-1', weight: 1 },
          { weight: 2 }, // no userId
        ],
      });

      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignees: expect.objectContaining({
              create: [expect.objectContaining({ userId: 'user-1' })],
            }),
          }),
        }),
      );
    });
  });

  // ============================================
  // findAll
  // ============================================

  describe('findAll', () => {
    it('should return all rules ordered by priority', async () => {
      mockPrisma.assignmentRule.findMany.mockResolvedValue([mockRule]);

      const result = await service.findAll();

      expect(result).toEqual([mockRule]);
      expect(mockPrisma.assignmentRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priority: 'asc' },
        }),
      );
    });

    it('should apply entity filter', async () => {
      mockPrisma.assignmentRule.findMany.mockResolvedValue([]);

      await service.findAll({ entity: 'LEAD' as any });

      expect(mockPrisma.assignmentRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity: 'LEAD' }),
        }),
      );
    });

    it('should apply isActive filter', async () => {
      mockPrisma.assignmentRule.findMany.mockResolvedValue([]);

      await service.findAll({ isActive: true });

      expect(mockPrisma.assignmentRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should return empty array when no rules exist', async () => {
      mockPrisma.assignmentRule.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // findOne
  // ============================================

  describe('findOne', () => {
    it('should return a rule by id', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(mockRule);

      const result = await service.findOne('rule-1');

      expect(result).toEqual(mockRule);
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // update
  // ============================================

  describe('update', () => {
    it('should update a rule', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.assignmentRule.update.mockResolvedValue({
        ...mockRule,
        name: 'Updated Rule',
      });

      const result = await service.update('rule-1', { name: 'Updated Rule' });

      expect(result.name).toBe('Updated Rule');
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update method and isActive', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.assignmentRule.update.mockResolvedValue({
        ...mockRule,
        method: 'FIXED',
        isActive: false,
      });

      await service.update('rule-1', { method: 'FIXED' as any, isActive: false });

      expect(mockPrisma.assignmentRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: 'FIXED',
            isActive: false,
          }),
        }),
      );
    });
  });

  // ============================================
  // remove
  // ============================================

  describe('remove', () => {
    it('should delete a rule', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.assignmentRule.delete.mockResolvedValue(mockRule);

      const result = await service.remove('rule-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.assignmentRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // addCondition
  // ============================================

  describe('addCondition', () => {
    it('should add a condition to a rule', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue({
        ...mockRule,
        conditions: [mockCondition],
      });
      mockPrisma.assignmentRuleCondition.create.mockResolvedValue({
        id: 'cond-2',
        ruleId: 'rule-1',
        field: 'status',
        operator: 'EQUALS',
        value: 'NEW',
        sortOrder: 1,
      });

      const result = await service.addCondition('rule-1', {
        field: 'status',
        operator: 'EQUALS' as any,
        value: 'NEW',
      });

      expect(result.field).toBe('status');
      expect(result.sortOrder).toBe(1);
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(
        service.addCondition('missing-id', {
          field: 'status',
          operator: 'EQUALS' as any,
          value: 'NEW',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use explicit order when provided', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue({
        ...mockRule,
        conditions: [],
      });
      mockPrisma.assignmentRuleCondition.create.mockResolvedValue({
        id: 'cond-1',
        ruleId: 'rule-1',
        field: 'status',
        operator: 'EQUALS',
        value: 'NEW',
        sortOrder: 5,
      });

      await service.addCondition('rule-1', {
        field: 'status',
        operator: 'EQUALS' as any,
        value: 'NEW',
        order: 5,
      });

      expect(mockPrisma.assignmentRuleCondition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 5 }),
        }),
      );
    });
  });

  // ============================================
  // removeCondition
  // ============================================

  describe('removeCondition', () => {
    it('should remove a condition', async () => {
      mockPrisma.assignmentRuleCondition.findFirst.mockResolvedValue(mockCondition);
      mockPrisma.assignmentRuleCondition.delete.mockResolvedValue(mockCondition);

      const result = await service.removeCondition('rule-1', 'cond-1');

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when condition not found', async () => {
      mockPrisma.assignmentRuleCondition.findFirst.mockResolvedValue(null);

      await expect(
        service.removeCondition('rule-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // updateConditions
  // ============================================

  describe('updateConditions', () => {
    it('should replace all conditions', async () => {
      mockPrisma.assignmentRule.findUnique
        .mockResolvedValueOnce(mockRule) // for updateConditions check
        .mockResolvedValueOnce(mockRule); // for findOne inside
      mockPrisma.assignmentRuleCondition.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.assignmentRuleCondition.createMany.mockResolvedValue({ count: 2 });

      const conditions = [
        { field: 'status', operator: 'EQUALS' as any, value: 'NEW' },
        { field: 'company', operator: 'CONTAINS' as any, value: 'Corp' },
      ];

      await service.updateConditions('rule-1', conditions);

      expect(mockPrisma.assignmentRuleCondition.deleteMany).toHaveBeenCalledWith({
        where: { ruleId: 'rule-1' },
      });
      expect(mockPrisma.assignmentRuleCondition.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ field: 'status', sortOrder: 0 }),
          expect.objectContaining({ field: 'company', sortOrder: 1 }),
        ]),
      });
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConditions('missing-id', []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // addAssignee
  // ============================================

  describe('addAssignee', () => {
    it('should add an assignee', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.assignmentRuleAssignee.create.mockResolvedValue(mockAssignee);

      const result = await service.addAssignee('rule-1', { userId: 'user-1', weight: 1 });

      expect(result).toEqual(mockAssignee);
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(
        service.addAssignee('missing-id', { userId: 'user-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when userId not provided', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(mockRule);

      await expect(
        service.addAssignee('rule-1', { weight: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default weight to 1', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.assignmentRuleAssignee.create.mockResolvedValue(mockAssignee);

      await service.addAssignee('rule-1', { userId: 'user-1' });

      expect(mockPrisma.assignmentRuleAssignee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ weight: 1 }),
        }),
      );
    });
  });

  // ============================================
  // removeAssignee
  // ============================================

  describe('removeAssignee', () => {
    it('should remove an assignee', async () => {
      mockPrisma.assignmentRuleAssignee.findFirst.mockResolvedValue(mockAssignee);
      mockPrisma.assignmentRuleAssignee.delete.mockResolvedValue(mockAssignee);

      const result = await service.removeAssignee('rule-1', 'assignee-1');

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when assignee not found', async () => {
      mockPrisma.assignmentRuleAssignee.findFirst.mockResolvedValue(null);

      await expect(
        service.removeAssignee('rule-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // updateAssignees
  // ============================================

  describe('updateAssignees', () => {
    it('should replace all assignees', async () => {
      mockPrisma.assignmentRule.findUnique
        .mockResolvedValueOnce(mockRule) // for updateAssignees check
        .mockResolvedValueOnce(mockRule); // for findOne inside
      mockPrisma.assignmentRuleAssignee.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.assignmentRuleAssignee.createMany.mockResolvedValue({ count: 2 });

      await service.updateAssignees('rule-1', [
        { userId: 'user-1', weight: 2 },
        { userId: 'user-2', weight: 3 },
      ]);

      expect(mockPrisma.assignmentRuleAssignee.deleteMany).toHaveBeenCalledWith({
        where: { ruleId: 'rule-1' },
      });
      expect(mockPrisma.assignmentRuleAssignee.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', weight: 2 }),
          expect.objectContaining({ userId: 'user-2', weight: 3 }),
        ]),
      });
    });

    it('should filter out assignees without userId', async () => {
      mockPrisma.assignmentRule.findUnique
        .mockResolvedValueOnce(mockRule)
        .mockResolvedValueOnce(mockRule);
      mockPrisma.assignmentRuleAssignee.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.assignmentRuleAssignee.createMany.mockResolvedValue({ count: 1 });

      await service.updateAssignees('rule-1', [
        { userId: 'user-1', weight: 1 },
        { weight: 2 }, // no userId, should be filtered
      ]);

      expect(mockPrisma.assignmentRuleAssignee.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ userId: 'user-1' })],
      });
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAssignees('missing-id', []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // evaluateRules
  // ============================================

  describe('evaluateRules', () => {
    it('should return assignee userId when conditions match (ROUND_ROBIN)', async () => {
      const ruleWithAssignees = {
        ...mockRule,
        conditions: [{ field: 'company', operator: 'EQUALS', value: 'Acme' }],
        assignees: [
          { id: 'a1', userId: 'user-1', weight: 1, isActive: true },
          { id: 'a2', userId: 'user-2', weight: 1, isActive: true },
        ],
        lastAssignedIndex: 0,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([ruleWithAssignees]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, { company: 'Acme' });

      expect(result).toBe('user-2');
    });

    it('should return null when no rules match', async () => {
      const ruleWithConditions = {
        ...mockRule,
        conditions: [{ field: 'company', operator: 'EQUALS', value: 'Acme' }],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([ruleWithConditions]);

      const result = await service.evaluateRules('LEAD' as any, { company: 'Other' });

      expect(result).toBeNull();
    });

    it('should return null when no active rules exist', async () => {
      mockPrisma.assignmentRule.findMany.mockResolvedValue([]);

      const result = await service.evaluateRules('LEAD' as any, { company: 'Acme' });

      expect(result).toBeNull();
    });

    it('should return null when matching rule has no assignees', async () => {
      const ruleNoAssignees = {
        ...mockRule,
        conditions: [],
        assignees: [],
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([ruleNoAssignees]);

      const result = await service.evaluateRules('LEAD' as any, { company: 'Acme' });

      expect(result).toBeNull();
    });

    it('should match rules with no conditions', async () => {
      const ruleNoConditions = {
        ...mockRule,
        conditions: [],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([ruleNoConditions]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, { company: 'Anything' });

      expect(result).toBe('user-1');
    });

    it('should increment executionCount on successful match', async () => {
      const ruleWithAssignees = {
        ...mockRule,
        conditions: [],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([ruleWithAssignees]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      await service.evaluateRules('LEAD' as any, {});

      expect(mockPrisma.assignmentRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            executionCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should use FIXED method - return first assignee', async () => {
      const fixedRule = {
        ...mockRule,
        method: 'FIXED',
        conditions: [],
        assignees: [
          { id: 'a1', userId: 'user-1', weight: 1, isActive: true },
          { id: 'a2', userId: 'user-2', weight: 1, isActive: true },
        ],
        lastAssignedIndex: 0,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([fixedRule]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, {});

      expect(result).toBe('user-1');
    });

    it('should use LOAD_BALANCED method - pick user with fewest leads', async () => {
      const loadBalancedRule = {
        ...mockRule,
        method: 'LOAD_BALANCED',
        conditions: [],
        assignees: [
          { id: 'a1', userId: 'user-1', weight: 1, isActive: true },
          { id: 'a2', userId: 'user-2', weight: 1, isActive: true },
        ],
        lastAssignedIndex: 0,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([loadBalancedRule]);
      mockPrisma.lead.count
        .mockResolvedValueOnce(10)  // user-1 has 10 leads
        .mockResolvedValueOnce(3);  // user-2 has 3 leads
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, {});

      expect(result).toBe('user-2');
    });

    it('should support CONTAINS operator', async () => {
      const rule = {
        ...mockRule,
        conditions: [{ field: 'company', operator: 'CONTAINS', value: 'Corp' }],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([rule]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, { company: 'Big Corporation' });

      expect(result).toBe('user-1');
    });

    it('should support nested field access', async () => {
      const rule = {
        ...mockRule,
        conditions: [{ field: 'address.city', operator: 'EQUALS', value: 'NYC' }],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([rule]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, {
        address: { city: 'NYC' },
      });

      expect(result).toBe('user-1');
    });

    it('should support IN operator', async () => {
      const rule = {
        ...mockRule,
        conditions: [{ field: 'status', operator: 'IN', value: 'NEW,OPEN,ACTIVE' }],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([rule]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, { status: 'OPEN' });

      expect(result).toBe('user-1');
    });

    it('should support IS_EMPTY operator', async () => {
      const rule = {
        ...mockRule,
        conditions: [{ field: 'phone', operator: 'IS_EMPTY', value: '' }],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([rule]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, { phone: '' });

      expect(result).toBe('user-1');
    });

    it('should support GREATER_THAN operator', async () => {
      const rule = {
        ...mockRule,
        conditions: [{ field: 'score', operator: 'GREATER_THAN', value: '50' }],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findMany.mockResolvedValue([rule]);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.evaluateRules('LEAD' as any, { score: 75 });

      expect(result).toBe('user-1');
    });
  });

  // ============================================
  // testRule
  // ============================================

  describe('testRule', () => {
    it('should test rule and return condition results', async () => {
      const ruleWithDetails = {
        ...mockRule,
        conditions: [
          { field: 'company', operator: 'EQUALS', value: 'Acme' },
          { field: 'status', operator: 'EQUALS', value: 'NEW' },
        ],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
        lastAssignedIndex: -1,
      };
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(ruleWithDetails);
      mockPrisma.assignmentRule.update.mockResolvedValue({});

      const result = await service.testRule('rule-1', { company: 'Acme', status: 'NEW' });

      expect(result.ruleId).toBe('rule-1');
      expect(result.allConditionsMatch).toBe(true);
      expect(result.conditionResults).toHaveLength(2);
      expect(result.conditionResults[0].matches).toBe(true);
      expect(result.wouldAssignTo).toBeDefined();
    });

    it('should return no assignee when conditions do not match', async () => {
      const ruleWithDetails = {
        ...mockRule,
        conditions: [{ field: 'company', operator: 'EQUALS', value: 'Acme' }],
        assignees: [{ id: 'a1', userId: 'user-1', weight: 1, isActive: true }],
      };
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(ruleWithDetails);

      const result = await service.testRule('rule-1', { company: 'Other' });

      expect(result.allConditionsMatch).toBe(false);
      expect(result.wouldAssignTo).toBeNull();
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrisma.assignmentRule.findUnique.mockResolvedValue(null);

      await expect(service.testRule('missing-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getStats
  // ============================================

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      mockPrisma.assignmentRule.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7);
      mockPrisma.assignmentRule.groupBy.mockResolvedValue([
        { entity: 'LEAD', _count: 6 },
        { entity: 'CONTACT', _count: 4 },
      ]);
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({
        _sum: { executionCount: 150 },
      });

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.active).toBe(7);
      expect(result.inactive).toBe(3);
      expect(result.byEntity).toEqual({ LEAD: 6, CONTACT: 4 });
      expect(result.totalExecutions).toBe(150);
    });

    it('should handle zero execution count', async () => {
      mockPrisma.assignmentRule.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.assignmentRule.groupBy.mockResolvedValue([]);
      mockPrisma.assignmentRule.aggregate.mockResolvedValue({
        _sum: { executionCount: null },
      });

      const result = await service.getStats();

      expect(result.total).toBe(0);
      expect(result.totalExecutions).toBe(0);
    });
  });

  // ============================================
  // reorder
  // ============================================

  describe('reorder', () => {
    it('should reorder rules by updating priorities', async () => {
      const ruleIds = ['rule-3', 'rule-1', 'rule-2'];
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.assignmentRule.findMany.mockResolvedValue([]);

      await service.reorder('LEAD' as any, ruleIds);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.anything(), // update calls
        ]),
      );
    });
  });
});
