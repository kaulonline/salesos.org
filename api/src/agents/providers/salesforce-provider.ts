import { Injectable, Logger } from '@nestjs/common';
import { SalesforceService } from '../../salesforce/salesforce.service';
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

/**
 * Salesforce Data Provider
 *
 * Implements the CRMDataProvider interface for Salesforce,
 * using SOQL queries via the SalesforceService.
 */
@Injectable()
export class SalesforceProvider implements CRMDataProvider {
  readonly providerName = 'salesforce';
  private readonly logger = new Logger(SalesforceProvider.name);

  constructor(private readonly salesforceService: SalesforceService) {}

  // ==================== CONNECTION ====================

  async isConnected(userId: string): Promise<boolean> {
    const status = await this.salesforceService.getConnectionStatus(userId);
    return status.connected;
  }

  async getConnectionInfo(userId: string): Promise<{
    connected: boolean;
    instanceUrl?: string;
    displayName?: string;
    orgId?: string;
  }> {
    const status = await this.salesforceService.getConnectionStatus(userId);
    return {
      connected: status.connected,
      instanceUrl: status.connection?.instanceUrl,
      displayName: status.connection?.displayName || status.connection?.username,
      orgId: status.connection?.orgId,
    };
  }

  // ==================== OPPORTUNITIES ====================

  async getOpportunities(
    userId: string,
    filters?: OpportunityFilters,
  ): Promise<QueryResult<Opportunity>> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const conditions: string[] = [];

    if (filters?.stage) conditions.push(`StageName = '${this.escapeSoql(filters.stage)}'`);
    if (filters?.status) conditions.push(`Status = '${this.escapeSoql(filters.status)}'`);
    if (filters?.minAmount) conditions.push(`Amount >= ${filters.minAmount}`);
    if (filters?.maxAmount) conditions.push(`Amount <= ${filters.maxAmount}`);
    if (filters?.ownerId) conditions.push(`OwnerId = '${this.escapeSoql(filters.ownerId)}'`);
    if (filters?.accountId) conditions.push(`AccountId = '${this.escapeSoql(filters.accountId)}'`);
    if (filters?.closeDateFrom) conditions.push(`CloseDate >= ${filters.closeDateFrom.toISOString().split('T')[0]}`);
    if (filters?.closeDateTo) conditions.push(`CloseDate <= ${filters.closeDateTo.toISOString().split('T')[0]}`);
    if (filters?.search) conditions.push(`Name LIKE '%${this.escapeSoql(filters.search)}%'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const soql = `SELECT Id, Name, Amount, StageName, Probability, CloseDate, AccountId, Account.Name, OwnerId, Owner.Name, Description, CreatedDate, LastModifiedDate FROM Opportunity ${whereClause} ORDER BY CloseDate DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.salesforceService.query(userId, soql);
    return {
      items: (result.records || []).map(this.mapOpportunity),
      totalCount: result.totalSize || 0,
      hasMore: !result.done,
      offset,
      limit,
    };
  }

  async getOpportunityDetails(
    userId: string,
    opportunityId: string,
  ): Promise<OpportunityDetails | null> {
    try {
      const record = await this.salesforceService.getSingleRecord(userId, 'Opportunity', opportunityId);
      if (!record) return null;

      // Get related activities
      const activitiesResult = await this.salesforceService.query(
        userId,
        `SELECT Id, Subject, ActivityDate, Status, Priority, Type, Description, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Task WHERE WhatId = '${this.escapeSoql(opportunityId)}' ORDER BY CreatedDate DESC LIMIT 20`,
      );

      return {
        ...this.mapOpportunity(record),
        activities: (activitiesResult.records || []).map(this.mapActivity),
      };
    } catch (err) {
      this.logger.error(`Failed to get opportunity details: ${err.message}`);
      return null;
    }
  }

  async updateOpportunity(
    userId: string,
    opportunityId: string,
    data: Partial<Opportunity>,
  ): Promise<void> {
    const updateData: Record<string, any> = {};

    if (data.name) updateData.Name = data.name;
    if (data.amount !== undefined) updateData.Amount = data.amount;
    if (data.stage) updateData.StageName = data.stage;
    if (data.probability !== undefined) updateData.Probability = data.probability;
    if (data.closeDate) updateData.CloseDate = data.closeDate.toISOString().split('T')[0];
    if (data.description) updateData.Description = data.description;

    await this.salesforceService.update(userId, 'Opportunity', opportunityId, updateData);
  }

  // ==================== ACCOUNTS ====================

  async getAccounts(
    userId: string,
    filters?: AccountFilters,
  ): Promise<QueryResult<Account>> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const conditions: string[] = [];

    if (filters?.industry) conditions.push(`Industry = '${this.escapeSoql(filters.industry)}'`);
    if (filters?.type) conditions.push(`Type = '${this.escapeSoql(filters.type)}'`);
    if (filters?.ownerId) conditions.push(`OwnerId = '${this.escapeSoql(filters.ownerId)}'`);
    if (filters?.search) conditions.push(`Name LIKE '%${this.escapeSoql(filters.search)}%'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const soql = `SELECT Id, Name, Industry, Type, Website, Phone, AnnualRevenue, NumberOfEmployees, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Account ${whereClause} ORDER BY Name ASC LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.salesforceService.query(userId, soql);
    return {
      items: (result.records || []).map(this.mapAccount),
      totalCount: result.totalSize || 0,
      hasMore: !result.done,
      offset,
      limit,
    };
  }

  async getAccountDetails(
    userId: string,
    accountId: string,
  ): Promise<AccountDetails | null> {
    try {
      const record = await this.salesforceService.getSingleRecord(userId, 'Account', accountId);
      if (!record) return null;

      const [contactsResult, opptysResult, activitiesResult] = await Promise.all([
        this.salesforceService.query(
          userId,
          `SELECT Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Title, AccountId, Account.Name, OwnerId, CreatedDate, LastModifiedDate FROM Contact WHERE AccountId = '${this.escapeSoql(accountId)}' LIMIT 20`,
        ),
        this.salesforceService.query(
          userId,
          `SELECT Id, Name, Amount, StageName, Probability, CloseDate, AccountId, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Opportunity WHERE AccountId = '${this.escapeSoql(accountId)}' ORDER BY CloseDate DESC LIMIT 20`,
        ),
        this.salesforceService.query(
          userId,
          `SELECT Id, Subject, ActivityDate, Status, Priority, Type, Description, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Task WHERE AccountId = '${this.escapeSoql(accountId)}' ORDER BY CreatedDate DESC LIMIT 20`,
        ),
      ]);

      return {
        ...this.mapAccount(record),
        contacts: (contactsResult.records || []).map(this.mapContact),
        opportunities: (opptysResult.records || []).map(this.mapOpportunity),
        activities: (activitiesResult.records || []).map(this.mapActivity),
      };
    } catch (err) {
      this.logger.error(`Failed to get account details: ${err.message}`);
      return null;
    }
  }

  // ==================== CONTACTS ====================

  async getContacts(
    userId: string,
    filters?: ContactFilters,
  ): Promise<QueryResult<Contact>> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const conditions: string[] = [];

    if (filters?.accountId) conditions.push(`AccountId = '${this.escapeSoql(filters.accountId)}'`);
    if (filters?.ownerId) conditions.push(`OwnerId = '${this.escapeSoql(filters.ownerId)}'`);
    if (filters?.search) conditions.push(`Name LIKE '%${this.escapeSoql(filters.search)}%'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Title, AccountId, Account.Name, OwnerId, CreatedDate, LastModifiedDate FROM Contact ${whereClause} ORDER BY Name ASC LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.salesforceService.query(userId, soql);
    return {
      items: (result.records || []).map(this.mapContact),
      totalCount: result.totalSize || 0,
      hasMore: !result.done,
      offset,
      limit,
    };
  }

  // ==================== LEADS ====================

  async getLeads(
    userId: string,
    filters?: LeadFilters,
  ): Promise<QueryResult<Lead>> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const conditions: string[] = [];

    if (filters?.status) conditions.push(`Status = '${this.escapeSoql(filters.status)}'`);
    if (filters?.rating) conditions.push(`Rating = '${this.escapeSoql(filters.rating)}'`);
    if (filters?.source) conditions.push(`LeadSource = '${this.escapeSoql(filters.source)}'`);
    if (filters?.ownerId) conditions.push(`OwnerId = '${this.escapeSoql(filters.ownerId)}'`);
    if (filters?.search) conditions.push(`Name LIKE '%${this.escapeSoql(filters.search)}%'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const soql = `SELECT Id, FirstName, LastName, Name, Company, Email, Phone, Status, Rating, LeadSource, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Lead ${whereClause} ORDER BY CreatedDate DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.salesforceService.query(userId, soql);
    return {
      items: (result.records || []).map(this.mapLead),
      totalCount: result.totalSize || 0,
      hasMore: !result.done,
      offset,
      limit,
    };
  }

  // ==================== ACTIVITIES ====================

  async getActivities(
    userId: string,
    entityId: string,
    entityType: 'opportunity' | 'account' | 'contact' | 'lead',
    filters?: ActivityFilters,
  ): Promise<QueryResult<Activity>> {
    const limit = filters?.limit || 50;
    const fieldName = entityType === 'contact' || entityType === 'lead' ? 'WhoId' : 'WhatId';

    const soql = `SELECT Id, Subject, ActivityDate, Status, Priority, Type, Description, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Task WHERE ${fieldName} = '${this.escapeSoql(entityId)}' ORDER BY CreatedDate DESC LIMIT ${limit}`;

    const result = await this.salesforceService.query(userId, soql);
    return {
      items: (result.records || []).map(this.mapActivity),
      totalCount: result.totalSize || 0,
      hasMore: !result.done,
      offset: 0,
      limit,
    };
  }

  // ==================== TASKS ====================

  async createTask(userId: string, task: TaskInput): Promise<Task> {
    const taskData: Record<string, any> = {
      Subject: task.subject,
      Description: task.description,
      Status: task.status || 'Not Started',
      Priority: task.priority || 'Normal',
    };

    if (task.dueDate) {
      taskData.ActivityDate = task.dueDate.toISOString().split('T')[0];
    }
    if (task.assigneeId) {
      taskData.OwnerId = task.assigneeId;
    }
    if (task.relatedToId && task.relatedToType) {
      const fieldName = task.relatedToType === 'contact' || task.relatedToType === 'lead' ? 'WhoId' : 'WhatId';
      taskData[fieldName] = task.relatedToId;
    }

    const result = await this.salesforceService.create(userId, 'Task', taskData);
    return {
      id: result.id,
      subject: task.subject,
      description: task.description,
      status: task.status || 'Not Started',
      priority: task.priority || 'Normal',
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

    if (data.subject) updateData.Subject = data.subject;
    if (data.description) updateData.Description = data.description;
    if (data.status) updateData.Status = data.status;
    if (data.priority) updateData.Priority = data.priority;
    if (data.dueDate) updateData.ActivityDate = data.dueDate.toISOString().split('T')[0];

    await this.salesforceService.update(userId, 'Task', taskId, updateData);
  }

  // ==================== NOTES ====================

  async createNote(userId: string, note: NoteInput): Promise<Note> {
    const noteData: Record<string, any> = {
      Title: note.title || 'Note',
      Body: note.body,
    };

    if (note.relatedToId) {
      noteData.ParentId = note.relatedToId;
    }

    const result = await this.salesforceService.create(userId, 'Note', noteData);
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

  private mapOpportunity = (record: any): Opportunity => ({
    id: record.Id,
    name: record.Name,
    amount: record.Amount,
    stage: record.StageName,
    probability: record.Probability,
    closeDate: record.CloseDate ? new Date(record.CloseDate) : undefined,
    accountId: record.AccountId,
    accountName: record.Account?.Name,
    ownerId: record.OwnerId,
    ownerName: record.Owner?.Name,
    description: record.Description,
    createdAt: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
    updatedAt: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined,
  });

  private mapAccount = (record: any): Account => ({
    id: record.Id,
    name: record.Name,
    industry: record.Industry,
    type: record.Type,
    website: record.Website,
    phone: record.Phone,
    annualRevenue: record.AnnualRevenue,
    employeeCount: record.NumberOfEmployees,
    address: {
      street: record.BillingStreet,
      city: record.BillingCity,
      state: record.BillingState,
      postalCode: record.BillingPostalCode,
      country: record.BillingCountry,
    },
    ownerId: record.OwnerId,
    ownerName: record.Owner?.Name,
    createdAt: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
    updatedAt: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined,
  });

  private mapContact = (record: any): Contact => ({
    id: record.Id,
    firstName: record.FirstName,
    lastName: record.LastName,
    name: record.Name,
    email: record.Email,
    phone: record.Phone,
    mobile: record.MobilePhone,
    title: record.Title,
    accountId: record.AccountId,
    accountName: record.Account?.Name,
    ownerId: record.OwnerId,
    createdAt: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
    updatedAt: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined,
  });

  private mapLead = (record: any): Lead => ({
    id: record.Id,
    name: record.Name,
    firstName: record.FirstName,
    lastName: record.LastName,
    company: record.Company,
    email: record.Email,
    phone: record.Phone,
    status: record.Status,
    rating: record.Rating,
    source: record.LeadSource,
    ownerId: record.OwnerId,
    ownerName: record.Owner?.Name,
    createdAt: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
    updatedAt: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined,
  });

  private mapActivity = (record: any): Activity => ({
    id: record.Id,
    type: record.Type || 'Task',
    subject: record.Subject,
    description: record.Description,
    status: record.Status,
    dueDate: record.ActivityDate ? new Date(record.ActivityDate) : undefined,
    relatedToId: record.WhatId || record.WhoId,
    ownerId: record.OwnerId,
    ownerName: record.Owner?.Name,
    createdAt: record.CreatedDate ? new Date(record.CreatedDate) : undefined,
    updatedAt: record.LastModifiedDate ? new Date(record.LastModifiedDate) : undefined,
  });

  /**
   * Escape a value for safe use in SOQL queries
   */
  private escapeSoql(value: string): string {
    if (!value) return '';
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
