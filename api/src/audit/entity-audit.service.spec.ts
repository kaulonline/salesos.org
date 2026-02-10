import { Test, TestingModule } from '@nestjs/testing';
import { EntityAuditService } from './entity-audit.service';
import { PrismaService } from '../database/prisma.service';

describe('EntityAuditService', () => {
  let service: EntityAuditService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityAuditService,
        {
          provide: PrismaService,
          useValue: {
            entityFieldChange: {
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EntityAuditService>(EntityAuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('trackChanges', () => {
    const baseParams = {
      organizationId: 'org-1',
      entityType: 'lead',
      entityId: 'lead-1',
      userId: 'user-1',
      trackedFields: ['firstName', 'lastName', 'email', 'phone'],
    };

    it('should record changes when a field value changes', async () => {
      await service.trackChanges({
        ...baseParams,
        before: { firstName: 'John', lastName: 'Doe', email: null, phone: null },
        after: { firstName: 'Jane', lastName: 'Doe', email: null, phone: null },
      });

      expect(prisma.entityFieldChange.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            entityType: 'lead',
            entityId: 'lead-1',
            fieldName: 'firstName',
            oldValue: '"John"',
            newValue: '"Jane"',
          }),
        ],
      });
    });

    it('should record when a field is added (null -> value)', async () => {
      await service.trackChanges({
        ...baseParams,
        before: { firstName: 'John', lastName: 'Doe', email: null, phone: null },
        after: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: null },
      });

      expect(prisma.entityFieldChange.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            fieldName: 'email',
            oldValue: null,
            newValue: '"john@test.com"',
          }),
        ],
      });
    });

    it('should record when a field is removed (value -> null)', async () => {
      await service.trackChanges({
        ...baseParams,
        before: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: null },
        after: { firstName: 'John', lastName: 'Doe', email: null, phone: null },
      });

      expect(prisma.entityFieldChange.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            fieldName: 'email',
            oldValue: '"john@test.com"',
            newValue: null,
          }),
        ],
      });
    });

    it('should not record anything when no fields change', async () => {
      await service.trackChanges({
        ...baseParams,
        before: { firstName: 'John', lastName: 'Doe', email: null, phone: null },
        after: { firstName: 'John', lastName: 'Doe', email: null, phone: null },
      });

      expect(prisma.entityFieldChange.createMany).not.toHaveBeenCalled();
    });

    it('should not record anything when both values are null/undefined', async () => {
      await service.trackChanges({
        ...baseParams,
        before: { firstName: 'John', lastName: undefined, email: null, phone: null },
        after: { firstName: 'John', lastName: undefined, email: null, phone: null },
      });

      expect(prisma.entityFieldChange.createMany).not.toHaveBeenCalled();
    });

    it('should track multiple field changes at once', async () => {
      await service.trackChanges({
        ...baseParams,
        before: { firstName: 'John', lastName: 'Doe', email: 'old@test.com', phone: null },
        after: { firstName: 'Jane', lastName: 'Smith', email: 'new@test.com', phone: '555-0100' },
      });

      expect(prisma.entityFieldChange.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ fieldName: 'firstName' }),
          expect.objectContaining({ fieldName: 'lastName' }),
          expect.objectContaining({ fieldName: 'email' }),
          expect.objectContaining({ fieldName: 'phone' }),
        ]),
      });
    });

    it('should swallow errors (fire-and-forget)', async () => {
      (prisma.entityFieldChange.createMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(
        service.trackChanges({
          ...baseParams,
          before: { firstName: 'John', lastName: 'Doe', email: null, phone: null },
          after: { firstName: 'Jane', lastName: 'Doe', email: null, phone: null },
        }),
      ).resolves.toBeUndefined();
    });

    it('should include organizationId and userId in change records', async () => {
      await service.trackChanges({
        ...baseParams,
        before: { firstName: 'A', lastName: null, email: null, phone: null },
        after: { firstName: 'B', lastName: null, email: null, phone: null },
      });

      expect(prisma.entityFieldChange.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            organizationId: 'org-1',
            userId: 'user-1',
          }),
        ],
      });
    });
  });
});
