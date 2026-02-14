/**
 * CRM Template Type Definitions
 *
 * Defines the structure for CRM-specific import templates and field mappings.
 */

export type EntityType = 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY';

export type TransformFunction =
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'parse_date'
  | 'parse_currency'
  | 'parse_boolean'
  | 'parse_phone'
  | 'lookup_account'
  | 'map_stage'
  | 'map_status'
  | 'split_name';

/**
 * Defines mapping between a CRM field and SalesOS field
 */
export interface FieldMapping {
  crmField: string; // Field name in source CRM (e.g., "FirstName" for Salesforce)
  salesosField: string; // Field name in SalesOS database
  aliases: string[]; // Alternative field names that should map to this field
  required: boolean; // Whether this field is required for import
  defaultValue?: any; // Default value if not provided
  transform?: TransformFunction; // Transformation to apply to the value
  description?: string; // Human-readable description of the field
}

/**
 * Special handling instructions for CRM-specific data formats
 */
export interface SpecialHandling {
  booleanFormat?: 'true/false' | '1/0' | 'Yes/No' | 'TRUE/FALSE' | 'yes/no';
  currencySymbol?: string; // e.g., "$", "€", "£"
  phoneFormat?: string; // e.g., "(XXX) XXX-XXXX", "+1-XXX-XXX-XXXX"
  dateFormat?: string[]; // e.g., ["MM/DD/YYYY", "YYYY-MM-DD"]
  timeZone?: string; // e.g., "America/New_York"
}

/**
 * Complete CRM template definition
 */
export interface CRMTemplate {
  name: string; // Display name (e.g., "Salesforce")
  code: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'monday'; // Unique identifier
  exportFields: {
    leads: FieldMapping[];
    contacts: FieldMapping[];
    accounts: FieldMapping[];
    opportunities: FieldMapping[];
  };
  csvDelimiter: string; // Usually ","
  hasHeader: boolean; // Whether CSV has header row
  specialHandling: SpecialHandling;
  notes?: string; // Additional notes about this CRM's export format
}

/**
 * AI field mapping suggestion with confidence score
 */
export interface FieldMappingSuggestion {
  csvColumn: string; // Column name from uploaded CSV
  suggestedField: string; // Suggested SalesOS field
  confidence: number; // 0-100 confidence score
  reasoning: string; // Why this mapping was suggested
  transform?: TransformFunction; // Recommended transformation
  isRequired: boolean; // Whether this field is required
}

/**
 * CRM detection result
 */
export interface CRMDetection {
  crm: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'monday' | 'unknown';
  confidence: number; // 0-100 confidence score
  reasoning: string; // Why this CRM was detected
}

/**
 * Migration field mapping (used during import)
 */
export interface MigrationFieldMapping {
  csvColumn: string; // Column name in uploaded CSV
  salesosField: string; // Field to map to in SalesOS
  transform?: TransformFunction; // Transformation to apply
  defaultValue?: any; // Default value if CSV column is empty
}

/**
 * Migration import result
 */
export interface MigrationImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: MigrationError[];
}

/**
 * Individual migration error
 */
export interface MigrationError {
  row: number; // Row number in CSV (1-indexed)
  field?: string; // Field that caused the error
  value?: any; // Value that caused the error
  error: string; // Error message
}
