import { Injectable, Logger } from '@nestjs/common';
import { TransformFunction } from './templates';

/**
 * Data Transformation Service
 *
 * Applies CRM-specific data transformations during import.
 */
@Injectable()
export class DataTransformationService {
  private readonly logger = new Logger(DataTransformationService.name);

  /**
   * Apply a transformation function to a value
   *
   * @param value - The value to transform
   * @param transform - The transformation function name
   * @returns Transformed value
   */
  applyTransform(value: any, transform?: TransformFunction): any {
    if (!transform || value === null || value === undefined || value === '') {
      return value;
    }

    try {
      switch (transform) {
        case 'uppercase':
          return typeof value === 'string' ? value.toUpperCase() : value;

        case 'lowercase':
          return typeof value === 'string' ? value.toLowerCase() : value;

        case 'trim':
          return typeof value === 'string' ? value.trim() : value;

        case 'parse_date':
          return this.parseDate(value);

        case 'parse_currency':
          return this.parseCurrency(value);

        case 'parse_boolean':
          return this.parseBoolean(value);

        case 'parse_phone':
          return this.parsePhone(value);

        case 'split_name':
          return this.splitName(value);

        case 'lookup_account':
          // This requires async database lookup, handled separately
          return value;

        case 'map_stage':
          return this.mapStage(value);

        case 'map_status':
          return this.mapStatus(value);

        default:
          this.logger.warn(`Unknown transform function: ${transform}`);
          return value;
      }
    } catch (error) {
      this.logger.warn(`Transform ${transform} failed for value "${value}": ${error.message}`);
      return value; // Return original value if transform fails
    }
  }

  /**
   * Parse date from various formats
   */
  private parseDate(value: any): Date | null {
    if (!value) return null;

    // If already a Date object
    if (value instanceof Date) {
      return value;
    }

    // Try to parse string
    if (typeof value === 'string') {
      // Remove any leading/trailing whitespace
      value = value.trim();

      // Try ISO format first
      let date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // Try common formats
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
        /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or DD-MM-YYYY
        /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY (European)
      ];

      for (const format of formats) {
        const match = value.match(format);
        if (match) {
          // Parse based on likely format
          if (format.source.includes('\\.')) {
            // DD.MM.YYYY
            date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          } else if (format.source.startsWith('^\\(\\d\\{4\\}')) {
            // YYYY-MM-DD
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else {
            // MM/DD/YYYY (US format)
            date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
          }

          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    // Try numeric timestamp
    if (typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  /**
   * Parse currency values
   */
  private parseCurrency(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // If already a number
    if (typeof value === 'number') {
      return value;
    }

    // Parse string
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and whitespace
      const cleaned = value
        .replace(/[$€£¥₹,\s]/g, '')
        .trim();

      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  /**
   * Parse boolean values from various formats
   */
  private parseBoolean(value: any): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Already a boolean
    if (typeof value === 'boolean') {
      return value;
    }

    // Parse string
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === 'yes' || lower === '1' || lower === 'y' || lower === 'on') {
        return true;
      }
      if (lower === 'false' || lower === 'no' || lower === '0' || lower === 'n' || lower === 'off') {
        return false;
      }
    }

    // Parse number
    if (typeof value === 'number') {
      return value !== 0;
    }

    return null;
  }

  /**
   * Parse and format phone numbers
   */
  private parsePhone(value: any): string | null {
    if (!value) return null;

    if (typeof value !== 'string') {
      value = String(value);
    }

    // Remove all non-numeric characters except + at start
    const cleaned = value.replace(/[^\d+]/g, '');

    // Basic validation: should have at least 10 digits
    const digitsOnly = cleaned.replace(/\+/g, '');
    if (digitsOnly.length < 10) {
      return value; // Return original if too short
    }

    return cleaned;
  }

  /**
   * Split full name into first and last name
   */
  private splitName(value: any): { firstName: string; lastName: string } | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0) {
      return null;
    }

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        lastName: '',
      };
    }

    // First word is first name, rest is last name
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  /**
   * Map CRM-specific stage names to SalesOS stages
   */
  private mapStage(value: any): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    const stageMappings: Record<string, string> = {
      // Salesforce
      'Prospecting': 'PROSPECTING',
      'Qualification': 'QUALIFICATION',
      'Needs Analysis': 'NEEDS_ANALYSIS',
      'Value Proposition': 'PROPOSAL',
      'Id. Decision Makers': 'QUALIFICATION',
      'Perception Analysis': 'PROPOSAL',
      'Proposal/Price Quote': 'PROPOSAL',
      'Negotiation/Review': 'NEGOTIATION',
      'Closed Won': 'CLOSED_WON',
      'Closed Lost': 'CLOSED_LOST',

      // HubSpot
      'Appointment Scheduled': 'QUALIFICATION',
      'Qualified to Buy': 'QUALIFICATION',
      'Presentation Scheduled': 'PROPOSAL',
      'Decision Maker Bought-In': 'NEGOTIATION',
      'Contract Sent': 'NEGOTIATION',

      // Pipedrive
      'Lead In': 'PROSPECTING',
      'Contact Made': 'QUALIFICATION',
      'Demo Scheduled': 'PROPOSAL',
      'Proposal Made': 'PROPOSAL',
      'Negotiations Started': 'NEGOTIATION',
      'Won': 'CLOSED_WON',
      'Lost': 'CLOSED_LOST',

      // Monday.com
      'New': 'PROSPECTING',
      'Contacted': 'QUALIFICATION',
      'Proposal': 'PROPOSAL',
      'Negotiation': 'NEGOTIATION',
    };

    return stageMappings[value] || value.toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Map CRM-specific status names to SalesOS statuses
   */
  private mapStatus(value: any): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    const statusMappings: Record<string, string> = {
      // Common lead statuses
      'New': 'NEW',
      'Open': 'OPEN',
      'Open - Not Contacted': 'NEW',
      'Working': 'WORKING',
      'Working - Contacted': 'CONTACTED',
      'Contacted': 'CONTACTED',
      'Nurturing': 'NURTURING',
      'Qualified': 'QUALIFIED',
      'Unqualified': 'UNQUALIFIED',
      'Converted': 'CONVERTED',
      'Bad Timing': 'NURTURING',
      'Lost': 'LOST',
      'Junk Lead': 'UNQUALIFIED',

      // HubSpot lifecycle stages
      'Subscriber': 'NEW',
      'Lead': 'OPEN',
      'Marketing Qualified Lead': 'QUALIFIED',
      'Sales Qualified Lead': 'QUALIFIED',
      'Opportunity': 'WORKING',
      'Customer': 'CONVERTED',
      'Evangelist': 'CONVERTED',
      'Other': 'OPEN',
    };

    return statusMappings[value] || value.toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Apply multiple transformations to a record
   *
   * @param data - The record data
   * @param mappings - Field mappings with transformations
   * @returns Transformed data
   */
  transformRecord(
    data: Record<string, any>,
    mappings: Array<{ csvColumn: string; salesosField: string; transform?: TransformFunction }>,
  ): Record<string, any> {
    const transformed: Record<string, any> = {};

    for (const mapping of mappings) {
      const value = data[mapping.csvColumn];

      // Apply transformation if specified
      let transformedValue = this.applyTransform(value, mapping.transform);

      // Handle split_name specially (it returns an object)
      if (mapping.transform === 'split_name' && transformedValue) {
        const { firstName, lastName } = transformedValue;
        transformed.firstName = firstName;
        transformed.lastName = lastName;
      } else {
        transformed[mapping.salesosField] = transformedValue;
      }
    }

    return transformed;
  }

  /**
   * Validate required fields based on entity type
   */
  validateRequiredFields(
    data: Record<string, any>,
    entityType: 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY',
  ): { valid: boolean; missingFields: string[] } {
    const requiredFields: Record<string, string[]> = {
      LEAD: ['firstName', 'lastName'],
      CONTACT: ['firstName', 'lastName'],
      ACCOUNT: ['name'],
      OPPORTUNITY: ['name', 'stage', 'closeDate'],
    };

    const required = requiredFields[entityType] || [];
    const missingFields = required.filter(field => !data[field] || data[field] === '');

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
}
