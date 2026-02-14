import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { getCRMTemplate } from './templates';
import { EntityType } from './templates/types';

@Injectable()
export class TemplateGeneratorService {
  // SalesOS Brand Colors
  private readonly BRAND_COLORS = {
    primary: 'EAD07D', // Gold
    dark: '1A1A1A', // Dark
    background: 'F2F1EA', // Warm beige
    lightSurface: 'F0EBD8', // Light surface
    text: '666666', // Muted text
  };

  /**
   * Generate a professional, branded XLSX template
   */
  async generateTemplate(crmType: string, entityType: string): Promise<Buffer> {
    const template = getCRMTemplate(crmType, entityType.toUpperCase() as EntityType);

    if (!template) {
      throw new Error(`Template not found for ${crmType} ${entityType}`);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SalesOS';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Sheet 1: Instructions
    await this.createInstructionsSheet(workbook, crmType, entityType, template.name);

    // Sheet 2: Data Template
    await this.createDataSheet(workbook, crmType, entityType, template);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Create the instructions sheet with branding and guidance
   */
  private async createInstructionsSheet(
    workbook: ExcelJS.Workbook,
    crmType: string,
    entityType: string,
    crmName: string,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('📋 Instructions', {
      properties: { tabColor: { argb: this.BRAND_COLORS.primary } },
    });

    // Set column widths
    sheet.columns = [
      { width: 5 },
      { width: 70 },
    ];

    let row = 1;

    // Title
    const titleCell = sheet.getCell(`B${row}`);
    titleCell.value = `${crmName} ${this.capitalize(entityType)} Import Template`;
    titleCell.font = { size: 20, bold: true, color: { argb: this.BRAND_COLORS.dark } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(row).height = 30;
    row += 2;

    // Subtitle
    const subtitleCell = sheet.getCell(`B${row}`);
    subtitleCell.value = 'Welcome to SalesOS! Use this template to migrate your data.';
    subtitleCell.font = { size: 12, color: { argb: this.BRAND_COLORS.text } };
    row += 2;

    // Section: How to Use
    this.addSectionHeader(sheet, row, 'How to Use This Template');
    row += 1;

    const steps = [
      '1. Go to the "Data Template" tab',
      '2. Review the column headers (these match your CRM fields)',
      '3. Delete the sample row and paste your data',
      '4. Save this file',
      '5. Upload it to SalesOS (Settings → CRM Migration)',
      '6. Review the AI-suggested field mappings',
      '7. Click "Start Import" and watch your data migrate!',
    ];

    for (const step of steps) {
      const cell = sheet.getCell(`B${row}`);
      cell.value = step;
      cell.font = { size: 11 };
      cell.alignment = { wrapText: true };
      sheet.getRow(row).height = 20;
      row += 1;
    }
    row += 1;

    // Section: Important Tips
    this.addSectionHeader(sheet, row, '💡 Important Tips');
    row += 1;

    const tips = [
      '✓ Required Fields: firstName, lastName (for contacts/leads), name (for accounts/opportunities)',
      '✓ Email Format: Use valid email addresses (e.g., john@example.com)',
      '✓ Phone Format: Include country code (e.g., +1-555-0123)',
      '✓ Dates: Use ISO format YYYY-MM-DD or MM/DD/YYYY',
      '✓ Currency: Numbers only, no symbols (e.g., 100000 not $100,000)',
      '✓ Empty Fields: Leave cells blank if data is not available',
      '✓ Data Validation: Remove any formulas before import',
    ];

    for (const tip of tips) {
      const cell = sheet.getCell(`B${row}`);
      cell.value = tip;
      cell.font = { size: 10, color: { argb: this.BRAND_COLORS.text } };
      cell.alignment = { wrapText: true };
      this.addBackgroundColor(cell, this.BRAND_COLORS.lightSurface);
      sheet.getRow(row).height = 22;
      row += 1;
    }
    row += 1;

    // Section: Field Descriptions
    this.addSectionHeader(sheet, row, '📝 Field Descriptions');
    row += 1;

    const descriptions = this.getFieldDescriptions(entityType);
    for (const desc of descriptions) {
      const cell = sheet.getCell(`B${row}`);
      cell.value = desc;
      cell.font = { size: 10 };
      cell.alignment = { wrapText: true };
      sheet.getRow(row).height = 18;
      row += 1;
    }
    row += 2;

    // Footer
    const footerCell = sheet.getCell(`B${row}`);
    footerCell.value = '🚀 Ready to import? Head to the "Data Template" tab to get started!';
    footerCell.font = { size: 11, bold: true, color: { argb: this.BRAND_COLORS.primary } };
    this.addBackgroundColor(footerCell, this.BRAND_COLORS.dark);
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 35;
    row += 2;

    // Support
    const supportCell = sheet.getCell(`B${row}`);
    supportCell.value = 'Need help? Contact migrations@salesos.com';
    supportCell.font = { size: 9, italic: true, color: { argb: this.BRAND_COLORS.text } };
    supportCell.alignment = { horizontal: 'center' };
  }

  /**
   * Create the data sheet with formatted headers and sample data
   */
  private async createDataSheet(
    workbook: ExcelJS.Workbook,
    crmType: string,
    entityType: string,
    template: any,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('📊 Data Template', {
      properties: { tabColor: { argb: this.BRAND_COLORS.primary } },
    });

    const entityKey = entityType.toLowerCase() + 's';
    const fieldMappings = template.exportFields[entityKey] || [];

    if (!fieldMappings || fieldMappings.length === 0) {
      throw new Error(`No field mappings found for entity type: ${entityType}`);
    }

    // Create header row
    const headers = fieldMappings.map((f: any) => f.crmField);
    const headerRow = sheet.addRow(headers);

    // Style header row
    headerRow.height = 25;
    headerRow.eachCell((cell, colNumber) => {
      // Header styling
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.BRAND_COLORS.dark },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: this.BRAND_COLORS.text } },
        bottom: { style: 'thin', color: { argb: this.BRAND_COLORS.text } },
        left: { style: 'thin', color: { argb: this.BRAND_COLORS.text } },
        right: { style: 'thin', color: { argb: this.BRAND_COLORS.text } },
      };

      // Add comment with field description
      const fieldMapping = fieldMappings[colNumber - 1];
      if (fieldMapping?.description) {
        cell.note = {
          texts: [
            {
              font: { size: 10, name: 'Arial' },
              text: fieldMapping.description,
            },
          ],
        };
      }

      // Set column width based on content
      const column = sheet.getColumn(colNumber);
      column.width = Math.max(15, Math.min(30, headers[colNumber - 1].length + 5));
    });

    // Create sample data row
    const sampleData = fieldMappings.map((f: any) => this.getSampleValue(f));
    const sampleRow = sheet.addRow(sampleData);

    // Style sample row
    sampleRow.height = 20;
    sampleRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: this.BRAND_COLORS.text }, size: 10 };
      this.addBackgroundColor(cell, this.BRAND_COLORS.lightSurface);
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
        left: { style: 'thin', color: { argb: 'EEEEEE' } },
        right: { style: 'thin', color: { argb: 'EEEEEE' } },
      };
    });

    // Freeze header row
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    // Add auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }

  /**
   * Add section header with styling
   */
  private addSectionHeader(sheet: ExcelJS.Worksheet, row: number, title: string): void {
    const cell = sheet.getCell(`B${row}`);
    cell.value = title;
    cell.font = { size: 14, bold: true, color: { argb: this.BRAND_COLORS.dark } };
    this.addBackgroundColor(cell, this.BRAND_COLORS.primary);
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.getRow(row).height = 25;
  }

  /**
   * Add background color to cell
   */
  private addBackgroundColor(cell: ExcelJS.Cell, color: string): void {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
  }

  /**
   * Get sample value based on field type
   */
  private getSampleValue(fieldMapping: any): string {
    const fieldName = fieldMapping.crmField.toLowerCase();

    // Email
    if (fieldName.includes('email')) {
      return 'john.doe@example.com';
    }

    // Phone
    if (fieldName.includes('phone') || fieldName.includes('mobile')) {
      return '+1-555-0123';
    }

    // Names
    if (fieldName.includes('firstname') || fieldName.includes('first')) {
      return 'John';
    }
    if (fieldName.includes('lastname') || fieldName.includes('last')) {
      return 'Doe';
    }
    if (fieldName === 'name' || fieldName.includes('company')) {
      return 'Acme Corporation';
    }

    // Titles
    if (fieldName.includes('title') || fieldName.includes('jobtitle')) {
      return 'Sales Manager';
    }

    // Dates
    if (fieldName.includes('date') || fieldName.includes('closedate')) {
      return '2026-03-15';
    }

    // Currency/Amount
    if (fieldName.includes('amount') || fieldName.includes('revenue') || fieldName.includes('value')) {
      return '150000';
    }

    // Numbers
    if (fieldName.includes('employees') || fieldName.includes('count')) {
      return '250';
    }

    // Status/Stage
    if (fieldName.includes('status') || fieldName.includes('stage')) {
      return 'Qualified';
    }

    // URLs
    if (fieldName.includes('website') || fieldName.includes('url')) {
      return 'https://www.example.com';
    }

    // Address fields
    if (fieldName.includes('street') || fieldName.includes('address')) {
      return '123 Main Street';
    }
    if (fieldName.includes('city')) {
      return 'San Francisco';
    }
    if (fieldName.includes('state') || fieldName.includes('province')) {
      return 'CA';
    }
    if (fieldName.includes('postal') || fieldName.includes('zip')) {
      return '94105';
    }
    if (fieldName.includes('country')) {
      return 'United States';
    }

    // Industry
    if (fieldName.includes('industry')) {
      return 'Technology';
    }

    // Rating
    if (fieldName.includes('rating')) {
      return 'Hot';
    }

    // Source
    if (fieldName.includes('source')) {
      return 'Website';
    }

    // Description
    if (fieldName.includes('description') || fieldName.includes('notes')) {
      return 'Sample description or notes';
    }

    // Probability
    if (fieldName.includes('probability')) {
      return '75';
    }

    // Default
    return `Sample ${fieldMapping.description || fieldMapping.crmField}`;
  }

  /**
   * Get field descriptions for entity type
   */
  private getFieldDescriptions(entityType: string): string[] {
    const descriptions: Record<string, string[]> = {
      lead: [
        '• firstName, lastName: Contact name (required)',
        '• email: Primary email address',
        '• phone: Primary phone number',
        '• company: Company or organization name',
        '• title: Job title',
        '• leadSource: Where the lead came from (e.g., Website, Referral)',
        '• status: Lead status (e.g., New, Qualified, Converted)',
        '• rating: Priority rating (e.g., Hot, Warm, Cold)',
      ],
      contact: [
        '• firstName, lastName: Contact name (required)',
        '• email: Primary email address',
        '• phone: Primary phone number',
        '• title: Job title',
        '• accountName: Associated company/account',
        '• department: Department within organization',
      ],
      account: [
        '• name: Company name (required)',
        '• type: Account type (e.g., Customer, Prospect)',
        '• industry: Industry sector',
        '• website: Company website URL',
        '• numberOfEmployees: Company size',
        '• annualRevenue: Annual revenue in dollars',
      ],
      opportunity: [
        '• name: Opportunity name (required)',
        '• accountName: Associated company',
        '• stage: Sales stage (e.g., Qualification, Proposal)',
        '• amount: Deal value in dollars',
        '• closeDate: Expected close date (YYYY-MM-DD)',
        '• probability: Win probability (0-100)',
      ],
    };

    return descriptions[entityType.toLowerCase()] || [];
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
