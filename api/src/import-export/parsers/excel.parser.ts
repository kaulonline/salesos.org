import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { FieldMappingDto, ImportEntityType, ImportError } from '../dto/import.dto';
import { CsvParser, ParsedRow } from './csv.parser';

@Injectable()
export class ExcelParser {
  private readonly logger = new Logger(ExcelParser.name);

  constructor(private readonly csvParser: CsvParser) {}

  /**
   * Parse Excel file and return headers and rows
   */
  parseContent(buffer: Buffer, sheetIndex = 0): { headers: string[]; rows: Record<string, any>[]; sheetNames: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      return { headers: [], rows: [], sheetNames: [] };
    }

    const sheetName = sheetNames[sheetIndex] || sheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return { headers: [], rows: [], sheetNames };
    }

    const headers = Object.keys(rows[0] as object);
    return { headers, rows: rows as Record<string, any>[], sheetNames };
  }

  /**
   * Parse Excel file and apply field mappings
   */
  parseWithMappings(
    buffer: Buffer,
    mappings: FieldMappingDto[],
    entityType: ImportEntityType,
    sheetIndex = 0,
  ): ParsedRow[] {
    const { rows } = this.parseContent(buffer, sheetIndex);
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

        // Validate based on field
        const error = this.validateField(value, mapping.targetField, i + 1);
        if (error) {
          errors.push(error);
        }

        mappedData[mapping.targetField] = value;
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
    // Delegate to CSV parser as the logic is the same
    return this.csvParser.suggestMappings(headers, entityType);
  }

  /**
   * Generate Excel file from records
   * SECURITY: Sanitizes values to prevent formula injection attacks
   */
  generateExcel(records: Record<string, any>[], fields?: string[]): Buffer {
    const headers = fields || (records.length > 0 ? Object.keys(records[0]) : []);

    const data = records.map(record => {
      const row: Record<string, any> = {};
      for (const header of headers) {
        const value = this.getNestedValue(record, header) ?? '';
        // SECURITY: Sanitize to prevent Excel formula injection
        row[header] = this.sanitizeFormulaInjection(value);
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = headers.map(header => ({
      wch: Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      ) + 2,
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Get available sheets in an Excel file
   */
  getSheetNames(buffer: Buffer): string[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames;
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

  private validateField(value: any, targetField: string, rowNumber: number): ImportError | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (targetField === 'email') {
      const email = String(value).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          row: rowNumber,
          field: targetField,
          message: `Invalid email format: ${value}`,
        };
      }
    }

    return null;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * SECURITY: Prevent Excel formula injection attacks
   * Excel can execute formulas starting with =, +, -, @, |, or tab
   * Prefixing with single quote (') treats the cell as text
   */
  private sanitizeFormulaInjection(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    // Characters that trigger formula interpretation in Excel
    const formulaPrefixes = ['=', '+', '-', '@', '\t', '\r', '|'];

    // If value starts with a formula trigger character, prefix with single quote
    if (formulaPrefixes.some(prefix => str.startsWith(prefix))) {
      return `'${str}`;
    }

    return str;
  }
}
