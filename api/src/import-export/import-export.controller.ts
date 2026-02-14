import {
  Controller,
  Post,
  Get,
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
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { ImportExportService } from './import-export.service';
import { ImportEntityType, ImportOptionsDto } from './dto/import.dto';
import { ExportEntityType, ExportRequestDto } from './dto/export.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('Import/Export')
@ApiBearerAuth('JWT')
@Controller('import-export')
@UseGuards(JwtAuthGuard)
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

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
   */
  @Post('import')
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
}
