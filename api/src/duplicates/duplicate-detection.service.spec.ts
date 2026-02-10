import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { PrismaService } from '../database/prisma.service';
import { EntityAuditService } from '../audit/entity-audit.service';

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  let prisma: PrismaService;
  let auditService: EntityAuditService;

  const mockPrisma = {
    lead: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    contact: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    duplicateSet: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      updateMany: jest.fn(),
    },
    note: {
      updateMany: jest.fn(),
    },
    mergeHistory: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateDetectionService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: EntityAuditService,
          useValue: { trackChanges: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<DuplicateDetectionService>(DuplicateDetectionService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<EntityAuditService>(EntityAuditService);
  });

  describe('scanForDuplicates - leads', () => {
    const baseLead = {
      id: 'lead-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@acme.com',
      phone: '+1-555-0100',
      company: 'Acme Corp',
    };

    beforeEach(() => {
      mockPrisma.duplicateSet.findMany.mockResolvedValue([]);
      mockPrisma.duplicateSet.create.mockResolvedValue({ id: 'dup-1' });
    });

    it('should detect duplicates by exact email match (confidence >= 0.95)', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(baseLead);
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-2', firstName: 'Jonathan', lastName: 'Smith', email: 'john@acme.com', phone: null, company: 'Other Inc' },
      ]);

      await service.scanForDuplicates('org-1', 'lead', 'lead-1');

      expect(mockPrisma.duplicateSet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confidence: 0.95,
            matchReason: expect.stringContaining('email match'),
          }),
        }),
      );
    });

    it('should detect duplicates by same company + similar name (confidence >= 0.7)', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(baseLead);
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-2', firstName: 'John', lastName: 'Doe', email: 'jdoe@other.com', phone: null, company: 'Acme Corp' },
      ]);

      await service.scanForDuplicates('org-1', 'lead', 'lead-1');

      expect(mockPrisma.duplicateSet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confidence: 0.7,
            matchReason: expect.stringContaining('same company'),
          }),
        }),
      );
    });

    it('should detect duplicates by exact phone match (confidence >= 0.6)', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(baseLead);
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-2', firstName: 'Someone', lastName: 'Else', email: 'other@test.com', phone: '15550100', company: 'Other' },
      ]);

      await service.scanForDuplicates('org-1', 'lead', 'lead-1');

      expect(mockPrisma.duplicateSet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confidence: 0.6,
            matchReason: expect.stringContaining('phone match'),
          }),
        }),
      );
    });

    it('should not create a duplicate set when no matches found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(baseLead);
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-2', firstName: 'Alice', lastName: 'Wonder', email: 'alice@other.com', phone: '999-0000', company: 'Different Inc' },
      ]);

      await service.scanForDuplicates('org-1', 'lead', 'lead-1');

      expect(mockPrisma.duplicateSet.create).not.toHaveBeenCalled();
    });

    it('should not throw when lead is not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.scanForDuplicates('org-1', 'lead', 'lead-missing')).resolves.toBeUndefined();
    });

    it('should skip if duplicate set already exists for both entities', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(baseLead);
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-2', firstName: 'J', lastName: 'D', email: 'john@acme.com', phone: null, company: null },
      ]);
      mockPrisma.duplicateSet.findMany.mockResolvedValue([
        { id: 'dup-existing', members: [{ entityId: 'lead-1' }, { entityId: 'lead-2' }] },
      ]);

      await service.scanForDuplicates('org-1', 'lead', 'lead-1');

      expect(mockPrisma.duplicateSet.create).not.toHaveBeenCalled();
    });
  });

  describe('scanForDuplicates - contacts', () => {
    it('should detect contact duplicates by email match', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'contact-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@acme.com', phone: null,
      });
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'contact-2', firstName: 'Janet', lastName: 'Smith', email: 'jane@acme.com', phone: null },
      ]);
      mockPrisma.duplicateSet.findMany.mockResolvedValue([]);
      mockPrisma.duplicateSet.create.mockResolvedValue({ id: 'dup-1' });

      await service.scanForDuplicates('org-1', 'contact', 'contact-1');

      expect(mockPrisma.duplicateSet.create).toHaveBeenCalled();
    });
  });

  describe('getDuplicateSets', () => {
    it('should return duplicate sets for an organization', async () => {
      const mockSets = [{ id: 'dup-1', entityType: 'lead', members: [] }];
      mockPrisma.duplicateSet.findMany.mockResolvedValue(mockSets);

      const result = await service.getDuplicateSets('org-1');

      expect(result).toEqual(mockSets);
      expect(mockPrisma.duplicateSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
        }),
      );
    });

    it('should filter by entityType and status when provided', async () => {
      mockPrisma.duplicateSet.findMany.mockResolvedValue([]);

      await service.getDuplicateSets('org-1', 'lead', 'OPEN' as any);

      expect(mockPrisma.duplicateSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1', entityType: 'lead', status: 'OPEN' },
        }),
      );
    });
  });

  describe('getDuplicateSet', () => {
    it('should return a specific duplicate set', async () => {
      const mockSet = { id: 'dup-1', members: [] };
      mockPrisma.duplicateSet.findUnique.mockResolvedValue(mockSet);

      const result = await service.getDuplicateSet('dup-1');
      expect(result).toEqual(mockSet);
    });

    it('should throw NotFoundException when set not found', async () => {
      mockPrisma.duplicateSet.findUnique.mockResolvedValue(null);

      await expect(service.getDuplicateSet('dup-missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('dismissDuplicateSet', () => {
    it('should mark a duplicate set as dismissed', async () => {
      mockPrisma.duplicateSet.findUnique.mockResolvedValue({ id: 'dup-1' });
      mockPrisma.duplicateSet.update.mockResolvedValue({ id: 'dup-1', status: 'DISMISSED' });

      const result = await service.dismissDuplicateSet('dup-1', 'user-1');

      expect(mockPrisma.duplicateSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dup-1' },
          data: expect.objectContaining({
            status: 'DISMISSED',
            resolvedBy: 'user-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when set not found', async () => {
      mockPrisma.duplicateSet.findUnique.mockResolvedValue(null);

      await expect(service.dismissDuplicateSet('dup-missing', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('mergeEntities', () => {
    it('should merge leads into a survivor', async () => {
      const survivor = { id: 'lead-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' };
      mockPrisma.lead.findUnique.mockResolvedValue(survivor);
      mockPrisma.lead.update.mockResolvedValue({ ...survivor, email: 'better@test.com' });
      mockPrisma.activity.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.note.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.lead.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.mergeHistory.create.mockResolvedValue({ id: 'merge-1' });
      mockPrisma.duplicateSet.update.mockResolvedValue({ id: 'dup-1', status: 'MERGED' });

      const result = await service.mergeEntities({
        duplicateSetId: 'dup-1',
        survivorId: 'lead-1',
        mergedIds: ['lead-2'],
        fieldResolutions: {
          email: { sourceId: 'lead-2', value: 'better@test.com' },
        },
        userId: 'user-1',
        organizationId: 'org-1',
        entityType: 'lead',
      });

      expect(result.survivorId).toBe('lead-1');
      expect(result.mergedIds).toEqual(['lead-2']);
      expect(mockPrisma.lead.update).toHaveBeenCalled();
      expect(mockPrisma.lead.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['lead-2'] } },
      });
      expect(mockPrisma.mergeHistory.create).toHaveBeenCalled();
      expect(auditService.trackChanges).toHaveBeenCalled();
    });

    it('should throw NotFoundException when survivor not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.mergeEntities({
          duplicateSetId: 'dup-1',
          survivorId: 'lead-missing',
          mergedIds: ['lead-2'],
          userId: 'user-1',
          organizationId: 'org-1',
          entityType: 'lead',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for unsupported entity types', async () => {
      await expect(
        service.mergeEntities({
          duplicateSetId: 'dup-1',
          survivorId: 'acc-1',
          mergedIds: ['acc-2'],
          userId: 'user-1',
          organizationId: 'org-1',
          entityType: 'account',
        }),
      ).rejects.toThrow('Merge not yet supported for entity type: account');
    });
  });
});
