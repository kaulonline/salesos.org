import { Injectable, Logger, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Contact, Prisma } from '@prisma/client';
import { validateForeignKeyId } from '../common/validators/foreign-key.validator';
import { EnrichmentService } from '../integrations/enrichment/enrichment.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { WorkflowTriggerType, WorkflowEntityType } from '../workflows/dto/workflow.dto';

interface CreateContactDto {
  accountId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  reportsToId?: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingPostalCode?: string;
  mailingCountry?: string;
  description?: string;
}

interface UpdateContactDto extends Partial<CreateContactDto> {}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowsService: WorkflowsService,
    @Optional() @Inject(forwardRef(() => EnrichmentService))
    private enrichmentService?: EnrichmentService,
  ) {}

  // Create contact
  async createContact(data: CreateContactDto, ownerId: string, organizationId: string): Promise<Contact> {
    this.logger.log(`Creating contact: ${data.firstName} ${data.lastName}`);

    // Validate foreign key IDs before Prisma queries
    validateForeignKeyId(data.accountId, 'accountId', 'Account');
    validateForeignKeyId(data.reportsToId, 'reportsToId', 'Contact');

    // Verify account exists
    const account = await this.prisma.account.findUnique({
      where: { id: data.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${data.accountId} not found`);
    }

    // If reporting relationship specified, verify contact exists
    if (data.reportsToId) {
      const reportsTo = await this.prisma.contact.findUnique({
        where: { id: data.reportsToId },
      });

      if (!reportsTo) {
        throw new NotFoundException(`Contact ${data.reportsToId} not found`);
      }
    }

    const contact = await this.prisma.contact.create({
      data: {
        ...data,
        ownerId,
        organizationId,
      },
      include: {
        account: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        reportsTo: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
      },
    });

    // Auto-enrich the contact if enrichment service is available
    if (this.enrichmentService && contact.email) {
      this.enrichmentService.autoEnrichContact(contact.id).catch((error) => {
        this.logger.error(`Failed to auto-enrich contact ${contact.id}:`, error);
      });
    }

    // Trigger workflows for contact creation
    this.workflowsService.processTrigger(
      WorkflowTriggerType.RECORD_CREATED,
      WorkflowEntityType.CONTACT,
      contact.id,
      { contact, ownerId, organizationId }
    ).catch((error) => {
      this.logger.error(`Failed to process workflows for contact ${contact.id}:`, error);
    });

    return contact;
  }

  // Get contact by ID (with ownership verification)
  async getContact(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contact = await this.prisma.contact.findFirst({
      where,
      include: {
        account: {
          select: { id: true, name: true, type: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        reportsTo: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, title: true, email: true },
        },
        opportunityRoles: {
          include: {
            opportunity: {
              select: { id: true, name: true, stage: true, amount: true },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            activities: true,
            directReports: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  // List contacts
  async listContacts(filters: {
    accountId?: string;
    ownerId?: string;
    search?: string;
  } | undefined, organizationId: string, isAdmin?: boolean): Promise<Contact[]> {
    const where: Prisma.ContactWhereInput = {};

    where.organizationId = organizationId;

    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters?.ownerId && !isAdmin) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.contact.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        reportsTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: {
            tasks: true,
            activities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update contact (with ownership verification)
  async updateContact(id: string, userId: string, data: UpdateContactDto, organizationId: string, isAdmin?: boolean): Promise<Contact> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contact = await this.prisma.contact.findFirst({ where });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data,
      include: {
        account: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        reportsTo: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
      },
    });

    // Trigger workflows for contact update
    this.workflowsService.processTrigger(
      WorkflowTriggerType.RECORD_UPDATED,
      WorkflowEntityType.CONTACT,
      id,
      { contact: updated, previousData: contact, userId, organizationId }
    ).catch((error) => {
      this.logger.error(`Failed to process update workflows for contact ${id}:`, error);
    });

    return updated;
  }

  // Delete contact (with ownership verification)
  async deleteContact(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<void> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contact = await this.prisma.contact.findFirst({
      where,
      include: {
        _count: {
          select: {
            opportunityRoles: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    await this.prisma.contact.delete({ where: { id } });
    this.logger.log(`Deleted contact ${id}`);
  }

  // Get contact statistics
  async getContactStats(ownerId: string | undefined, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.ContactWhereInput = (ownerId && !isAdmin) ? { ownerId } : {};
    where.organizationId = organizationId;

    const [total, byAccount, withEmail, withPhone, topContacts] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.groupBy({
        by: ['accountId'],
        where,
        _count: true,
        orderBy: {
          _count: {
            accountId: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.contact.count({
        where: {
          ...where,
          email: { not: null },
        },
      }),
      this.prisma.contact.count({
        where: {
          ...where,
          phone: { not: null },
        },
      }),
      this.prisma.contact.findMany({
        where,
        include: {
          account: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              opportunityRoles: true,
              activities: true,
            },
          },
        },
        orderBy: {
          opportunityRoles: {
            _count: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Fetch account names for byAccount stats
    const accountIds = byAccount.map((b) => b.accountId).filter((id): id is string => id !== null);
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    const byAccountWithNames = byAccount.map((b) => ({
      accountId: b.accountId,
      accountName: b.accountId ? accountMap.get(b.accountId) || 'Unknown' : 'Unknown',
      count: b._count,
    }));

    return {
      total,
      byAccount: byAccountWithNames,
      withEmail,
      withPhone,
      topContacts,
    };
  }

  // Get contact's opportunity involvement (with ownership verification)
  async getContactOpportunities(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contact = await this.prisma.contact.findFirst({
      where,
      include: {
        opportunityRoles: {
          include: {
            opportunity: {
              select: {
                id: true,
                name: true,
                stage: true,
                amount: true,
                probability: true,
                closeDate: true,
                isWon: true,
                isClosed: true,
              },
            },
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    const roles = contact.opportunityRoles;

    return {
      contactId: id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      totalOpportunities: roles.length,
      openOpportunities: roles.filter((r) => !r.opportunity.isClosed).length,
      wonOpportunities: roles.filter((r) => r.opportunity.isWon).length,
      roles,
    };
  }

  // ============ Bulk Operations ============

  async bulkUpdate(ids: string[], userId: string, updates: any, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.contact.updateMany({
      where,
      data: updates,
    });

    return {
      message: `Successfully updated ${result.count} contacts`,
      count: result.count,
    };
  }

  async bulkDelete(ids: string[], userId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.contact.deleteMany({ where });

    return {
      message: `Successfully deleted ${result.count} contacts`,
      count: result.count,
    };
  }

  async bulkAssign(ids: string[], userId: string, newOwnerId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.contact.updateMany({
      where,
      data: { ownerId: newOwnerId },
    });

    return {
      message: `Successfully assigned ${result.count} contacts to new owner`,
      count: result.count,
    };
  }
}
