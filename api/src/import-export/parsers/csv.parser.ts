import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { FieldMappingDto, ImportEntityType, ImportError } from '../dto/import.dto';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: ImportError[];
}

@Injectable()
export class CsvParser {
  private readonly logger = new Logger(CsvParser.name);

  /**
   * Parse CSV content and return headers and rows
   */
  parseContent(content: string | Buffer): { headers: string[]; rows: Record<string, any>[] } {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (records.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = Object.keys(records[0]);
    return { headers, rows: records };
  }

  /**
   * Parse CSV file and apply field mappings
   */
  parseWithMappings(
    content: string | Buffer,
    mappings: FieldMappingDto[],
    entityType: ImportEntityType,
  ): ParsedRow[] {
    const { rows } = this.parseContent(content);
    const results: ParsedRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mappedData: Record<string, any> = {};
      const errors: ImportError[] = [];

      for (const mapping of mappings) {
        const sourceValue = row[mapping.sourceField];
        let value = sourceValue;

        // Apply transformations
        if (value !== undefined && value !== null && value !== '') {
          value = this.applyTransformation(value, mapping.transformation);
        } else if (mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        }

        // Validate and transform based on target field type
        const { transformedValue, error } = this.transformValue(
          value,
          mapping.targetField,
          entityType,
          i + 1,
        );

        if (error) {
          errors.push(error);
        }

        mappedData[mapping.targetField] = transformedValue;
      }

      results.push({
        rowNumber: i + 1,
        data: mappedData,
        errors,
      });
    }

    return results;
  }

  /**
   * Auto-detect field mappings based on header names
   */
  suggestMappings(headers: string[], entityType: ImportEntityType): FieldMappingDto[] {
    const targetFields = this.getTargetFields(entityType);
    const mappings: FieldMappingDto[] = [];

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');

      for (const target of targetFields) {
        const normalizedTarget = target.toLowerCase().replace(/[_\s-]/g, '');

        // Exact match
        if (normalizedHeader === normalizedTarget) {
          mappings.push({ sourceField: header, targetField: target });
          break;
        }

        // Common aliases
        const aliases = this.getFieldAliases(target);
        if (aliases.some(alias => normalizedHeader === alias.toLowerCase())) {
          mappings.push({ sourceField: header, targetField: target });
          break;
        }
      }
    }

    return mappings;
  }

  /**
   * Generate CSV content from records
   * SECURITY: Sanitizes values to prevent formula injection attacks
   */
  generateCsv(records: Record<string, any>[], fields?: string[]): string {
    if (records.length === 0) {
      return '';
    }

    const headers = fields || Object.keys(records[0]);

    const rows = records.map(record => {
      const row: Record<string, any> = {};
      for (const header of headers) {
        const value = this.getNestedValue(record, header) ?? '';
        // SECURITY: Sanitize to prevent CSV formula injection
        row[header] = this.sanitizeFormulaInjection(value);
      }
      return row;
    });

    return stringify(rows, {
      header: true,
      columns: headers,
    });
  }

  /**
   * SECURITY: Prevent CSV formula injection attacks
   * Excel/LibreOffice can execute formulas starting with =, +, -, @, |, or tab
   * Prefixing with single quote (') treats the cell as text
   */
  private sanitizeFormulaInjection(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    // Characters that trigger formula interpretation in spreadsheet apps
    const formulaPrefixes = ['=', '+', '-', '@', '\t', '\r', '|'];

    // If value starts with a formula trigger character, prefix with single quote
    if (formulaPrefixes.some(prefix => str.startsWith(prefix))) {
      return `'${str}`;
    }

    return str;
  }

  private applyTransformation(value: any, transformation?: string): any {
    if (!transformation || value === null || value === undefined) {
      return value;
    }

    switch (transformation.toLowerCase()) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      default:
        return value;
    }
  }

  private transformValue(
    value: any,
    targetField: string,
    entityType: ImportEntityType,
    rowNumber: number,
  ): { transformedValue: any; error?: ImportError } {
    if (value === null || value === undefined || value === '') {
      return { transformedValue: null };
    }

    // Field-specific transformations
    if (targetField.endsWith('Date') || targetField === 'closeDate') {
      const date = this.parseDate(value);
      if (!date) {
        return {
          transformedValue: null,
          error: {
            row: rowNumber,
            field: targetField,
            message: `Invalid date format: ${value}`,
          },
        };
      }
      return { transformedValue: date };
    }

    if (targetField === 'email') {
      const email = String(value).trim().toLowerCase();
      if (!this.isValidEmail(email)) {
        return {
          transformedValue: email,
          error: {
            row: rowNumber,
            field: targetField,
            message: `Invalid email format: ${value}`,
          },
        };
      }
      return { transformedValue: email };
    }

    if (targetField === 'phone' || targetField === 'mobilePhone') {
      return { transformedValue: this.normalizePhone(value) };
    }

    if (['amount', 'annualRevenue', 'probability', 'leadScore', 'numberOfEmployees'].includes(targetField)) {
      const num = this.parseNumber(value);
      if (num === null) {
        return {
          transformedValue: null,
          error: {
            row: rowNumber,
            field: targetField,
            message: `Invalid number format: ${value}`,
          },
        };
      }
      return { transformedValue: num };
    }

    if (targetField === 'status' || targetField === 'stage' || targetField === 'rating') {
      return { transformedValue: String(value).toUpperCase().replace(/\s+/g, '_') };
    }

    return { transformedValue: String(value).trim() };
  }

  private getTargetFields(entityType: ImportEntityType): string[] {
    switch (entityType) {
      case ImportEntityType.LEAD:
        return [
          'firstName', 'lastName', 'email', 'phone', 'company', 'title',
          'status', 'rating', 'leadSource', 'leadScore', 'industry',
          'website', 'address', 'city', 'state', 'country', 'postalCode',
        ];
      case ImportEntityType.CONTACT:
        return [
          'firstName', 'lastName', 'email', 'phone', 'mobilePhone',
          'title', 'department', 'accountId', 'mailingAddress',
        ];
      case ImportEntityType.ACCOUNT:
        return [
          'name', 'type', 'industry', 'phone', 'website', 'annualRevenue',
          'numberOfEmployees', 'billingAddress', 'billingCity', 'billingState',
          'billingCountry', 'billingPostalCode',
        ];
      case ImportEntityType.OPPORTUNITY:
        return [
          'name', 'accountId', 'stage', 'amount', 'probability',
          'closeDate', 'type', 'opportunitySource', 'nextStep',
        ];
      default:
        return [];
    }
  }

  private getFieldAliases(field: string): string[] {
    const aliases: Record<string, string[]> = {
      firstName: ['first_name', 'first', 'fname', 'givenname'],
      lastName: ['last_name', 'last', 'lname', 'surname', 'familyname'],
      email: ['emailaddress', 'email_address', 'mail'],
      phone: ['telephone', 'phonenumber', 'phone_number', 'tel'],
      mobilePhone: ['mobile', 'cell', 'cellphone', 'mobilephone'],
      company: ['organization', 'companyname', 'org'],
      title: ['jobtitle', 'position', 'role'],
      leadSource: ['source', 'leadsource', 'lead_source'],
      website: ['url', 'web', 'homepage'],
      annualRevenue: ['revenue', 'annual_revenue', 'yearlyrevenue'],
      numberOfEmployees: ['employees', 'employeecount', 'headcount'],
      closeDate: ['close_date', 'expectedclose', 'closingdate'],
    };

    return aliases[field] || [];
  }

  private parseDate(value: any): Date | null {
    if (value instanceof Date) {
      return value;
    }

    const str = String(value).trim();

    // Try ISO format first
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try common formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,   // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = str.match(format);
      if (match) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  private parseNumber(value: any): number | null {
    if (typeof value === 'number') {
      return value;
    }

    const str = String(value).trim().replace(/[$,]/g, '');
    const num = parseFloat(str);

    return isNaN(num) ? null : num;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private normalizePhone(value: any): string {
    return String(value).replace(/[^\d+()-\s]/g, '').trim();
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
