import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { ApplicationLogService, LogCategory, TransactionStatus } from '../admin/application-log.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { LeadStatus, BuyingIntent, AccountType, OpportunityStage } from '@prisma/client';
import { EnrichmentService } from '../integrations/enrichment/enrichment.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { WorkflowTriggerType, WorkflowEntityType } from '../workflows/dto/workflow.dto';
import { IntegrationEventsService } from '../integrations/events/integration-events.service';
import { CrmEventType } from '../integrations/events/crm-event.types';
import { EntityAuditService } from '../audit/entity-audit.service';
import { DuplicateDetectionService } from '../duplicates/duplicate-detection.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private prisma: PrismaService,
    private anthropic: AnthropicService,
    private applicationLogService: ApplicationLogService,
    private workflowsService: WorkflowsService,
    private integrationEventsService: IntegrationEventsService,
    private entityAuditService: EntityAuditService,
    private duplicateDetectionService: DuplicateDetectionService,
    @Optional() @Inject(forwardRef(() => EnrichmentService))
    private enrichmentService?: EnrichmentService,
  ) {}

  /**
   * Create a new lead with AI-powered scoring
   */
  async create(userId: string, createLeadDto: CreateLeadDto, organizationId: string) {
    const correlationId = this.applicationLogService.generateCorrelationId();

    try {
      // Log transaction start
      await this.applicationLogService.logTransaction(
        'LeadsService.create',
        'LEAD_CREATE',
        TransactionStatus.PENDING,
        `Creating lead: ${createLeadDto.firstName} ${createLeadDto.lastName}`,
        { userId, correlationId, entityType: 'Lead', category: LogCategory.CRM }
      );

      const lead = await this.prisma.lead.create({
        data: {
          ...createLeadDto,
          ownerId: userId,
          organizationId,
          status: createLeadDto.status || LeadStatus.NEW,
        },
      });

      // Log transaction success
      await this.applicationLogService.logTransaction(
        'LeadsService.create',
        'LEAD_CREATE',
        TransactionStatus.SUCCESS,
        `Lead created successfully: ${lead.id}`,
        { userId, correlationId, entityType: 'Lead', entityId: lead.id, category: LogCategory.CRM }
      );

      // Score the lead asynchronously
      this.scoreLead(lead.id, userId).catch((error) => {
        this.logger.error(`Failed to score lead ${lead.id}:`, error);
        this.applicationLogService.error('LeadsService.scoreLead', `Failed to score lead ${lead.id}: ${error.message}`, {
          entityType: 'Lead',
          entityId: lead.id,
          userId,
          category: LogCategory.AI,
          error,
        });
      });

      // Auto-enrich the lead if enrichment service is available
      if (this.enrichmentService && lead.email) {
        this.enrichmentService.autoEnrichLead(lead.id).catch((error) => {
          this.logger.error(`Failed to auto-enrich lead ${lead.id}:`, error);
          this.applicationLogService.error('LeadsService.autoEnrich', `Failed to auto-enrich lead ${lead.id}: ${error.message}`, {
            entityType: 'Lead',
            entityId: lead.id,
            userId,
            category: LogCategory.INTEGRATION,
            error,
          });
        });
      }

      // Trigger workflows for lead creation
      this.workflowsService.processTrigger(
        WorkflowTriggerType.RECORD_CREATED,
        WorkflowEntityType.LEAD,
        lead.id,
        { lead, userId, organizationId }
      ).catch((error) => {
        this.logger.error(`Failed to process workflows for lead ${lead.id}:`, error);
      });

      // Scan for duplicates asynchronously
      this.duplicateDetectionService.scanForDuplicates(organizationId, 'lead', lead.id)
        .catch(err => this.logger.error(`Duplicate scan failed for lead ${lead.id}: ${err.message}`));

      // Dispatch integration events
      this.integrationEventsService.dispatchCrmEvent(organizationId, {
        type: CrmEventType.LEAD_CREATED,
        entityId: lead.id,
        entityType: 'lead',
        organizationId,
        userId,
        timestamp: new Date().toISOString(),
        data: {
          name: `${lead.firstName} ${lead.lastName}`,
          email: lead.email,
          company: lead.company,
          title: lead.title,
          leadSource: lead.leadSource,
          leadScore: lead.leadScore,
        },
      }).catch((error) => {
        this.logger.error(`Failed to dispatch integration event for lead ${lead.id}:`, error);
      });

      return lead;
    } catch (error) {
      // Log transaction failure
      await this.applicationLogService.logTransaction(
        'LeadsService.create',
        'LEAD_CREATE',
        TransactionStatus.FAILED,
        `Failed to create lead: ${error.message}`,
        { userId, correlationId, entityType: 'Lead', category: LogCategory.CRM, error }
      );
      throw error;
    }
  }

  /**
   * Find all leads with optional filtering and cursor-based pagination
   */
  async findAll(
    userId: string | undefined,
    organizationId: string,
    filters?: {
      name?: string;
      status?: LeadStatus;
      rating?: string;
      leadSource?: string;
      minScore?: number;
      cursor?: string;
      limit?: number;
    },
    isAdmin?: boolean,
  ) {
    const where: any = {};
    const limit = filters?.limit || 50;
    const cursor = filters?.cursor;

    // Organization filtering - always filter by org (mandatory for tenant isolation)
    where.organizationId = organizationId;

    // Admin sees all within org, regular users only see their own
    if (userId && !isAdmin) {
      where.ownerId = userId;
    }

    if (filters?.name) {
      // Search in firstName, lastName, or company
      where.OR = [
        { firstName: { contains: filters.name, mode: 'insensitive' } },
        { lastName: { contains: filters.name, mode: 'insensitive' } },
        { company: { contains: filters.name, mode: 'insensitive' } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.rating) {
      where.rating = filters.rating;
    }

    if (filters?.leadSource) {
      where.leadSource = filters.leadSource;
    }

    if (filters?.minScore !== undefined) {
      where.leadScore = { gte: filters.minScore };
    }

    // Build cursor-based pagination
    const queryOptions: any = {
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          orderBy: { dueDate: 'asc' },
        },
        activities: {
          orderBy: { activityDate: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { leadScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1, // Fetch one extra to check if there are more
    };

    if (cursor) {
      queryOptions.skip = 1; // Skip the cursor
      queryOptions.cursor = { id: cursor };
    }

    const leads = await this.prisma.lead.findMany(queryOptions);

    // Determine if there are more results
    const hasMore = leads.length > limit;
    const data = hasMore ? leads.slice(0, limit) : leads;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;

    // If cursor was requested, return paginated response
    if (cursor !== undefined || filters?.limit !== undefined) {
      return {
        data,
        nextCursor,
        hasMore,
      };
    }

    // For backward compatibility, return array if no pagination params
    return data;
  }

  /**
   * Find one lead by ID (with ownership verification)
   */
  async findOne(id: string, userId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id };
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const lead = await this.prisma.lead.findFirst({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
        activities: {
          orderBy: { activityDate: 'desc' },
        },
        notes: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  /**
   * Update a lead (with ownership verification)
   */
  async update(id: string, userId: string, organizationId: string, updateLeadDto: UpdateLeadDto, isAdmin?: boolean) {
    const where: any = { id };
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const lead = await this.prisma.lead.findFirst({ where });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // If qualification status changed, update qualification date
    const data: any = { ...updateLeadDto };

    if (updateLeadDto.isQualified === true && !lead.qualifiedDate) {
      data.qualifiedDate = new Date();
      data.status = LeadStatus.QUALIFIED;
    } else if (updateLeadDto.isQualified === false && updateLeadDto.disqualifiedReason) {
      data.status = LeadStatus.UNQUALIFIED;
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Track field-level changes for audit trail
    this.entityAuditService.trackChanges({
      organizationId, entityType: 'lead', entityId: id, userId,
      before: lead, after: updated,
      trackedFields: ['firstName', 'lastName', 'email', 'phone', 'company', 'title', 'status', 'rating', 'source', 'isQualified', 'description'],
    }).catch(err => this.logger.error(`Audit tracking failed: ${err.message}`));

    return updated;
  }

  /**
   * Delete a lead (with ownership verification)
   */
  async remove(id: string, userId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id };
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const lead = await this.prisma.lead.findFirst({ where });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    await this.prisma.lead.delete({ where: { id } });

    return { message: 'Lead deleted successfully' };
  }

  /**
   * Score a lead using AI (with ownership verification)
   */
  async scoreLead(leadId: string, userId: string, organizationId?: string, isAdmin?: boolean) {
    const where: any = { id: leadId };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const lead = await this.prisma.lead.findFirst({ where });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    try {
      const prompt = `Analyze this sales lead and provide a detailed assessment:

Lead Information:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Company Size: ${lead.numberOfEmployees || 'Unknown'} employees
- Annual Revenue: ${lead.annualRevenue ? `$${lead.annualRevenue}` : 'Unknown'}
- Lead Source: ${lead.leadSource || 'Unknown'}
- Pain Points: ${lead.painPoints?.join(', ') || 'Not specified'}
- Budget: ${lead.budget ? `$${lead.budget}` : 'Unknown'}
- Timeline: ${lead.timeline || 'Unknown'}

Provide a JSON response with:
{
  "leadScore": <number 0-100>,
  "buyingIntent": "<HIGH|MEDIUM|LOW|UNKNOWN>",
  "reasoning": "<brief explanation of score>",
  "recommendedActions": ["<action1>", "<action2>", "<action3>"]
}

Score based on: budget fit, timeline urgency, pain point severity, decision-making authority, company size/revenue fit.`;

      const response = await this.anthropic.generateChatCompletion({
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 1000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`Failed to extract JSON from AI response for lead ${leadId}`);
        return lead;
      }

      const aiAssessment = JSON.parse(jsonMatch[0]);

      const updated = await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          leadScore: Math.min(100, Math.max(0, aiAssessment.leadScore)),
          buyingIntent: aiAssessment.buyingIntent as BuyingIntent,
        },
      });

      this.logger.log(`Scored lead ${leadId}: ${aiAssessment.leadScore}/100`);

      return updated;
    } catch (error) {
      this.logger.error(`Error scoring lead ${leadId}:`, error);
      return lead;
    }
  }

  /**
   * Convert a lead to Account, Contact, and optionally Opportunity (with ownership verification)
   */
  async convertLead(leadId: string, userId: string, organizationId: string, convertDto: ConvertLeadDto, isAdmin?: boolean) {
    const where: any = { id: leadId };
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const lead = await this.prisma.lead.findFirst({ where });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Lead has already been converted');
    }

    if (!lead.isQualified) {
      throw new BadRequestException('Lead must be qualified before conversion');
    }

    let accountId: string;
    let contactId: string;
    let opportunityId: string | null = null;

    try {
      // Start a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create or use existing Account
        let account;
        if (convertDto.existingAccountId) {
          account = await tx.account.findUnique({
            where: { id: convertDto.existingAccountId },
          });
          if (!account) {
            throw new NotFoundException('Specified account not found');
          }
        } else if (convertDto.createAccount) {
          account = await tx.account.create({
            data: {
              name: convertDto.accountName || lead.company || `${lead.firstName} ${lead.lastName}`,
              ownerId: userId,
              organizationId,
              website: lead.website,
              phone: lead.phone,
              industry: lead.industry,
              numberOfEmployees: lead.numberOfEmployees,
              annualRevenue: lead.annualRevenue,
              type: AccountType.PROSPECT,
              billingStreet: lead.street,
              billingCity: lead.city,
              billingState: lead.state,
              billingPostalCode: lead.postalCode,
              billingCountry: lead.country,
              painPoints: lead.painPoints || [],
            },
          });
        }

        accountId = account?.id;

        // 2. Create Contact
        let contact;
        if (convertDto.createContact) {
          contact = await tx.contact.create({
            data: {
              accountId: accountId,
              ownerId: userId,
              organizationId,
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone,
              title: lead.title,
              mailingStreet: lead.street,
              mailingCity: lead.city,
              mailingState: lead.state,
              mailingPostalCode: lead.postalCode,
              mailingCountry: lead.country,
            },
          });
        }

        contactId = contact?.id;

        // 3. Create Opportunity if requested
        let opportunity;
        if (convertDto.createOpportunity) {
          opportunity = await tx.opportunity.create({
            data: {
              accountId: accountId,
              ownerId: userId,
              organizationId,
              name: convertDto.opportunityName || `${lead.company || lead.firstName + ' ' + lead.lastName} - Opportunity`,
              amount: convertDto.opportunityAmount || lead.budget,
              stage: OpportunityStage.QUALIFICATION,
              probability: 20,
              expectedRevenue: convertDto.opportunityAmount
                ? convertDto.opportunityAmount * 0.2
                : lead.budget
                  ? lead.budget * 0.2
                  : null,
            },
          });

          // Link primary contact to opportunity
          if (contactId) {
            await tx.opportunityContactRole.create({
              data: {
                opportunityId: opportunity.id,
                contactId: contactId,
                isPrimary: true,
              },
            });
          }
        }

        opportunityId = opportunity?.id;

        // 4. Update Lead as converted
        await tx.lead.update({
          where: { id: leadId },
          data: {
            status: LeadStatus.CONVERTED,
            convertedDate: new Date(),
            convertedAccountId: accountId,
            convertedContactId: contactId,
            convertedOpportunityId: opportunityId,
          },
        });

        return { accountId, contactId, opportunityId };
      });

      this.logger.log(`Converted lead ${leadId} to Account ${result.accountId}, Contact ${result.contactId}${result.opportunityId ? `, Opportunity ${result.opportunityId}` : ''}`);

      // Dispatch integration event for lead conversion
      this.integrationEventsService.dispatchCrmEvent(organizationId, {
        type: CrmEventType.LEAD_CONVERTED,
        entityId: leadId,
        entityType: 'lead',
        organizationId,
        userId,
        timestamp: new Date().toISOString(),
        data: {
          name: `${lead.firstName} ${lead.lastName}`,
          company: lead.company,
          accountId: result.accountId,
          contactId: result.contactId,
          opportunityId: result.opportunityId,
          accountName: convertDto.accountName || lead.company,
          opportunityName: convertDto.opportunityName,
        },
      }).catch((error) => {
        this.logger.error(`Failed to dispatch lead conversion integration event for lead ${leadId}:`, error);
      });

      // Log successful conversion transaction
      await this.applicationLogService.logTransaction(
        'LeadsService.convertLead',
        'LEAD_CONVERT',
        TransactionStatus.SUCCESS,
        `Lead ${leadId} converted to Account, Contact${result.opportunityId ? ', Opportunity' : ''}`,
        {
          userId,
          entityType: 'Lead',
          entityId: leadId,
          category: LogCategory.CRM,
          metadata: {
            accountId: result.accountId,
            contactId: result.contactId,
            opportunityId: result.opportunityId,
          },
          tags: ['conversion', 'crm-pipeline'],
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to convert lead ${leadId}:`, error);

      // Log failed conversion transaction
      await this.applicationLogService.logTransaction(
        'LeadsService.convertLead',
        'LEAD_CONVERT',
        TransactionStatus.FAILED,
        `Failed to convert lead ${leadId}: ${error.message}`,
        {
          userId,
          entityType: 'Lead',
          entityId: leadId,
          category: LogCategory.CRM,
          error,
          tags: ['conversion', 'crm-pipeline'],
        }
      );

      throw error;
    }
  }

  /**
   * Get lead statistics
   */
  async getStats(userId: string | undefined, organizationId: string, isAdmin?: boolean) {
    const where: any = {};
    where.organizationId = organizationId;
    if (userId && !isAdmin) {
      where.ownerId = userId;
    }

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      avgScore,
      highIntentLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { ...where, isQualified: true } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      this.prisma.lead.aggregate({
        where: { ...where, leadScore: { not: null } },
        _avg: { leadScore: true },
      }),
      this.prisma.lead.count({
        where: { ...where, buyingIntent: BuyingIntent.HIGH },
      }),
    ]);

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      averageScore: avgScore._avg.leadScore || 0,
      highIntentLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    };
  }

  // ============ Bulk Operations ============

  /**
   * Bulk update multiple leads
   */
  async bulkUpdate(ids: string[], userId: string, organizationId: string, updates: any, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const result = await this.prisma.lead.updateMany({
      where,
      data: updates,
    });

    return {
      message: `Successfully updated ${result.count} leads`,
      count: result.count,
    };
  }

  /**
   * Bulk delete multiple leads
   */
  async bulkDelete(ids: string[], userId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const result = await this.prisma.lead.deleteMany({ where });

    return {
      message: `Successfully deleted ${result.count} leads`,
      count: result.count,
    };
  }

  /**
   * Bulk assign leads to a new owner
   */
  async bulkAssign(ids: string[], userId: string, organizationId: string, newOwnerId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const result = await this.prisma.lead.updateMany({
      where,
      data: { ownerId: newOwnerId },
    });

    return {
      message: `Successfully assigned ${result.count} leads to new owner`,
      count: result.count,
    };
  }
}
