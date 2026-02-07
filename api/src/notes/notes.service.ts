import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Note, Prisma } from '@prisma/client';
import { validateCrmForeignKeys } from '../common/validators/foreign-key.validator';

interface CreateNoteDto {
  title?: string;
  body: string;
  isPrivate?: boolean;
  // Local IRIS entity IDs
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  // Salesforce entity IDs (for Salesforce mode)
  sfLeadId?: string;
  sfAccountId?: string;
  sfContactId?: string;
  sfOpportunityId?: string;
}

interface UpdateNoteDto {
  title?: string;
  body?: string;
  isPrivate?: boolean;
  // Local IRIS entity IDs (null to unlink)
  leadId?: string | null;
  accountId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  // Salesforce entity IDs (null to unlink)
  sfLeadId?: string | null;
  sfAccountId?: string | null;
  sfContactId?: string | null;
  sfOpportunityId?: string | null;
}

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Create note
  async createNote(data: CreateNoteDto, userId: string, organizationId: string): Promise<Note> {
    this.logger.log(`Creating note${data.title ? `: ${data.title}` : ''}`);

    // Only validate local IDs (not Salesforce IDs) - extract local ID fields
    const localIdFields = {
      leadId: data.leadId,
      accountId: data.accountId,
      contactId: data.contactId,
      opportunityId: data.opportunityId,
    };
    validateCrmForeignKeys(localIdFields);

    // Verify related local entity exists if specified (skip for Salesforce IDs)
    if (data.leadId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: data.leadId } });
      if (!lead) {
        throw new NotFoundException(`Lead ${data.leadId} not found`);
      }
    }

    if (data.accountId) {
      const account = await this.prisma.account.findUnique({ where: { id: data.accountId } });
      if (!account) {
        throw new NotFoundException(`Account ${data.accountId} not found`);
      }
    }

    if (data.contactId) {
      const contact = await this.prisma.contact.findUnique({ where: { id: data.contactId } });
      if (!contact) {
        throw new NotFoundException(`Contact ${data.contactId} not found`);
      }
    }

    if (data.opportunityId) {
      const opportunity = await this.prisma.opportunity.findUnique({ where: { id: data.opportunityId } });
      if (!opportunity) {
        throw new NotFoundException(`Opportunity ${data.opportunityId} not found`);
      }
    }

    // Note: Salesforce IDs (sfLeadId, sfAccountId, etc.) are not validated locally
    // They are assumed to be valid Salesforce record IDs

    return this.prisma.note.create({
      data: {
        title: data.title,
        body: data.body,
        isPrivate: data.isPrivate,
        // Local entity links
        leadId: data.leadId,
        accountId: data.accountId,
        contactId: data.contactId,
        opportunityId: data.opportunityId,
        // Salesforce entity links
        sfLeadId: data.sfLeadId,
        sfAccountId: data.sfAccountId,
        sfContactId: data.sfContactId,
        sfOpportunityId: data.sfOpportunityId,
        userId,
        organizationId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true, salesforceId: true },
        },
        account: {
          select: { id: true, name: true, salesforceId: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true, salesforceId: true },
        },
      },
    });
  }

  // Get note by ID (with ownership verification)
  async getNote(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<Note> {
    const where: any = { id };
    if (!isAdmin) {
      where.userId = userId;
    }
    where.organizationId = organizationId;
    const note = await this.prisma.note.findFirst({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true, salesforceId: true },
        },
        account: {
          select: { id: true, name: true, salesforceId: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true, salesforceId: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    return note;
  }

  // List notes
  async listNotes(filters: {
    userId?: string;
    // Local IRIS entity IDs
    leadId?: string;
    accountId?: string;
    contactId?: string;
    opportunityId?: string;
    // Salesforce entity IDs
    sfLeadId?: string;
    sfAccountId?: string;
    sfContactId?: string;
    sfOpportunityId?: string;
    // Other filters
    isPrivate?: boolean;
    search?: string;
  } | undefined, organizationId: string, isAdmin?: boolean): Promise<Note[]> {
    const where: Prisma.NoteWhereInput = {};

    where.organizationId = organizationId;

    if (filters?.userId && !isAdmin) {
      where.userId = filters.userId;
    }

    // Local entity ID filters
    if (filters?.leadId) {
      where.leadId = filters.leadId;
    }

    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters?.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters?.opportunityId) {
      where.opportunityId = filters.opportunityId;
    }

    // Salesforce entity ID filters
    if (filters?.sfLeadId) {
      where.sfLeadId = filters.sfLeadId;
    }

    if (filters?.sfAccountId) {
      where.sfAccountId = filters.sfAccountId;
    }

    if (filters?.sfContactId) {
      where.sfContactId = filters.sfContactId;
    }

    if (filters?.sfOpportunityId) {
      where.sfOpportunityId = filters.sfOpportunityId;
    }

    if (filters?.isPrivate !== undefined) {
      where.isPrivate = filters.isPrivate;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.note.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true, salesforceId: true },
        },
        account: {
          select: { id: true, name: true, salesforceId: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true, salesforceId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update note (with ownership verification)
  async updateNote(id: string, data: UpdateNoteDto, userId: string, organizationId: string, isAdmin?: boolean): Promise<Note> {
    const where: any = { id };
    if (!isAdmin) {
      where.userId = userId;
    }
    where.organizationId = organizationId;
    const note = await this.prisma.note.findFirst({ where });

    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    // Validate local entity IDs if provided (skip nulls which mean "unlink")
    if (data.leadId && data.leadId !== null) {
      const lead = await this.prisma.lead.findUnique({ where: { id: data.leadId } });
      if (!lead) {
        throw new NotFoundException(`Lead ${data.leadId} not found`);
      }
    }

    if (data.accountId && data.accountId !== null) {
      const account = await this.prisma.account.findUnique({ where: { id: data.accountId } });
      if (!account) {
        throw new NotFoundException(`Account ${data.accountId} not found`);
      }
    }

    if (data.contactId && data.contactId !== null) {
      const contact = await this.prisma.contact.findUnique({ where: { id: data.contactId } });
      if (!contact) {
        throw new NotFoundException(`Contact ${data.contactId} not found`);
      }
    }

    if (data.opportunityId && data.opportunityId !== null) {
      const opportunity = await this.prisma.opportunity.findUnique({ where: { id: data.opportunityId } });
      if (!opportunity) {
        throw new NotFoundException(`Opportunity ${data.opportunityId} not found`);
      }
    }

    return this.prisma.note.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true, salesforceId: true },
        },
        account: {
          select: { id: true, name: true, salesforceId: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true, salesforceId: true },
        },
      },
    });
  }

  // Delete note (with ownership verification)
  async deleteNote(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<void> {
    const where: any = { id };
    if (!isAdmin) {
      where.userId = userId;
    }
    where.organizationId = organizationId;
    const note = await this.prisma.note.findFirst({ where });

    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    await this.prisma.note.delete({ where: { id } });
    this.logger.log(`Deleted note ${id}`);
  }

  // Search notes
  async searchNotes(query: string, organizationId: string, userId?: string, isAdmin?: boolean): Promise<Note[]> {
    const where: Prisma.NoteWhereInput = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
      ],
    };

    where.organizationId = organizationId;

    // If userId provided, only show their private notes plus all public notes
    if (userId && !isAdmin) {
      where.AND = {
        OR: [{ isPrivate: false }, { userId }],
      };
    } else {
      // If no userId, only show public notes
      where.isPrivate = false;
    }

    return this.prisma.note.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true, salesforceId: true },
        },
        account: {
          select: { id: true, name: true, salesforceId: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true, salesforceId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Get note statistics (includes both local and Salesforce-linked counts)
  async getNoteStats(organizationId: string, userId?: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.NoteWhereInput = (userId && !isAdmin) ? { userId } : {};
    where.organizationId = organizationId;

    const [total, privateNotes, localEntityCounts, sfEntityCounts] = await Promise.all([
      this.prisma.note.count({ where }),
      this.prisma.note.count({
        where: {
          ...where,
          isPrivate: true,
        },
      }),
      // Local entity counts
      Promise.all([
        this.prisma.note.count({
          where: { ...where, leadId: { not: null } },
        }),
        this.prisma.note.count({
          where: { ...where, accountId: { not: null } },
        }),
        this.prisma.note.count({
          where: { ...where, contactId: { not: null } },
        }),
        this.prisma.note.count({
          where: { ...where, opportunityId: { not: null } },
        }),
      ]),
      // Salesforce entity counts
      Promise.all([
        this.prisma.note.count({
          where: { ...where, sfLeadId: { not: null } },
        }),
        this.prisma.note.count({
          where: { ...where, sfAccountId: { not: null } },
        }),
        this.prisma.note.count({
          where: { ...where, sfContactId: { not: null } },
        }),
        this.prisma.note.count({
          where: { ...where, sfOpportunityId: { not: null } },
        }),
      ]),
    ]);

    return {
      total,
      privateNotes,
      publicNotes: total - privateNotes,
      byEntity: {
        // Combined counts (local + Salesforce, avoiding double-counting)
        leads: localEntityCounts[0] + sfEntityCounts[0],
        accounts: localEntityCounts[1] + sfEntityCounts[1],
        contacts: localEntityCounts[2] + sfEntityCounts[2],
        opportunities: localEntityCounts[3] + sfEntityCounts[3],
      },
      byLocalEntity: {
        leads: localEntityCounts[0],
        accounts: localEntityCounts[1],
        contacts: localEntityCounts[2],
        opportunities: localEntityCounts[3],
      },
      bySalesforceEntity: {
        leads: sfEntityCounts[0],
        accounts: sfEntityCounts[1],
        contacts: sfEntityCounts[2],
        opportunities: sfEntityCounts[3],
      },
    };
  }

  // Update note with voice-specific data
  async updateNoteWithVoiceData(id: string, data: {
    transcription?: string;
    audioUrl?: string | null;
    sourceType?: 'TEXT' | 'VOICE' | 'HANDWRITTEN' | 'MEETING' | 'EMAIL';
  }, organizationId: string, userId?: string, isAdmin?: boolean): Promise<Note> {
    // Verify note exists and user has access
    const whereCheck: any = { id };
    if (userId && !isAdmin) {
      whereCheck.userId = userId;
    }
    whereCheck.organizationId = organizationId;
    const note = await this.prisma.note.findFirst({ where: whereCheck });
    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    return this.prisma.note.update({
      where: { id },
      data: {
        transcription: data.transcription,
        audioUrl: data.audioUrl,
        sourceType: data.sourceType,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true, salesforceId: true },
        },
        account: {
          select: { id: true, name: true, salesforceId: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true, salesforceId: true },
        },
      },
    });
  }
}
