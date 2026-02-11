import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  // Use CUID-format IDs (start with 'c', lowercase alphanumeric, 21-29 chars)
  const userId1 = 'cluser00000000000000001';
  const userId2 = 'cluser00000000000000002';
  const userId3 = 'cluser00000000000000003';
  const taskId1 = 'cltask00000000000000001';
  const taskIdMissing = 'cltask00000000000000099';
  const orgId1 = 'clorg000000000000000001';

  const mockTask = {
    id: taskId1,
    subject: 'Follow up with client',
    description: 'Send proposal document',
    status: 'NOT_STARTED',
    priority: 'NORMAL',
    dueDate: new Date('2026-03-01'),
    reminderDate: null,
    completedDate: null,
    ownerId: userId1,
    assignedToId: userId1,
    leadId: null,
    accountId: null,
    contactId: null,
    opportunityId: null,
    organizationId: orgId1,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: { id: userId1, name: 'Test User', email: 'test@example.com' },
    assignedTo: { id: userId1, name: 'Test User', email: 'test@example.com' },
  };

  const mockPrisma = {
    task: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockNotificationScheduler = {
    sendSystemNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationSchedulerService, useValue: mockNotificationScheduler },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createTask', () => {
    it('should create a task with default status and priority', async () => {
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const result = await service.createTask(
        { subject: 'Follow up with client', description: 'Send proposal document' },
        userId1,
        orgId1,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(taskId1);
      expect(result.subject).toBe('Follow up with client');
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: 'Follow up with client',
            status: 'NOT_STARTED',
            priority: 'NORMAL',
            ownerId: userId1,
            assignedToId: userId1,
            organizationId: orgId1,
          }),
        }),
      );
    });

    it('should use provided status and priority when supplied', async () => {
      mockPrisma.task.create.mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      });

      await service.createTask(
        { subject: 'Urgent task', status: 'IN_PROGRESS' as any, priority: 'HIGH' as any },
        userId1,
        orgId1,
      );

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            priority: 'HIGH',
          }),
        }),
      );
    });

    it('should send notification when assigned to someone other than the owner', async () => {
      const taskWithDifferentAssignee = {
        ...mockTask,
        assignedToId: userId2,
        assignedTo: { id: userId2, name: 'Other User', email: 'other@example.com' },
      };
      mockPrisma.task.create.mockResolvedValue(taskWithDifferentAssignee);

      await service.createTask(
        { subject: 'Delegated task', assignedToId: userId2 },
        userId1,
        orgId1,
      );

      expect(mockNotificationScheduler.sendSystemNotification).toHaveBeenCalledWith(
        userId2,
        expect.stringContaining('Task Assigned'),
        expect.stringContaining('Delegated task'),
        expect.objectContaining({
          type: 'TASK_REMINDER',
        }),
      );
    });

    it('should not send notification when assigned to the owner', async () => {
      mockPrisma.task.create.mockResolvedValue(mockTask);

      await service.createTask(
        { subject: 'Self-assigned task' },
        userId1,
        orgId1,
      );

      expect(mockNotificationScheduler.sendSystemNotification).not.toHaveBeenCalled();
    });

    it('should use ownerId as assignedToId when assignedToId is not provided', async () => {
      mockPrisma.task.create.mockResolvedValue(mockTask);

      await service.createTask(
        { subject: 'My task' },
        userId1,
        orgId1,
      );

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: userId1,
          }),
        }),
      );
    });
  });

  describe('getTask', () => {
    it('should return a task by ID for the owner', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.getTask(taskId1, userId1, orgId1);

      expect(result).toBeDefined();
      expect(result.id).toBe(taskId1);
      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: taskId1,
            ownerId: userId1,
            organizationId: orgId1,
          }),
        }),
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.getTask(taskIdMissing, userId1, orgId1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip ownerId filter when isAdmin is true', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      await service.getTask(taskId1, userId1, orgId1, true);

      const callArgs = mockPrisma.task.findFirst.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('ownerId');
      expect(callArgs.where.id).toBe(taskId1);
      expect(callArgs.where.organizationId).toBe(orgId1);
    });
  });

  describe('listTasks', () => {
    it('should return all tasks for an organization', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.listTasks(orgId1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(taskId1);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId1,
          }),
          orderBy: [
            { status: 'asc' },
            { priority: 'desc' },
            { dueDate: 'asc' },
          ],
        }),
      );
    });

    it('should apply status filter', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.listTasks(orgId1, { status: 'COMPLETED' as any });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      );
    });

    it('should apply priority filter', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.listTasks(orgId1, { priority: 'HIGH' as any });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'HIGH',
          }),
        }),
      );
    });

    it('should apply overdue filter', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.listTasks(orgId1, { overdue: true });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: expect.any(Date) },
            status: { not: 'COMPLETED' },
          }),
        }),
      );
    });

    it('should apply assignedToId filter', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.listTasks(orgId1, { assignedToId: userId2 });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: userId2,
          }),
        }),
      );
    });

    it('should return empty array when no tasks match', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await service.listTasks(orgId1, { status: 'DEFERRED' as any });

      expect(result).toEqual([]);
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const existingTask = { ...mockTask, completedDate: null };
      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      const updatedTask = { ...mockTask, subject: 'Updated subject' };
      mockPrisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.updateTask(
        taskId1,
        userId1,
        { subject: 'Updated subject' },
        orgId1,
      );

      expect(result.subject).toBe('Updated subject');
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: taskId1 },
          data: expect.objectContaining({
            subject: 'Updated subject',
          }),
        }),
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTask(taskIdMissing, userId1, { subject: 'Updated' }, orgId1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set completedDate when status changes to COMPLETED', async () => {
      const existingTask = { ...mockTask, completedDate: null };
      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'COMPLETED', completedDate: new Date() });

      await service.updateTask(
        taskId1,
        userId1,
        { status: 'COMPLETED' as any },
        orgId1,
      );

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should not overwrite completedDate if already set', async () => {
      const existingCompletedDate = new Date('2026-01-15');
      const existingTask = { ...mockTask, completedDate: existingCompletedDate };
      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'COMPLETED' });

      await service.updateTask(
        taskId1,
        userId1,
        { status: 'COMPLETED' as any },
        orgId1,
      );

      const updateCall = mockPrisma.task.update.mock.calls[0][0];
      expect(updateCall.data.completedDate).toBeUndefined();
    });

    it('should skip ownerId filter when isAdmin is true', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue(mockTask);

      await service.updateTask(taskId1, userId1, { subject: 'Admin update' }, orgId1, true);

      const findCall = mockPrisma.task.findFirst.mock.calls[0][0];
      expect(findCall.where).not.toHaveProperty('ownerId');
    });

    it('should send notification when task is reassigned to a different user', async () => {
      const existingTask = { ...mockTask, assignedToId: userId1, ownerId: userId1 };
      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, assignedToId: userId3 });

      await service.updateTask(
        taskId1,
        userId1,
        { assignedToId: userId3 },
        orgId1,
      );

      expect(mockNotificationScheduler.sendSystemNotification).toHaveBeenCalledWith(
        userId3,
        expect.stringContaining('Task Reassigned'),
        expect.stringContaining('Follow up with client'),
        expect.objectContaining({
          type: 'TASK_REMINDER',
        }),
      );
    });

    it('should not send notification when reassigned to the owner', async () => {
      const existingTask = { ...mockTask, assignedToId: userId2, ownerId: userId1 };
      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, assignedToId: userId1 });

      await service.updateTask(
        taskId1,
        userId1,
        { assignedToId: userId1 },
        orgId1,
      );

      expect(mockNotificationScheduler.sendSystemNotification).not.toHaveBeenCalled();
    });
  });

  describe('completeTask', () => {
    it('should complete a task by setting status to COMPLETED', async () => {
      const existingTask = { ...mockTask, completedDate: null };
      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue({
        ...mockTask,
        status: 'COMPLETED',
        completedDate: new Date(),
      });

      const result = await service.completeTask(taskId1, userId1, orgId1);

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.completeTask(taskIdMissing, userId1, orgId1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.delete.mockResolvedValue(mockTask);

      await service.deleteTask(taskId1, userId1, orgId1);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: taskId1,
            ownerId: userId1,
            organizationId: orgId1,
          }),
        }),
      );
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: taskId1 } });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTask(taskIdMissing, userId1, orgId1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip ownerId filter when isAdmin is true', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.delete.mockResolvedValue(mockTask);

      await service.deleteTask(taskId1, userId1, orgId1, true);

      const findCall = mockPrisma.task.findFirst.mock.calls[0][0];
      expect(findCall.where).not.toHaveProperty('ownerId');
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics for an organization', async () => {
      mockPrisma.task.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // overdue
        .mockResolvedValueOnce(3); // dueToday
      mockPrisma.task.groupBy
        .mockResolvedValueOnce([ // byStatus
          { status: 'NOT_STARTED', _count: 4 },
          { status: 'IN_PROGRESS', _count: 3 },
          { status: 'COMPLETED', _count: 3 },
        ])
        .mockResolvedValueOnce([ // byPriority
          { priority: 'NORMAL', _count: 6 },
          { priority: 'HIGH', _count: 4 },
        ]);

      const result = await service.getTaskStats(orgId1);

      expect(result).toBeDefined();
      expect(result.total).toBe(10);
      expect(result.overdue).toBe(2);
      expect(result.dueToday).toBe(3);
      expect(result.byStatus).toHaveLength(3);
      expect(result.byPriority).toHaveLength(2);
    });

    it('should filter by userId when not admin', async () => {
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);

      await service.getTaskStats(orgId1, userId1, false);

      // The first count call (total) should have the OR filter for ownerId/assignedToId
      const firstCountCall = mockPrisma.task.count.mock.calls[0][0];
      expect(firstCountCall.where.OR).toEqual([
        { ownerId: userId1 },
        { assignedToId: userId1 },
      ]);
    });

    it('should not filter by userId when isAdmin is true', async () => {
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);

      await service.getTaskStats(orgId1, userId1, true);

      const firstCountCall = mockPrisma.task.count.mock.calls[0][0];
      expect(firstCountCall.where).not.toHaveProperty('OR');
    });
  });
});
