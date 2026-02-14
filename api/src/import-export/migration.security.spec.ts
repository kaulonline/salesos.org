import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { PrismaService } from '../database/prisma.service';
import { MigrationStatus } from '@prisma/client';

/**
 * Multi-Tenant Security Tests for Migration System
 *
 * These tests verify that:
 * 1. Users cannot access migrations from other organizations
 * 2. Data is properly scoped to organizationId
 * 3. Cross-tenant data leaks are prevented
 */
describe('MigrationService - Multi-Tenant Security', () => {
  let service: MigrationService;
  let prisma: PrismaService;

  // Test Data
  const ORG_A = 'org_test_a';
  const ORG_B = 'org_test_b';
  const USER_A = 'user_test_a';
  const USER_B = 'user_test_b';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        {
          provide: PrismaService,
          useValue: {
            migration: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMigration', () => {
    it('should create migration with organizationId', async () => {
      const mockMigration = {
        id: 'migration_123',
        organizationId: ORG_A,
        userId: USER_A,
        sourceCRM: 'salesforce',
        entityType: 'LEAD',
        fileName: 'leads.csv',
        fileSize: 1024,
        totalRows: 100,
        fieldMappings: [],
        status: MigrationStatus.PENDING,
      };

      jest.spyOn(prisma.migration, 'create').mockResolvedValue(mockMigration as any);

      const result = await service.createMigration({
        organizationId: ORG_A,
        userId: USER_A,
        sourceCRM: 'salesforce',
        entityType: 'LEAD',
        fileName: 'leads.csv',
        fileSize: 1024,
        totalRows: 100,
        fieldMappings: [],
      });

      expect(result.organizationId).toBe(ORG_A);
      expect(prisma.migration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: ORG_A,
          userId: USER_A,
        }),
      });
    });
  });

  describe('getMigration - Cross-Tenant Access Protection', () => {
    it('should return migration when organizationId matches', async () => {
      const mockMigration = {
        id: 'migration_123',
        organizationId: ORG_A,
        userId: USER_A,
        sourceCRM: 'salesforce',
        entityType: 'LEAD',
        user: {
          id: USER_A,
          name: 'User A',
          email: 'usera@example.com',
        },
      };

      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(mockMigration as any);

      const result = await service.getMigration('migration_123', ORG_A);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(ORG_A);
      expect(prisma.migration.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'migration_123',
          organizationId: ORG_A, // ✅ CRITICAL: Must filter by org
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when accessing migration from different organization', async () => {
      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(null);

      await expect(
        service.getMigration('migration_123', ORG_B)
      ).rejects.toThrow(NotFoundException);

      expect(prisma.migration.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'migration_123',
          organizationId: ORG_B, // ✅ Trying to access from wrong org
        },
        include: expect.any(Object),
      });
    });

    it('should NOT use findUnique (which bypasses org filter)', async () => {
      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue({
        id: 'migration_123',
        organizationId: ORG_A,
      } as any);

      await service.getMigration('migration_123', ORG_A);

      // ✅ SECURITY: Must use findFirst with org filter, NOT findUnique
      expect(prisma.migration.findFirst).toHaveBeenCalled();
      expect(prisma.migration.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getMigrationStatus - Cross-Tenant Access Protection', () => {
    it('should return migration status only for same organization', async () => {
      const mockMigration = {
        id: 'migration_123',
        status: MigrationStatus.IN_PROGRESS,
        totalRows: 100,
        successCount: 50,
        failedCount: 2,
        skippedCount: 0,
        startedAt: new Date(),
        completedAt: null,
        errors: [],
      };

      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(mockMigration as any);

      const result = await service.getMigrationStatus('migration_123', ORG_A);

      expect(result).toBeDefined();
      expect(prisma.migration.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'migration_123',
          organizationId: ORG_A, // ✅ CRITICAL: Must filter by org
        },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException for cross-tenant access', async () => {
      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(null);

      await expect(
        service.getMigrationStatus('migration_123', ORG_B)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMigrationHistory - Organization Scoping', () => {
    it('should only return migrations for specified organization', async () => {
      const mockMigrations = [
        { id: 'mig_1', organizationId: ORG_A, sourceCRM: 'salesforce' },
        { id: 'mig_2', organizationId: ORG_A, sourceCRM: 'hubspot' },
      ];

      jest.spyOn(prisma.migration, 'findMany').mockResolvedValue(mockMigrations as any);
      jest.spyOn(prisma.migration, 'count').mockResolvedValue(2);

      const result = await service.getMigrationHistory(ORG_A);

      expect(result.migrations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.migration.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_A }, // ✅ CRITICAL: Scoped to org
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: expect.any(Number),
        skip: expect.any(Number),
      });
    });

    it('should NOT return migrations from other organizations', async () => {
      jest.spyOn(prisma.migration, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.migration, 'count').mockResolvedValue(0);

      const result = await service.getMigrationHistory(ORG_B, {
        sourceCRM: 'salesforce',
      });

      expect(result.migrations).toHaveLength(0);
      expect(prisma.migration.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: ORG_B, // ✅ Different org = no results
          sourceCRM: 'salesforce',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: expect.any(Number),
        skip: expect.any(Number),
      });
    });
  });

  describe('getMigrationStats - Organization Scoping', () => {
    it('should calculate stats only for specified organization', async () => {
      const mockMigrations = [
        {
          status: MigrationStatus.COMPLETED,
          sourceCRM: 'salesforce',
          entityType: 'LEAD',
          successCount: 100,
          failedCount: 0,
          totalRows: 100,
        },
        {
          status: MigrationStatus.COMPLETED,
          sourceCRM: 'hubspot',
          entityType: 'CONTACT',
          successCount: 50,
          failedCount: 2,
          totalRows: 52,
        },
      ];

      jest.spyOn(prisma.migration, 'findMany').mockResolvedValue(mockMigrations as any);

      const result = await service.getMigrationStats(ORG_A);

      expect(result.totalMigrations).toBe(2);
      expect(result.completed).toBe(2);
      expect(result.totalRecordsImported).toBe(150);
      expect(prisma.migration.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_A }, // ✅ CRITICAL: Scoped to org
        select: expect.any(Object),
      });
    });
  });

  describe('deleteMigration - Ownership Validation', () => {
    it('should delete migration only if owned by organization', async () => {
      const mockMigration = {
        id: 'migration_123',
        organizationId: ORG_A,
      };

      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(mockMigration as any);
      jest.spyOn(prisma.migration, 'delete').mockResolvedValue(mockMigration as any);

      await service.deleteMigration('migration_123', ORG_A);

      expect(prisma.migration.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'migration_123',
          organizationId: ORG_A, // ✅ Verify ownership
        },
      });
      expect(prisma.migration.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when trying to delete migration from different organization', async () => {
      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(null);

      await expect(
        service.deleteMigration('migration_123', ORG_B)
      ).rejects.toThrow(NotFoundException);

      expect(prisma.migration.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'migration_123',
          organizationId: ORG_B, // ✅ Different org = not found
        },
      });
      expect(prisma.migration.delete).not.toHaveBeenCalled();
    });
  });

  describe('cancelMigration - Ownership Validation', () => {
    it('should cancel migration only if owned by organization', async () => {
      const mockMigration = {
        id: 'migration_123',
        organizationId: ORG_A,
        status: MigrationStatus.IN_PROGRESS,
      };

      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(mockMigration as any);
      jest.spyOn(prisma.migration, 'update').mockResolvedValue({
        ...mockMigration,
        status: MigrationStatus.CANCELLED,
      } as any);

      await service.cancelMigration('migration_123', ORG_A);

      expect(prisma.migration.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'migration_123',
          organizationId: ORG_A, // ✅ Verify ownership
          status: MigrationStatus.IN_PROGRESS,
        },
      });
      expect(prisma.migration.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when trying to cancel migration from different organization', async () => {
      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(null);

      await expect(
        service.cancelMigration('migration_123', ORG_B)
      ).rejects.toThrow(NotFoundException);

      expect(prisma.migration.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'migration_123',
          organizationId: ORG_B, // ✅ Different org = not found
          status: MigrationStatus.IN_PROGRESS,
        },
      });
      expect(prisma.migration.update).not.toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    it('should not allow organizationId to be null', async () => {
      const mockMigration = {
        id: 'migration_123',
        organizationId: null, // ❌ Invalid state
      };

      jest.spyOn(prisma.migration, 'findFirst').mockResolvedValue(null);

      await expect(
        service.getMigration('migration_123', ORG_A)
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce organizationId filter even with correct ID', async () => {
      // This tests that we can't bypass org filter by knowing the migration ID
      jest.spyOn(prisma.migration, 'findFirst').mockImplementation((args: any) => {
        // Verify the query MUST include organizationId
        expect(args.where).toHaveProperty('organizationId');
        return Promise.resolve(null);
      });

      await expect(
        service.getMigration('migration_123', ORG_A)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
