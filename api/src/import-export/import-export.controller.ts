import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Response,
  StreamableFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, Public } from '../auth/strategies/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ImportExportService } from './import-export.service';
import { ImportEntityType, ImportOptionsDto } from './dto/import.dto';
import { ExportEntityType, ExportRequestDto } from './dto/export.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import { AIMappingService } from './ai-mapping.service';
import { MigrationService } from './migration.service';
import { EntityType } from './templates';
import { TemplateGeneratorService } from './template-generator.service';

/**
 * Import/Export Controller
 *
 * SECURITY: Multi-tenant data isolation
 * - JwtAuthGuard: Ensures user is authenticated
 * - OrganizationGuard: Validates user belongs to organization
 * - RolesGuard + @Roles: Restricts sensitive operations to ADMIN/OWNER only
 * - All queries scoped to organizationId for tenant isolation
 */
@ApiTags('Import/Export')
@ApiBearerAuth('JWT')
@Controller('import-export')
@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
export class ImportExportController {
  constructor(
    private readonly importExportService: ImportExportService,
    private readonly aiMappingService: AIMappingService,
    private readonly migrationService: MigrationService,
    private readonly templateGeneratorService: TemplateGeneratorService,
  ) {}

  /**
   * Preview import file - returns headers, sample rows, and suggested mappings
   */
  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Query('entityType') entityType: ImportEntityType,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!entityType) {
      throw new BadRequestException('Entity type is required');
    }

    return this.importExportService.previewImport(file, entityType);
  }

  /**
   * Import records from file
   *
   * SECURITY: Only ADMIN and OWNER can import data
   */
  @Post('import')
  @Roles('ADMIN', 'OWNER')
  @UseInterceptors(FileInterceptor('file'))
  async importRecords(
    @UploadedFile() file: Express.Multer.File,
    @Body() options: ImportOptionsDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const userId = req.user.userId;
    return this.importExportService.importRecords(file, options, userId, organizationId);
  }

  /**
   * Export records to file
   */
  @Post('export')
  async exportRecords(
    @Body() request: ExportRequestDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    return this.importExportService.exportRecords(request, userId, organizationId);
  }

  /**
   * Download exported file
   */
  @Get('download/:fileName')
  async downloadExport(
    @Param('fileName') fileName: string,
    @Response({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    const file = this.importExportService.getExportFile(fileName);

    if (!file) {
      throw new NotFoundException('File not found or has expired');
    }

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(file.buffer);
  }

  /**
   * Get available export fields for an entity type
   */
  @Get('fields/:entityType')
  getExportFields(@Param('entityType') entityType: ExportEntityType) {
    return this.importExportService.getExportFields(entityType);
  }

  /**
   * Get import template (sample file)
   */
  @Get('template/:entityType')
  async getImportTemplate(
    @Param('entityType') entityType: ImportEntityType,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Response({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    const fields = this.importExportService.getExportFields(entityType as unknown as ExportEntityType);
    const headers = fields.map(f => f.name);
    const sampleData = [this.getSampleRow(entityType)];

    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    if (format === 'xlsx') {
      // Generate Excel template
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    } else {
      // Generate CSV template
      const { stringify } = await import('csv-stringify/sync');
      const csv = stringify(sampleData, { header: true, columns: headers });
      buffer = Buffer.from(csv, 'utf-8');
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const fileName = `${entityType.toLowerCase()}_template.${extension}`;

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(buffer);
  }

  private getSampleRow(entityType: ImportEntityType): Record<string, any> {
    switch (entityType) {
      case ImportEntityType.LEAD:
        return {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1 555-123-4567',
          company: 'Acme Corp',
          title: 'Sales Manager',
          status: 'NEW',
          rating: 'HOT',
          leadSource: 'Website',
          industry: 'Technology',
          website: 'https://acme.example.com',
        };
      case ImportEntityType.CONTACT:
        return {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1 555-234-5678',
          mobilePhone: '+1 555-345-6789',
          title: 'VP of Engineering',
          department: 'Engineering',
        };
      case ImportEntityType.ACCOUNT:
        return {
          name: 'Global Tech Inc',
          type: 'CUSTOMER',
          industry: 'Technology',
          phone: '+1 555-456-7890',
          website: 'https://globaltech.example.com',
          annualRevenue: 5000000,
          numberOfEmployees: 500,
          billingCity: 'San Francisco',
          billingState: 'CA',
          billingCountry: 'USA',
        };
      case ImportEntityType.OPPORTUNITY:
        return {
          name: 'Enterprise Deal - Q1',
          stage: 'PROPOSAL',
          amount: 150000,
          probability: 60,
          closeDate: '2025-03-31',
          type: 'NEW_BUSINESS',
          opportunitySource: 'Outbound',
          nextStep: 'Schedule executive meeting',
        };
      default:
        return {};
    }
  }

  // ============================================================================
  // Migration Endpoints
  // ============================================================================

  /**
   * Get CRM template for field mappings
   */
  @Get('crm-template/:crmType/:entityType')
  async getCRMTemplate(
    @Param('crmType') crmType: string,
    @Param('entityType') entityType: string,
  ) {
    const { getCRMTemplate: getTemplate } = await import('./templates/index.js');
    const template = getTemplate(crmType, entityType.toUpperCase() as EntityType);

    if (!template) {
      throw new NotFoundException(
        `Template not found for CRM: ${crmType}, Entity: ${entityType}`,
      );
    }

    return template;
  }

  /**
   * AI-powered field mapping suggestions
   */
  @Post('suggest-mappings')
  async suggestMappings(
    @Body()
    dto: {
      headers: string[];
      entityType: EntityType;
      crmType?: string;
    },
  ) {
    if (!dto.headers || !Array.isArray(dto.headers) || dto.headers.length === 0) {
      throw new BadRequestException('Headers array is required');
    }

    if (!dto.entityType) {
      throw new BadRequestException('Entity type is required');
    }

    return this.aiMappingService.suggestFieldMappings(
      dto.headers,
      dto.entityType,
      dto.crmType,
    );
  }

  /**
   * Detect CRM type from CSV headers
   */
  @Post('detect-crm')
  async detectCRM(@Body() dto: { headers: string[] }) {
    if (!dto.headers || !Array.isArray(dto.headers) || dto.headers.length === 0) {
      throw new BadRequestException('Headers array is required');
    }

    return this.aiMappingService.detectCRMType(dto.headers);
  }

  /**
   * Create a new migration job
   *
   * SECURITY: Only ADMIN and OWNER can create migrations
   */
  @Post('migrations')
  @Roles('ADMIN', 'OWNER')
  async createMigration(
    @Body()
    dto: {
      sourceCRM: string;
      entityType: string;
      fileName: string;
      fileSize: number;
      totalRows: number;
      fieldMappings: any[];
    },
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;

    return this.migrationService.createMigration({
      organizationId,
      userId,
      sourceCRM: dto.sourceCRM,
      entityType: dto.entityType,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      totalRows: dto.totalRows,
      fieldMappings: dto.fieldMappings,
    });
  }

  /**
   * Get migration status and progress
   *
   * SECURITY: Scoped to organization - service validates ownership
   */
  @Get('migrations/:id')
  @Roles('ADMIN', 'OWNER')
  async getMigrationStatus(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    // Service now enforces organization scoping
    return this.migrationService.getMigration(id, organizationId);
  }

  /**
   * Get migration history for organization
   *
   * SECURITY: Scoped to organization automatically
   */
  @Get('migrations')
  @Roles('ADMIN', 'OWNER')
  async getMigrationHistory(
    @Query('sourceCRM') sourceCRM?: string,
    @Query('entityType') entityType?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @CurrentOrganization() organizationId?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    return this.migrationService.getMigrationHistory(organizationId, {
      sourceCRM,
      entityType,
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  /**
   * Get migration statistics
   *
   * SECURITY: Scoped to organization automatically
   */
  @Get('migrations/stats')
  @Roles('ADMIN', 'OWNER')
  async getMigrationStats(@CurrentOrganization() organizationId: string) {
    return this.migrationService.getMigrationStats(organizationId);
  }

  /**
   * Delete a migration record
   *
   * SECURITY: Service validates ownership before deletion
   */
  @Delete('migrations/:id')
  @Roles('ADMIN', 'OWNER')
  async deleteMigration(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    await this.migrationService.deleteMigration(id, organizationId);
    return { message: 'Migration deleted successfully' };
  }

  /**
   * Cancel an in-progress migration
   *
   * SECURITY: Service validates ownership before cancellation
   */
  @Post('migrations/:id/cancel')
  @Roles('ADMIN', 'OWNER')
  async cancelMigration(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    await this.migrationService.cancelMigration(id, organizationId);
    return { message: 'Migration cancelled successfully' };
  }

  /**
   * Download CRM-specific import template (Public endpoint - no auth required)
   * Returns a professional, branded XLSX file with instructions and data sheet
   */
  @Public()
  @Get('crm-template-download/:crmType/:entityType')
  async downloadCRMTemplate(
    @Param('crmType') crmType: string,
    @Param('entityType') entityType: string,
    @Response({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    try {
      // Generate professional XLSX template
      const buffer = await this.templateGeneratorService.generateTemplate(
        crmType,
        entityType,
      );

      const fileName = `SalesOS_${crmType}_${entityType}_Import_Template.xlsx`;

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length,
      });

      return new StreamableFile(buffer);
    } catch (error) {
      throw new BadRequestException(`Failed to generate template: ${error.message}`);
    }
  }
}
