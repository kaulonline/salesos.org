/**
 * CRM Data Provider Interface
 *
 * Provides a unified interface for CRM data access across different providers
 * (Salesforce, Oracle CX, Local database, etc.)
 */

// ==================== COMMON TYPES ====================

export interface Opportunity {
  id: string;
  name: string;
  amount?: number;
  stage?: string;
  probability?: number;
  closeDate?: Date;
  accountId?: string;
  accountName?: string;
  ownerId?: string;
  ownerName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  status?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface OpportunityDetails extends Opportunity {
  contacts?: Contact[];
  activities?: Activity[];
  notes?: Note[];
  customFields?: Record<string, any>;
}

export interface Account {
  id: string;
  name: string;
  industry?: string;
  type?: string;
  website?: string;
  phone?: string;
  annualRevenue?: number;
  employeeCount?: number;
  address?: Address;
  ownerId?: string;
  ownerName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AccountDetails extends Account {
  contacts?: Contact[];
  opportunities?: Opportunity[];
  activities?: Activity[];
  notes?: Note[];
}

export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  accountId?: string;
  accountName?: string;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Lead {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  status?: string;
  rating?: string;
  score?: number;
  source?: string;
  ownerId?: string;
  ownerName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Activity {
  id: string;
  type: string;
  subject?: string;
  description?: string;
  status?: string;
  dueDate?: Date;
  completedDate?: Date;
  relatedToId?: string;
  relatedToType?: string;
  ownerId?: string;
  ownerName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  relatedToId?: string;
  relatedToType?: string;
  ownerId?: string;
  assigneeId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Note {
  id: string;
  title?: string;
  body: string;
  relatedToId?: string;
  relatedToType?: string;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ==================== FILTER TYPES ====================

export interface OpportunityFilters {
  stage?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  ownerId?: string;
  accountId?: string;
  closeDateFrom?: Date;
  closeDateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AccountFilters {
  industry?: string;
  type?: string;
  ownerId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ContactFilters {
  accountId?: string;
  ownerId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LeadFilters {
  status?: string;
  rating?: string;
  source?: string;
  ownerId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityFilters {
  type?: string;
  status?: string;
  relatedToId?: string;
  relatedToType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

// ==================== INPUT TYPES ====================

export interface TaskInput {
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  relatedToId?: string;
  relatedToType?: string;
  assigneeId?: string;
}

export interface NoteInput {
  title?: string;
  body: string;
  relatedToId?: string;
  relatedToType?: string;
}

export interface ActivityInput {
  type: string;
  subject?: string;
  description?: string;
  status?: string;
  dueDate?: Date;
  relatedToId?: string;
  relatedToType?: string;
}

// ==================== RESULT TYPES ====================

export interface QueryResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  offset?: number;
  limit?: number;
}

// ==================== PROVIDER INTERFACE ====================

/**
 * CRM Data Provider Interface
 *
 * Implement this interface for each CRM provider to enable unified
 * data access across different CRM systems.
 */
export interface CRMDataProvider {
  /**
   * The name of the CRM provider (e.g., 'salesforce', 'oracle_cx', 'local')
   */
  readonly providerName: string;

  /**
   * Check if the provider is connected for the given user
   */
  isConnected(userId: string): Promise<boolean>;

  /**
   * Get provider-specific connection info
   */
  getConnectionInfo(userId: string): Promise<{
    connected: boolean;
    instanceUrl?: string;
    displayName?: string;
    orgId?: string;
  }>;

  // ==================== OPPORTUNITIES ====================

  /**
   * Get opportunities with optional filters
   */
  getOpportunities(
    userId: string,
    filters?: OpportunityFilters,
  ): Promise<QueryResult<Opportunity>>;

  /**
   * Get detailed opportunity by ID
   */
  getOpportunityDetails(
    userId: string,
    opportunityId: string,
  ): Promise<OpportunityDetails | null>;

  /**
   * Update an opportunity
   */
  updateOpportunity(
    userId: string,
    opportunityId: string,
    data: Partial<Opportunity>,
  ): Promise<void>;

  // ==================== ACCOUNTS ====================

  /**
   * Get accounts with optional filters
   */
  getAccounts(
    userId: string,
    filters?: AccountFilters,
  ): Promise<QueryResult<Account>>;

  /**
   * Get detailed account by ID
   */
  getAccountDetails(
    userId: string,
    accountId: string,
  ): Promise<AccountDetails | null>;

  // ==================== CONTACTS ====================

  /**
   * Get contacts with optional filters
   */
  getContacts(
    userId: string,
    filters?: ContactFilters,
  ): Promise<QueryResult<Contact>>;

  // ==================== LEADS ====================

  /**
   * Get leads with optional filters
   */
  getLeads(userId: string, filters?: LeadFilters): Promise<QueryResult<Lead>>;

  // ==================== ACTIVITIES ====================

  /**
   * Get activities for an entity
   */
  getActivities(
    userId: string,
    entityId: string,
    entityType: 'opportunity' | 'account' | 'contact' | 'lead',
    filters?: ActivityFilters,
  ): Promise<QueryResult<Activity>>;

  // ==================== TASKS ====================

  /**
   * Create a new task
   */
  createTask(userId: string, task: TaskInput): Promise<Task>;

  /**
   * Update task status
   */
  updateTask(
    userId: string,
    taskId: string,
    data: Partial<Task>,
  ): Promise<void>;

  // ==================== NOTES ====================

  /**
   * Create a note
   */
  createNote(userId: string, note: NoteInput): Promise<Note>;
}

/**
 * Type for the CRM provider name
 */
export type CRMProviderType = 'salesforce' | 'oracle_cx' | 'local';
