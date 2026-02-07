import { Injectable, Logger } from '@nestjs/common';
import { OracleCXService } from '../../oracle-cx/oracle-cx.service';
import {
  CRMDataProvider,
  Opportunity,
  OpportunityDetails,
  OpportunityFilters,
  Account,
  AccountDetails,
  AccountFilters,
  Contact,
  ContactFilters,
  Lead,
  LeadFilters,
  Activity,
  ActivityFilters,
  Task,
  TaskInput,
  Note,
  NoteInput,
  QueryResult,
} from './crm-data-provider.interface';
import {
  OracleCXOpportunity,
  OracleCXAccount,
  OracleCXContact,
  OracleCXLead,
  OracleCXActivity,
} from '../../oracle-cx/dto/oracle-cx-query.dto';

/**
 * Oracle CX Data Provider
 *
 * Implements the CRMDataProvider interface for Oracle CX Sales Cloud,
 * adapting Oracle CX API responses to the unified data format.
 */
@Injectable()
export class OracleCXProvider implements CRMDataProvider {
  readonly providerName = 'oracle_cx';
  private readonly logger = new Logger(OracleCXProvider.name);

  constructor(private readonly oracleCXService: OracleCXService) {}

  // ==================== CONNECTION ====================

  async isConnected(userId: string): Promise<boolean> {
    const status = await this.oracleCXService.getConnectionStatus(userId);
    return status.connected;
  }

  async getConnectionInfo(userId: string): Promise<{
    connected: boolean;
    instanceUrl?: string;
    displayName?: string;
    orgId?: string;
  }> {
    const status = await this.oracleCXService.getConnectionStatus(userId);
    return {
      connected: status.connected,
      instanceUrl: status.connection?.instanceUrl,
      displayName: status.connection?.displayName,
      orgId: status.connection?.externalOrgId,
    };
  }

  // ==================== OPPORTUNITIES ====================

  async getOpportunities(
    userId: string,
    filters?: OpportunityFilters,
  ): Promise<QueryResult<Opportunity>> {
    const result = await this.oracleCXService.listOpportunities(
      userId,
      filters?.limit || 50,
      filters?.offset || 0,
      {
        status: filters?.status,
        stage: filters?.stage,
        minAmount: filters?.minAmount,
        search: filters?.search,
      },
    );

    return {
      items: result.items.map(this.mapOpportunity),
      totalCount: result.totalResults,
      hasMore: result.hasMore,
      offset: result.offset,
      limit: result.limit,
    };
  }

  async getOpportunityDetails(
    userId: string,
    opportunityId: string,
  ): Promise<OpportunityDetails | null> {
    const opty = await this.oracleCXService.getById<OracleCXOpportunity>(
      userId,
      'opportunities',
      opportunityId,
    );

    if (!opty) return null;

    // Get related activities
    const activitiesResult = await this.oracleCXService.getActivities(
      userId,
      opportunityId,
      'opportunity',
      20,
    );

    return {
      ...this.mapOpportunity(opty),
      activities: activitiesResult.items.map(this.mapActivity),
    };
  }

  async updateOpportunity(
    userId: string,
    opportunityId: string,
    data: Partial<Opportunity>,
  ): Promise<void> {
    const updateData: Record<string, any> = {};

    if (data.name) updateData.Name = data.name;
    if (data.amount !== undefined) updateData.Revenue = data.amount;
    if (data.stage) updateData.SalesStage = data.stage;
    if (data.probability !== undefined) updateData.WinProb = data.probability;
    if (data.closeDate)
      updateData.EstimatedCloseDate = data.closeDate.toISOString().split('T')[0];
    if (data.description) updateData.Description = data.description;
    if (data.status) updateData.StatusCode = data.status;

    await this.oracleCXService.update(
      userId,
      'opportunities',
      opportunityId,
      updateData,
    );
  }

  // ==================== ACCOUNTS ====================

  async getAccounts(
    userId: string,
    filters?: AccountFilters,
  ): Promise<QueryResult<Account>> {
    const result = await this.oracleCXService.listAccounts(
      userId,
      filters?.limit || 50,
      filters?.offset || 0,
      {
        industry: filters?.industry,
        search: filters?.search,
      },
    );

    return {
      items: result.items.map(this.mapAccount),
      totalCount: result.totalResults,
      hasMore: result.hasMore,
      offset: result.offset,
      limit: result.limit,
    };
  }

  async getAccountDetails(
    userId: string,
    accountId: string,
  ): Promise<AccountDetails | null> {
    const account = await this.oracleCXService.getById<OracleCXAccount>(
      userId,
      'accounts',
      accountId,
    );

    if (!account) return null;

    // Get related contacts and opportunities in parallel
    const [contactsResult, opptysResult, activitiesResult] = await Promise.all([
      this.oracleCXService.listContacts(userId, 20, 0, {
        accountId: accountId,
      }),
      this.oracleCXService.query<OracleCXOpportunity>(userId, 'opportunities', {
        filters: { AccountId: accountId },
        limit: 20,
      }),
      this.oracleCXService.getActivities(userId, accountId, 'account', 20),
    ]);

    return {
      ...this.mapAccount(account),
      contacts: contactsResult.items.map(this.mapContact),
      opportunities: opptysResult.items.map(this.mapOpportunity),
      activities: activitiesResult.items.map(this.mapActivity),
    };
  }

  // ==================== CONTACTS ====================

  async getContacts(
    userId: string,
    filters?: ContactFilters,
  ): Promise<QueryResult<Contact>> {
    const result = await this.oracleCXService.listContacts(
      userId,
      filters?.limit || 50,
      filters?.offset || 0,
      {
        accountId: filters?.accountId,
        search: filters?.search,
      },
    );

    return {
      items: result.items.map(this.mapContact),
      totalCount: result.totalResults,
      hasMore: result.hasMore,
      offset: result.offset,
      limit: result.limit,
    };
  }

  // ==================== LEADS ====================

  async getLeads(
    userId: string,
    filters?: LeadFilters,
  ): Promise<QueryResult<Lead>> {
    const result = await this.oracleCXService.listLeads(
      userId,
      filters?.limit || 50,
      filters?.offset || 0,
      {
        status: filters?.status,
        rating: filters?.rating,
        search: filters?.search,
      },
    );

    return {
      items: result.items.map(this.mapLead),
      totalCount: result.totalResults,
      hasMore: result.hasMore,
      offset: result.offset,
      limit: result.limit,
    };
  }

  // ==================== ACTIVITIES ====================

  async getActivities(
    userId: string,
    entityId: string,
    entityType: 'opportunity' | 'account' | 'contact' | 'lead',
    filters?: ActivityFilters,
  ): Promise<QueryResult<Activity>> {
    const result = await this.oracleCXService.getActivities(
      userId,
      entityId,
      entityType,
      filters?.limit || 50,
    );

    return {
      items: result.items.map(this.mapActivity),
      totalCount: result.totalResults,
      hasMore: result.hasMore,
      offset: result.offset,
      limit: result.limit,
    };
  }

  // ==================== TASKS ====================

  async createTask(userId: string, task: TaskInput): Promise<Task> {
    const taskData: Record<string, any> = {
      TaskName: task.subject,
      Description: task.description,
      Status: task.status || 'NOT_STARTED',
      Priority: task.priority || 'NORMAL',
    };

    if (task.dueDate) {
      taskData.DueDate = task.dueDate.toISOString().split('T')[0];
    }

    // Map related entity
    if (task.relatedToId && task.relatedToType) {
      switch (task.relatedToType) {
        case 'opportunity':
          taskData.OptyId = task.relatedToId;
          break;
        case 'account':
          taskData.AccountId = task.relatedToId;
          break;
        case 'contact':
          taskData.ContactId = task.relatedToId;
          break;
        case 'lead':
          taskData.LeadId = task.relatedToId;
          break;
      }
    }

    const result = await this.oracleCXService.create(userId, 'tasks', taskData);

    return {
      id: result.id,
      subject: task.subject,
      description: task.description,
      status: task.status || 'NOT_STARTED',
      priority: task.priority || 'NORMAL',
      dueDate: task.dueDate,
      relatedToId: task.relatedToId,
      relatedToType: task.relatedToType,
      createdAt: new Date(),
    };
  }

  async updateTask(
    userId: string,
    taskId: string,
    data: Partial<Task>,
  ): Promise<void> {
    const updateData: Record<string, any> = {};

    if (data.subject) updateData.TaskName = data.subject;
    if (data.description) updateData.Description = data.description;
    if (data.status) updateData.Status = data.status;
    if (data.priority) updateData.Priority = data.priority;
    if (data.dueDate)
      updateData.DueDate = data.dueDate.toISOString().split('T')[0];

    await this.oracleCXService.update(userId, 'tasks', taskId, updateData);
  }

  // ==================== NOTES ====================

  async createNote(userId: string, note: NoteInput): Promise<Note> {
    const noteData: Record<string, any> = {
      NoteTitle: note.title,
      NoteTxt: note.body,
    };

    // Map related entity
    if (note.relatedToId && note.relatedToType) {
      switch (note.relatedToType) {
        case 'opportunity':
          noteData.OptyId = note.relatedToId;
          break;
        case 'account':
          noteData.AccountId = note.relatedToId;
          break;
        case 'contact':
          noteData.ContactId = note.relatedToId;
          break;
        case 'lead':
          noteData.LeadId = note.relatedToId;
          break;
      }
    }

    const result = await this.oracleCXService.create(userId, 'notes', noteData);

    return {
      id: result.id,
      title: note.title,
      body: note.body,
      relatedToId: note.relatedToId,
      relatedToType: note.relatedToType,
      createdAt: new Date(),
    };
  }

  // ==================== MAPPING HELPERS ====================

  private mapOpportunity = (opty: OracleCXOpportunity): Opportunity => ({
    id: opty.OptyId?.toString() || opty.OptyNumber,
    name: opty.Name,
    amount: opty.Revenue,
    stage: opty.SalesStage,
    probability: opty.WinProb,
    closeDate: opty.EstimatedCloseDate
      ? new Date(opty.EstimatedCloseDate)
      : undefined,
    accountId: opty.AccountId?.toString(),
    accountName: opty.AccountName,
    ownerId: opty.OwnerResourceId?.toString(),
    ownerName: opty.OwnerResourceName,
    status: opty.StatusCode,
    description: opty.Description,
    createdAt: opty.CreationDate ? new Date(opty.CreationDate) : undefined,
    updatedAt: opty.LastUpdateDate ? new Date(opty.LastUpdateDate) : undefined,
    metadata: {
      optyNumber: opty.OptyNumber,
      currencyCode: opty.CurrencyCode,
      primaryContactId: opty.PrimaryContactId,
      primaryContactName: opty.PrimaryContactName,
    },
  });

  private mapAccount = (account: OracleCXAccount): Account => ({
    id: account.PartyId?.toString() || account.PartyNumber,
    name: account.PartyName || account.OrganizationName || '',
    industry: account.Industry,
    website: undefined, // Not available in basic Oracle CX account
    phone: account.PhoneNumber,
    annualRevenue: account.AnnualRevenue,
    employeeCount: account.EmployeeCount,
    address: {
      street: account.Address1,
      city: account.City,
      state: account.State,
      postalCode: account.PostalCode,
      country: account.Country,
    },
    ownerId: account.OwnerResourceId?.toString(),
    ownerName: account.OwnerResourceName,
    createdAt: account.CreationDate ? new Date(account.CreationDate) : undefined,
    updatedAt: account.LastUpdateDate
      ? new Date(account.LastUpdateDate)
      : undefined,
    metadata: {
      partyNumber: account.PartyNumber,
      partyType: account.PartyType,
      email: account.EmailAddress,
    },
  });

  private mapContact = (contact: OracleCXContact): Contact => ({
    id: contact.PartyId?.toString() || contact.PartyNumber,
    firstName: contact.FirstName,
    lastName: contact.LastName,
    name: contact.PartyName || `${contact.FirstName} ${contact.LastName}`.trim(),
    email: contact.EmailAddress,
    phone: contact.PhoneNumber,
    mobile: contact.MobileNumber,
    title: contact.JobTitle,
    accountId: contact.AccountId?.toString(),
    accountName: contact.AccountName,
    ownerId: contact.OwnerResourceId?.toString(),
    createdAt: contact.CreationDate ? new Date(contact.CreationDate) : undefined,
    updatedAt: contact.LastUpdateDate
      ? new Date(contact.LastUpdateDate)
      : undefined,
    metadata: {
      partyNumber: contact.PartyNumber,
    },
  });

  private mapLead = (lead: OracleCXLead): Lead => ({
    id: lead.LeadId?.toString() || lead.LeadNumber,
    name: lead.Name,
    firstName: undefined, // Oracle CX Lead doesn't have separate first/last
    lastName: undefined,
    company: lead.AccountName,
    email: lead.EmailAddress,
    phone: lead.PhoneNumber,
    status: lead.StatusCode,
    rating: lead.RankCode,
    score: lead.Score,
    ownerId: lead.OwnerResourceId?.toString(),
    ownerName: lead.OwnerResourceName,
    createdAt: lead.CreationDate ? new Date(lead.CreationDate) : undefined,
    updatedAt: lead.LastUpdateDate ? new Date(lead.LastUpdateDate) : undefined,
    metadata: {
      leadNumber: lead.LeadNumber,
      contactId: lead.ContactId,
      contactName: lead.ContactName,
      accountId: lead.AccountId,
      description: lead.Description,
    },
  });

  private mapActivity = (activity: OracleCXActivity): Activity => ({
    id: activity.ActivityId?.toString() || activity.ActivityNumber,
    type: activity.ActivityType || 'General',
    subject: activity.ActivityName,
    description: activity.Description,
    status: activity.ActivityStatus,
    dueDate: activity.EndDate ? new Date(activity.EndDate) : undefined,
    relatedToId:
      activity.OptyId?.toString() ||
      activity.AccountId?.toString() ||
      activity.ContactId?.toString(),
    relatedToType: activity.OptyId
      ? 'opportunity'
      : activity.AccountId
        ? 'account'
        : activity.ContactId
          ? 'contact'
          : undefined,
    ownerId: activity.OwnerResourceId?.toString(),
    ownerName: activity.OwnerResourceName,
    createdAt: activity.CreationDate
      ? new Date(activity.CreationDate)
      : undefined,
    updatedAt: activity.LastUpdateDate
      ? new Date(activity.LastUpdateDate)
      : undefined,
    metadata: {
      activityNumber: activity.ActivityNumber,
      startDate: activity.StartDate,
      accountName: activity.AccountName,
      contactName: activity.ContactName,
      optyName: activity.OptyName,
    },
  });
}
