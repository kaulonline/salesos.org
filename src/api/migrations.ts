/**
 * Migration API Client
 *
 * API functions for CRM migration operations.
 */

const API_BASE = '/api/import-export';

export type EntityType = 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY';
export type SupportedCRM = 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'monday';
export type MigrationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface FieldMapping {
  crmField: string;
  salesosField: string;
  aliases: string[];
  required: boolean;
  defaultValue?: any;
  transform?: string;
  description?: string;
}

export interface CRMTemplate {
  name: string;
  code: SupportedCRM;
  exportFields: {
    leads: FieldMapping[];
    contacts: FieldMapping[];
    accounts: FieldMapping[];
    opportunities: FieldMapping[];
  };
  csvDelimiter: string;
  hasHeader: boolean;
  specialHandling: {
    booleanFormat?: string;
    currencySymbol?: string;
    phoneFormat?: string;
    dateFormat?: string[];
    timeZone?: string;
  };
  notes?: string;
}

export interface FieldMappingSuggestion {
  csvColumn: string;
  suggestedField: string;
  confidence: number;
  reasoning: string;
  transform?: string;
  isRequired: boolean;
}

export interface CRMDetection {
  crm: SupportedCRM | 'unknown';
  confidence: number;
  reasoning: string;
}

export interface MigrationFieldMapping {
  csvColumn: string;
  salesosField: string;
  transform?: string;
  defaultValue?: any;
}

export interface Migration {
  id: string;
  organizationId: string;
  userId: string;
  sourceCRM: string;
  entityType: string;
  status: MigrationStatus;
  fileName: string;
  fileSize: number;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: any[] | null;
  fieldMappings: MigrationFieldMapping[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MigrationHistory {
  migrations: Migration[];
  total: number;
  limit: number;
  offset: number;
}

export interface MigrationStats {
  totalMigrations: number;
  completed: number;
  inProgress: number;
  failed: number;
  totalRecordsImported: number;
  totalRecordsFailed: number;
  bySourceCRM: Record<string, number>;
  byEntityType: Record<string, number>;
}

/**
 * Get CRM template for field mappings
 */
export async function getCRMTemplate(
  crmType: SupportedCRM,
  entityType: EntityType,
): Promise<CRMTemplate> {
  const response = await fetch(
    `${API_BASE}/crm-template/${crmType}/${entityType}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch CRM template');
  }

  return response.json();
}

/**
 * Get AI-powered field mapping suggestions
 */
export async function suggestFieldMappings(
  headers: string[],
  entityType: EntityType,
  crmType?: SupportedCRM,
): Promise<FieldMappingSuggestion[]> {
  const response = await fetch(`${API_BASE}/suggest-mappings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ headers, entityType, crmType }),
  });

  if (!response.ok) {
    throw new Error('Failed to get field mapping suggestions');
  }

  return response.json();
}

/**
 * Detect CRM type from CSV headers
 */
export async function detectCRMType(
  headers: string[],
): Promise<CRMDetection> {
  const response = await fetch(`${API_BASE}/detect-crm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ headers }),
  });

  if (!response.ok) {
    throw new Error('Failed to detect CRM type');
  }

  return response.json();
}

/**
 * Create a new migration job
 */
export async function createMigration(data: {
  sourceCRM: string;
  entityType: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  fieldMappings: MigrationFieldMapping[];
}): Promise<Migration> {
  const response = await fetch(`${API_BASE}/migrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create migration');
  }

  return response.json();
}

/**
 * Get migration status and progress
 */
export async function getMigrationStatus(
  migrationId: string,
): Promise<Migration> {
  const response = await fetch(`${API_BASE}/migrations/${migrationId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch migration status');
  }

  return response.json();
}

/**
 * Get migration history
 */
export async function getMigrationHistory(filters?: {
  sourceCRM?: string;
  entityType?: string;
  status?: MigrationStatus;
  limit?: number;
  offset?: number;
}): Promise<MigrationHistory> {
  const params = new URLSearchParams();

  if (filters?.sourceCRM) params.append('sourceCRM', filters.sourceCRM);
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await fetch(`${API_BASE}/migrations?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch migration history');
  }

  return response.json();
}

/**
 * Get migration statistics
 */
export async function getMigrationStats(): Promise<MigrationStats> {
  const response = await fetch(`${API_BASE}/migrations/stats`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch migration stats');
  }

  return response.json();
}

/**
 * Delete a migration record
 */
export async function deleteMigration(
  migrationId: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/migrations/${migrationId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete migration');
  }

  return response.json();
}

/**
 * Cancel an in-progress migration
 */
export async function cancelMigration(
  migrationId: string,
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE}/migrations/${migrationId}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to cancel migration');
  }

  return response.json();
}

/**
 * Download CRM-specific template CSV
 */
export function downloadCRMTemplate(
  crmType: SupportedCRM,
  entityType: EntityType,
): void {
  const url = `${API_BASE}/crm-template-download/${crmType}/${entityType}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `${crmType}-${entityType}-template.csv`;
  link.click();
}
