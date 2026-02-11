import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { PrismaService } from '../database/prisma.service';

// Mock the foreign-key validator module
jest.mock('../common/validators/foreign-key.validator', () => ({
  validateCrmForeignKeys: jest.fn(),
}));

import { validateCrmForeignKeys } from '../common/validators/foreign-key.validator';

describe('NotesService', () => {
  let service: NotesService;

  const mockPrisma = {
    note: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    contact: {
      findUnique: jest.fn(),
    },
    opportunity: {
      findUnique: jest.fn(),
    },
  };

  const orgId = 'org-1';
  const userId = 'user-1';

  const mockNote = {
    id: 'note-1',
    title: 'Test Note',
    body: 'Test body',
    isPrivate: false,
    userId,
    organizationId: orgId,
    leadId: null,
    accountId: null,
    contactId: null,
    opportunityId: null,
    sfLeadId: null,
    sfAccountId: null,
    sfContactId: null,
    sfOpportunityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: userId, name: 'Test User', email: 'test@test.com' },
    lead: null,
    account: null,
    contact: null,
    opportunity: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  // ============================================
  // createNote
  // ============================================
  describe('createNote', () => {
    it('should create a note with title and body', async () => {
      mockPrisma.note.create.mockResolvedValue(mockNote);

      const result = await service.createNote({ body: 'Test body', title: 'Test Note' }, userId, orgId);

      expect(result.id).toBe('note-1');
      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: 'Test body',
            title: 'Test Note',
            userId,
            organizationId: orgId,
          }),
        }),
      );
    });

    it('should create a note without a title', async () => {
      mockPrisma.note.create.mockResolvedValue({ ...mockNote, title: null });

      const result = await service.createNote({ body: 'Body only' }, userId, orgId);

      expect(result).toBeDefined();
      expect(mockPrisma.note.create).toHaveBeenCalled();
    });

    it('should call validateCrmForeignKeys with local IDs', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.note.create.mockResolvedValue(mockNote);

      await service.createNote({ body: 'Test', leadId: 'lead-1' }, userId, orgId);

      expect(validateCrmForeignKeys).toHaveBeenCalledWith({
        leadId: 'lead-1',
        accountId: undefined,
        contactId: undefined,
        opportunityId: undefined,
      });
    });

    it('should validate lead exists when leadId provided', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.note.create.mockResolvedValue({ ...mockNote, leadId: 'lead-1' });

      await service.createNote({ body: 'Test', leadId: 'lead-1' }, userId, orgId);

      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.createNote({ body: 'Test', leadId: 'lead-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate account exists when accountId provided', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc-1' });
      mockPrisma.note.create.mockResolvedValue({ ...mockNote, accountId: 'acc-1' });

      await service.createNote({ body: 'Test', accountId: 'acc-1' }, userId, orgId);

      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.createNote({ body: 'Test', accountId: 'acc-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate contact exists when contactId provided', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({ id: 'contact-1' });
      mockPrisma.note.create.mockResolvedValue({ ...mockNote, contactId: 'contact-1' });

      await service.createNote({ body: 'Test', contactId: 'contact-1' }, userId, orgId);

      expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 'contact-1' } });
    });

    it('should throw NotFoundException when contact not found', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        service.createNote({ body: 'Test', contactId: 'contact-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate opportunity exists when opportunityId provided', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.note.create.mockResolvedValue({ ...mockNote, opportunityId: 'opp-1' });

      await service.createNote({ body: 'Test', opportunityId: 'opp-1' }, userId, orgId);

      expect(mockPrisma.opportunity.findUnique).toHaveBeenCalledWith({ where: { id: 'opp-1' } });
    });

    it('should throw NotFoundException when opportunity not found', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(null);

      await expect(
        service.createNote({ body: 'Test', opportunityId: 'opp-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass through Salesforce IDs without validation', async () => {
      mockPrisma.note.create.mockResolvedValue({
        ...mockNote,
        sfLeadId: '00Qxx0000001',
        sfAccountId: '001xx0000001',
      });

      await service.createNote(
        { body: 'Test', sfLeadId: '00Qxx0000001', sfAccountId: '001xx0000001' },
        userId,
        orgId,
      );

      expect(mockPrisma.lead.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.account.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sfLeadId: '00Qxx0000001',
            sfAccountId: '001xx0000001',
          }),
        }),
      );
    });

    it('should create a private note', async () => {
      mockPrisma.note.create.mockResolvedValue({ ...mockNote, isPrivate: true });

      await service.createNote({ body: 'Secret', isPrivate: true }, userId, orgId);

      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPrivate: true }),
        }),
      );
    });

    it('should include user, lead, account, contact, and opportunity in response', async () => {
      mockPrisma.note.create.mockResolvedValue(mockNote);

      await service.createNote({ body: 'Test' }, userId, orgId);

      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            user: expect.any(Object),
            lead: expect.any(Object),
            account: expect.any(Object),
            contact: expect.any(Object),
            opportunity: expect.any(Object),
          }),
        }),
      );
    });
  });

  // ============================================
  // getNote
  // ============================================
  describe('getNote', () => {
    it('should return a note by ID for owner', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);

      const result = await service.getNote('note-1', userId, orgId);

      expect(result.id).toBe('note-1');
      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1', userId, organizationId: orgId },
        }),
      );
    });

    it('should return a note by ID for admin without userId filter', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);

      const result = await service.getNote('note-1', userId, orgId, true);

      expect(result.id).toBe('note-1');
      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1', organizationId: orgId },
        }),
      );
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.getNote('nonexistent', userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when non-admin tries to access another users note', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.getNote('note-1', 'other-user', orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // listNotes
  // ============================================
  describe('listNotes', () => {
    it('should list all notes for organization', async () => {
      mockPrisma.note.findMany.mockResolvedValue([mockNote]);

      const result = await service.listNotes(undefined, orgId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by userId for non-admin', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ userId }, orgId, false);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId }),
        }),
      );
    });

    it('should not filter by userId for admin even when userId provided', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ userId }, orgId, true);

      const callArgs = mockPrisma.note.findMany.mock.calls[0][0];
      expect(callArgs.where.userId).toBeUndefined();
    });

    it('should filter by leadId', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ leadId: 'lead-1' }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ leadId: 'lead-1' }),
        }),
      );
    });

    it('should filter by accountId', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ accountId: 'acc-1' }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: 'acc-1' }),
        }),
      );
    });

    it('should filter by contactId', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ contactId: 'contact-1' }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contactId: 'contact-1' }),
        }),
      );
    });

    it('should filter by opportunityId', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ opportunityId: 'opp-1' }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ opportunityId: 'opp-1' }),
        }),
      );
    });

    it('should filter by Salesforce entity IDs', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({
        sfLeadId: 'sf-lead-1',
        sfAccountId: 'sf-acc-1',
        sfContactId: 'sf-contact-1',
        sfOpportunityId: 'sf-opp-1',
      }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sfLeadId: 'sf-lead-1',
            sfAccountId: 'sf-acc-1',
            sfContactId: 'sf-contact-1',
            sfOpportunityId: 'sf-opp-1',
          }),
        }),
      );
    });

    it('should filter by isPrivate', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ isPrivate: true }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPrivate: true }),
        }),
      );
    });

    it('should handle isPrivate=false filter correctly', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ isPrivate: false }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPrivate: false }),
        }),
      );
    });

    it('should filter by search term across title and body', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.listNotes({ search: 'hello' }, orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'hello', mode: 'insensitive' } },
              { body: { contains: 'hello', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  // ============================================
  // updateNote
  // ============================================
  describe('updateNote', () => {
    it('should update a note body', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, body: 'Updated body' });

      const result = await service.updateNote('note-1', { body: 'Updated body' }, userId, orgId);

      expect(result.body).toBe('Updated body');
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1' },
          data: { body: 'Updated body' },
        }),
      );
    });

    it('should update a note title', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, title: 'New Title' });

      const result = await service.updateNote('note-1', { title: 'New Title' }, userId, orgId);

      expect(result.title).toBe('New Title');
    });

    it('should allow admin to update any note', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, body: 'Admin edit' });

      await service.updateNote('note-1', { body: 'Admin edit' }, 'admin-user', orgId, true);

      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1', organizationId: orgId },
        }),
      );
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.updateNote('nonexistent', { body: 'X' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate lead exists when updating leadId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, leadId: 'lead-1' });

      await service.updateNote('note-1', { leadId: 'lead-1' }, userId, orgId);

      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    });

    it('should throw NotFoundException when updating with invalid leadId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNote('note-1', { leadId: 'lead-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate account exists when updating accountId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc-1' });
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, accountId: 'acc-1' });

      await service.updateNote('note-1', { accountId: 'acc-1' }, userId, orgId);

      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
    });

    it('should throw NotFoundException when updating with invalid accountId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNote('note-1', { accountId: 'acc-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate contact exists when updating contactId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.contact.findUnique.mockResolvedValue({ id: 'contact-1' });
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, contactId: 'contact-1' });

      await service.updateNote('note-1', { contactId: 'contact-1' }, userId, orgId);

      expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 'contact-1' } });
    });

    it('should throw NotFoundException when updating with invalid contactId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNote('note-1', { contactId: 'contact-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate opportunity exists when updating opportunityId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.opportunity.findUnique.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, opportunityId: 'opp-1' });

      await service.updateNote('note-1', { opportunityId: 'opp-1' }, userId, orgId);

      expect(mockPrisma.opportunity.findUnique).toHaveBeenCalledWith({ where: { id: 'opp-1' } });
    });

    it('should throw NotFoundException when updating with invalid opportunityId', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.opportunity.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNote('note-1', { opportunityId: 'opp-missing' }, userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow setting entity IDs to null (unlink)', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({ ...mockNote, leadId: 'lead-1' });
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, leadId: null });

      await service.updateNote('note-1', { leadId: null }, userId, orgId);

      // Should not try to validate null leadId
      expect(mockPrisma.lead.findUnique).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // deleteNote
  // ============================================
  describe('deleteNote', () => {
    it('should delete a note for owner', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.delete.mockResolvedValue(mockNote);

      await service.deleteNote('note-1', userId, orgId);

      expect(mockPrisma.note.delete).toHaveBeenCalledWith({ where: { id: 'note-1' } });
    });

    it('should allow admin to delete any note', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.delete.mockResolvedValue(mockNote);

      await service.deleteNote('note-1', 'admin-user', orgId, true);

      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1', organizationId: orgId },
        }),
      );
      expect(mockPrisma.note.delete).toHaveBeenCalledWith({ where: { id: 'note-1' } });
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNote('nonexistent', userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return void on success', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.delete.mockResolvedValue(mockNote);

      const result = await service.deleteNote('note-1', userId, orgId);

      expect(result).toBeUndefined();
    });
  });

  // ============================================
  // searchNotes
  // ============================================
  describe('searchNotes', () => {
    it('should search notes by query with public-only for anonymous', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.searchNotes('test query', orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'test query', mode: 'insensitive' } },
              { body: { contains: 'test query', mode: 'insensitive' } },
            ],
            isPrivate: false,
            organizationId: orgId,
          }),
          take: 50,
        }),
      );
    });

    it('should show private notes for owner and public notes for others', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.searchNotes('query', orgId, userId, false);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: {
              OR: [{ isPrivate: false }, { userId }],
            },
          }),
        }),
      );
    });

    it('should not add AND privacy filter for admin (falls through to else branch)', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.searchNotes('query', orgId, userId, true);

      const callArgs = mockPrisma.note.findMany.mock.calls[0][0];
      // Admin with userId still hits the else branch, setting isPrivate: false
      // but does NOT get the AND filter that non-admins get
      expect(callArgs.where.AND).toBeUndefined();
      expect(callArgs.where.isPrivate).toBe(false);
    });

    it('should limit results to 50', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.searchNotes('query', orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should order results by createdAt descending', async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      await service.searchNotes('query', orgId);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  // ============================================
  // getNoteStats
  // ============================================
  describe('getNoteStats', () => {
    it('should return note statistics for all users (admin)', async () => {
      mockPrisma.note.count
        .mockResolvedValueOnce(100)   // total
        .mockResolvedValueOnce(30)    // private
        .mockResolvedValueOnce(10)    // local leads
        .mockResolvedValueOnce(20)    // local accounts
        .mockResolvedValueOnce(15)    // local contacts
        .mockResolvedValueOnce(25)    // local opportunities
        .mockResolvedValueOnce(5)     // sf leads
        .mockResolvedValueOnce(8)     // sf accounts
        .mockResolvedValueOnce(3)     // sf contacts
        .mockResolvedValueOnce(12);   // sf opportunities

      const result = await service.getNoteStats(orgId, undefined, true);

      expect(result.total).toBe(100);
      expect(result.privateNotes).toBe(30);
      expect(result.publicNotes).toBe(70);
      expect(result.byEntity.leads).toBe(15);       // 10 + 5
      expect(result.byEntity.accounts).toBe(28);    // 20 + 8
      expect(result.byEntity.contacts).toBe(18);    // 15 + 3
      expect(result.byEntity.opportunities).toBe(37); // 25 + 12
      expect(result.byLocalEntity.leads).toBe(10);
      expect(result.bySalesforceEntity.leads).toBe(5);
    });

    it('should filter by userId for non-admin', async () => {
      mockPrisma.note.count.mockResolvedValue(0);

      await service.getNoteStats(orgId, userId, false);

      // The first call should include userId filter
      expect(mockPrisma.note.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId, organizationId: orgId }),
        }),
      );
    });

    it('should not filter by userId for admin', async () => {
      mockPrisma.note.count.mockResolvedValue(0);

      await service.getNoteStats(orgId, userId, true);

      // The first call should NOT include userId filter
      expect(mockPrisma.note.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
    });

    it('should calculate publicNotes as total minus private', async () => {
      mockPrisma.note.count
        .mockResolvedValueOnce(50)    // total
        .mockResolvedValueOnce(20)    // private
        .mockResolvedValue(0);        // all entity counts

      const result = await service.getNoteStats(orgId);

      expect(result.publicNotes).toBe(30);
    });
  });

  // ============================================
  // updateNoteWithVoiceData
  // ============================================
  describe('updateNoteWithVoiceData', () => {
    it('should update note with transcription data', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue({
        ...mockNote,
        transcription: 'Transcribed text',
        sourceType: 'VOICE',
      });

      const result = await service.updateNoteWithVoiceData(
        'note-1',
        { transcription: 'Transcribed text', sourceType: 'VOICE' },
        orgId,
        userId,
      );

      expect(result.transcription).toBe('Transcribed text');
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1' },
          data: {
            transcription: 'Transcribed text',
            audioUrl: undefined,
            sourceType: 'VOICE',
          },
        }),
      );
    });

    it('should update note with audio URL', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue({
        ...mockNote,
        audioUrl: 'https://storage.example.com/audio.mp3',
      });

      const result = await service.updateNoteWithVoiceData(
        'note-1',
        { audioUrl: 'https://storage.example.com/audio.mp3' },
        orgId,
        userId,
      );

      expect(result.audioUrl).toBe('https://storage.example.com/audio.mp3');
    });

    it('should allow setting audioUrl to null', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({ ...mockNote, audioUrl: 'old-url' });
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, audioUrl: null });

      await service.updateNoteWithVoiceData(
        'note-1',
        { audioUrl: null },
        orgId,
        userId,
      );

      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ audioUrl: null }),
        }),
      );
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.updateNoteWithVoiceData('nonexistent', { transcription: 'X' }, orgId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to update any note voice data', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue(mockNote);

      await service.updateNoteWithVoiceData(
        'note-1',
        { sourceType: 'MEETING' },
        orgId,
        'admin-user',
        true,
      );

      // Admin should not have userId in where clause
      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1', organizationId: orgId },
        }),
      );
    });

    it('should enforce ownership for non-admin', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue(mockNote);

      await service.updateNoteWithVoiceData(
        'note-1',
        { sourceType: 'VOICE' },
        orgId,
        userId,
        false,
      );

      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1', userId, organizationId: orgId },
        }),
      );
    });
  });
});
