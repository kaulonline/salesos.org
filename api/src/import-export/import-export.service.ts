import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CsvParser } from './parsers/csv.parser';
import { ExcelParser } from './parsers/excel.parser';
import { DataTransformationService } from './data-transformation.service';
import { MigrationService } from './migration.service';
import {
  ImportEntityType,
  ImportFileFormat,
  ImportOptionsDto,
  ImportPreviewResult,
  ImportResult,
  ImportError,
  FieldMappingDto,
} from './dto/import.dto';
import {
  ExportEntityType,
  ExportFormat,
  ExportRequestDto,
  ExportResult,
  LEAD_EXPORT_FIELDS,
  CONTACT_EXPORT_FIELDS,
  ACCOUNT_EXPORT_FIELDS,
  OPPORTUNITY_EXPORT_FIELDS,
} from './dto/export.dto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'exports');

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParser,
    private readonly excelParser: ExcelParser,
    private readonly dataTransformationService: DataTransformationService,
    private readonly migrationService: MigrationService,
  ) {
    // Ensure exports directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Preview import file and suggest mappings
   */
  async previewImport(
    file: Express.Multer.File,
    entityType: ImportEntityType,
  ): Promise<ImportPreviewResult> {
    const format = this.detectFileFormat(file);
    let headers: string[];
    let rows: Record<string, any>[];

    if (format === ImportFileFormat.CSV) {
      const result = this.csvParser.parseContent(file.buffer);
      headers = result.headers;
      rows = result.rows;
    } else if (format === ImportFileFormat.EXCEL) {
      const result = this.excelParser.parseContent(file.buffer);
      headers = result.headers;
      rows = result.rows;
    } else {
      throw new BadRequestException('Unsupported file format');
    }

    const suggestedMappings = this.csvParser.suggestMappings(headers, entityType);

    return {
      headers,
      sampleRows: rows.slice(0, 5),
      totalRows: rows.length,
      suggestedMappings,
      detectedFormat: format,
    };
  }

  /**
   * Import records from file
   */
  async importRecords(
    file: Express.Multer.File,
    options: ImportOptionsDto,
    userId: string,
    organizationId: string,
  ): Promise<ImportResult> {
    const importId = uuidv4();
    const startedAt = new Date();
    let migrationId: string | null = null;

    const result: ImportResult = {
      id: importId,
      status: 'PROCESSING',
      entityType: options.entityType,
      totalRecords: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      startedAt,
    };

    try {
      const format = this.detectFileFormat(file);
      let parsedRows: { rowNumber: number; data: Record<string, any>; errors: ImportError[] }[];

      if (!options.fieldMappings || options.fieldMappings.length === 0) {
        throw new BadRequestException('Field mappings are required');
      }

      if (format === ImportFileFormat.CSV) {
        parsedRows = this.csvParser.parseWithMappings(
          file.buffer,
          options.fieldMappings,
          options.entityType,
        );
      } else if (format === ImportFileFormat.EXCEL) {
        parsedRows = this.excelParser.parseWithMappings(
          file.buffer,
          options.fieldMappings,
          options.entityType,
        );
      } else {
        throw new BadRequestException('Unsupported file format');
      }

      result.totalRecords = parsedRows.length;

      // Create migration job if sourceCRM is provided
      if (options.sourceCRM) {
        const migration = await this.migrationService.createMigration({
          organizationId,
          userId,
          sourceCRM: options.sourceCRM,
          entityType: options.entityType,
          fileName: file.originalname,
          fileSize: file.size,
          totalRows: parsedRows.length,
          fieldMappings: options.fieldMappings.map(fm => ({
            csvColumn: fm.sourceField,
            salesosField: fm.targetField,
            transform: (fm.transform || fm.transformation) as any,
          })),
        });
        migrationId = migration.id;

        // Update migration to IN_PROGRESS
        await this.migrationService.updateStatus(migrationId, 'IN_PROGRESS');
      }

      // Process each row
      for (const row of parsedRows) {
        // Add any parsing errors
        result.errors.push(...row.errors);

        if (row.errors.length > 0 && row.errors.some(e => e.message.includes('Invalid'))) {
          result.failedCount++;
          continue;
        }

        try {
          // Apply data transformations based on field mappings
          const transformedData = this.dataTransformationService.transformRecord(
            row.data,
            options.fieldMappings.map(fm => ({
              csvColumn: fm.sourceField,
              salesosField: fm.targetField,
              transform: (fm.transform || fm.transformation) as any,
            })),
          );

          // Validate required fields
          const validation = this.dataTransformationService.validateRequiredFields(
            transformedData,
            options.entityType,
          );

          if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
          }

          const imported = await this.importSingleRecord(
            transformedData,
            options,
            userId,
            organizationId,
          );

          if (imported === 'skipped') {
            result.skippedCount++;
          } else {
            result.successCount++;
          }

          // Update migration progress periodically
          if (migrationId && (result.successCount + result.failedCount + result.skippedCount) % 10 === 0) {
            await this.migrationService.updateProgress(migrationId, {
              successCount: result.successCount,
              failedCount: result.failedCount,
              skippedCount: result.skippedCount,
            });
          }
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            row: row.rowNumber,
            message: error.message,
            data: row.data,
          });
        }
      }

      result.status = 'COMPLETED';
      result.completedAt = new Date();

      // Update migration to COMPLETED
      if (migrationId) {
        await this.migrationService.updateProgress(migrationId, {
          successCount: result.successCount,
          failedCount: result.failedCount,
          skippedCount: result.skippedCount,
          errors: result.errors,
        });
        await this.migrationService.updateStatus(migrationId, 'COMPLETED');
      }
    } catch (error) {
      this.logger.error(`Import failed: ${error.message}`, error.stack);
      result.status = 'FAILED';
      result.errors.push({ row: 0, message: error.message });
      result.completedAt = new Date();

      // Update migration to FAILED
      if (migrationId) {
        await this.migrationService.updateProgress(migrationId, {
          errors: result.errors,
        });
        await this.migrationService.updateStatus(migrationId, 'FAILED');
      }
    }

    return result;
  }

  /**
   * Export records to file
   */
  async exportRecords(
    request: ExportRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<ExportResult> {
    const exportId = uuidv4();
    const startedAt = new Date();
    const format = request.format || ExportFormat.CSV;

    const result: ExportResult = {
      id: exportId,
      status: 'PROCESSING',
      entityType: request.entityType,
      format,
      totalRecords: 0,
      startedAt,
    };

    try {
      // Fetch records based on entity type
      const records = await this.fetchRecordsForExport(request, userId, organizationId);
      result.totalRecords = records.length;

      if (records.length === 0) {
        result.status = 'COMPLETED';
        result.completedAt = new Date();
        return result;
      }

      // Get fields for export
      const fields = request.fields || this.getDefaultExportFields(request.entityType);

      // Generate file
      let fileBuffer: Buffer;
      let extension: string;

      if (format === ExportFormat.CSV) {
        const csvContent = this.csvParser.generateCsv(records, fields);
        fileBuffer = Buffer.from(csvContent, 'utf-8');
        extension = 'csv';
      } else if (format === ExportFormat.EXCEL) {
        fileBuffer = this.excelParser.generateExcel(records, fields);
        extension = 'xlsx';
      } else if (format === ExportFormat.JSON) {
        const jsonContent = JSON.stringify(records, null, 2);
        fileBuffer = Buffer.from(jsonContent, 'utf-8');
        extension = 'json';
      } else {
        throw new BadRequestException('Unsupported export format');
      }

      // Save file
      const fileName = `${request.entityType.toLowerCase()}_export_${Date.now()}.${extension}`;
      const filePath = path.join(this.uploadsDir, fileName);
      fs.writeFileSync(filePath, fileBuffer);

      result.status = 'COMPLETED';
      result.completedAt = new Date();
      result.fileName = fileName;
      result.downloadUrl = `/api/import-export/download/${fileName}`;
      result.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`, error.stack);
      result.status = 'FAILED';
      result.error = error.message;
      result.completedAt = new Date();
    }

    return result;
  }

  /**
   * Get export fields for an entity type
   */
  getExportFields(entityType: ExportEntityType) {
    switch (entityType) {
      case ExportEntityType.LEAD:
        return LEAD_EXPORT_FIELDS;
      case ExportEntityType.CONTACT:
        return CONTACT_EXPORT_FIELDS;
      case ExportEntityType.ACCOUNT:
        return ACCOUNT_EXPORT_FIELDS;
      case ExportEntityType.OPPORTUNITY:
        return OPPORTUNITY_EXPORT_FIELDS;
      default:
        return [];
    }
  }

  /**
   * Get file buffer for download
   */
  getExportFile(fileName: string): { buffer: Buffer; mimeType: string } | null {
    const filePath = path.join(this.uploadsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    const extension = path.extname(fileName).toLowerCase();

    let mimeType = 'application/octet-stream';
    if (extension === '.csv') {
      mimeType = 'text/csv';
    } else if (extension === '.xlsx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (extension === '.json') {
      mimeType = 'application/json';
    }

    return { buffer, mimeType };
  }

  private detectFileFormat(file: Express.Multer.File): ImportFileFormat {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

    if (extension === '.csv' || mimeType === 'text/csv') {
      return ImportFileFormat.CSV;
    }

    if (
      extension === '.xlsx' ||
      extension === '.xls' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      return ImportFileFormat.EXCEL;
    }

    // Try to detect from content
    const header = file.buffer.slice(0, 4).toString('hex');
    if (header.startsWith('504b')) {
      // ZIP file signature (xlsx)
      return ImportFileFormat.EXCEL;
    }

    // Default to CSV
    return ImportFileFormat.CSV;
  }

  private async importSingleRecord(
    data: Record<string, any>,
    options: ImportOptionsDto,
    userId: string,
    organizationId: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    switch (options.entityType) {
      case ImportEntityType.LEAD:
        return this.importLead(data, options, userId, organizationId);
      case ImportEntityType.CONTACT:
        return this.importContact(data, options, userId, organizationId);
      case ImportEntityType.ACCOUNT:
        return this.importAccount(data, options, userId, organizationId);
      case ImportEntityType.OPPORTUNITY:
        return this.importOpportunity(data, options, userId, organizationId);
      default:
        throw new BadRequestException('Unsupported entity type');
    }
  }

  private async importLead(
    data: Record<string, any>,
    options: ImportOptionsDto,
    userId: string,
    organizationId: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const checkField = options.duplicateCheckField || 'email';

    // Build where clause with organization filter
    const whereClause: any = { [checkField]: data[checkField], ownerId: userId };
    whereClause.organizationId = organizationId;

    // Check for duplicates
    if (options.skipDuplicates || options.updateExisting) {
      const existingLead = await this.prisma.lead.findFirst({
        where: whereClause,
      });

      if (existingLead) {
        if (options.skipDuplicates) {
          return 'skipped';
        }
        if (options.updateExisting) {
          await this.prisma.lead.update({
            where: { id: existingLead.id },
            data: { ...data, updatedAt: new Date() },
          });
          return 'updated';
        }
      }
    }

    // Ensure required fields are present
    if (!data.firstName || !data.lastName) {
      throw new Error('First name and last name are required');
    }

    await this.prisma.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        title: data.title,
        status: data.status || 'NEW',
        rating: data.rating,
        leadSource: data.leadSource,
        industry: data.industry,
        website: data.website,
        street: data.address || data.street,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        ownerId: userId,
        organizationId,
      },
    });

    return 'created';
  }

  private async importContact(
    data: Record<string, any>,
    options: ImportOptionsDto,
    userId: string,
    organizationId: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const checkField = options.duplicateCheckField || 'email';

    // Build where clause with organization filter
    const whereClause: any = { [checkField]: data[checkField], ownerId: userId };
    whereClause.organizationId = organizationId;

    if (options.skipDuplicates || options.updateExisting) {
      const existingContact = await this.prisma.contact.findFirst({
        where: whereClause,
      });

      if (existingContact) {
        if (options.skipDuplicates) {
          return 'skipped';
        }
        if (options.updateExisting) {
          await this.prisma.contact.update({
            where: { id: existingContact.id },
            data: { ...data, updatedAt: new Date() },
          });
          return 'updated';
        }
      }
    }

    // Ensure required fields are present
    if (!data.firstName || !data.lastName) {
      throw new Error('First name and last name are required');
    }

    await this.prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        mobilePhone: data.mobilePhone,
        title: data.title,
        department: data.department,
        mailingStreet: data.mailingAddress || data.mailingStreet,
        accountId: data.accountId,
        ownerId: userId,
        organizationId,
      },
    });

    return 'created';
  }

  private async importAccount(
    data: Record<string, any>,
    options: ImportOptionsDto,
    userId: string,
    organizationId: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const checkField = options.duplicateCheckField || 'name';

    // Build where clause with organization filter
    const whereClause: any = { [checkField]: data[checkField], ownerId: userId };
    whereClause.organizationId = organizationId;

    if (options.skipDuplicates || options.updateExisting) {
      const existingAccount = await this.prisma.account.findFirst({
        where: whereClause,
      });

      if (existingAccount) {
        if (options.skipDuplicates) {
          return 'skipped';
        }
        if (options.updateExisting) {
          await this.prisma.account.update({
            where: { id: existingAccount.id },
            data: { ...data, updatedAt: new Date() },
          });
          return 'updated';
        }
      }
    }

    // Ensure required fields are present
    if (!data.name) {
      throw new Error('Account name is required');
    }

    await this.prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        industry: data.industry,
        phone: data.phone,
        website: data.website,
        annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : null,
        numberOfEmployees: data.numberOfEmployees ? parseInt(data.numberOfEmployees) : null,
        billingStreet: data.billingAddress || data.billingStreet,
        billingCity: data.billingCity,
        billingState: data.billingState,
        billingCountry: data.billingCountry,
        billingPostalCode: data.billingPostalCode,
        ownerId: userId,
        organizationId,
      },
    });

    return 'created';
  }

  private async importOpportunity(
    data: Record<string, any>,
    options: ImportOptionsDto,
    userId: string,
    organizationId: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const checkField = options.duplicateCheckField || 'name';

    // Build where clause with organization filter
    const whereClause: any = { [checkField]: data[checkField], ownerId: userId };
    whereClause.organizationId = organizationId;

    if (options.skipDuplicates || options.updateExisting) {
      const existingOpp = await this.prisma.opportunity.findFirst({
        where: whereClause,
      });

      if (existingOpp) {
        if (options.skipDuplicates) {
          return 'skipped';
        }
        if (options.updateExisting) {
          await this.prisma.opportunity.update({
            where: { id: existingOpp.id },
            data: { ...data, updatedAt: new Date() },
          });
          return 'updated';
        }
      }
    }

    // Ensure required fields are present
    if (!data.name) {
      throw new Error('Opportunity name is required');
    }
    if (!data.accountId) {
      throw new Error('Account ID is required for opportunity');
    }

    await this.prisma.opportunity.create({
      data: {
        name: data.name,
        accountId: data.accountId,
        stage: data.stage || 'PROSPECTING',
        amount: data.amount ? parseFloat(data.amount) : null,
        probability: data.probability ? parseFloat(data.probability) : null,
        closeDate: data.closeDate ? new Date(data.closeDate) : null,
        type: data.type,
        opportunitySource: data.opportunitySource,
        nextStep: data.nextStep,
        ownerId: userId,
        organizationId,
      },
    });

    return 'created';
  }

  private async fetchRecordsForExport(
    request: ExportRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<Record<string, any>[]> {
    const where: any = { ownerId: userId };

    // Apply organization filter for multi-tenant isolation
    where.organizationId = organizationId;

    // Apply date filters
    if (request.startDate || request.endDate) {
      where.createdAt = {};
      if (request.startDate) {
        where.createdAt.gte = new Date(request.startDate);
      }
      if (request.endDate) {
        where.createdAt.lte = new Date(request.endDate);
      }
    }

    // Apply ID filter
    if (request.ids && request.ids.length > 0) {
      where.id = { in: request.ids };
    }

    // Apply additional filters
    if (request.filters) {
      Object.assign(where, request.filters);
    }

    switch (request.entityType) {
      case ExportEntityType.LEAD:
        return this.prisma.lead.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      case ExportEntityType.CONTACT:
        return this.prisma.contact.findMany({
          where,
          include: { account: true },
          orderBy: { createdAt: 'desc' },
        });
      case ExportEntityType.ACCOUNT:
        return this.prisma.account.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      case ExportEntityType.OPPORTUNITY:
        return this.prisma.opportunity.findMany({
          where,
          include: { account: true },
          orderBy: { createdAt: 'desc' },
        });
      case ExportEntityType.ACTIVITY:
        return this.prisma.activity.findMany({
          where: { ...where, userId: userId },
          orderBy: { createdAt: 'desc' },
        });
      case ExportEntityType.TASK:
        return this.prisma.task.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      default:
        return [];
    }
  }

  private getDefaultExportFields(entityType: ExportEntityType): string[] {
    const fields = this.getExportFields(entityType);
    return fields.map(f => f.name);
  }
}
