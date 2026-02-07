import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Query,
  UseGuards,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService, CreateDocumentDto } from './documents.service';
import { PageIndexService } from '../pageindex/pageindex.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import {
  validateFileType,
  validateFileSize,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
} from '../common/utils/file-validator';

// Maximum file size for PDF uploads (50MB)
const MAX_PDF_SIZE = FILE_SIZE_LIMITS.PDF;

// Multer options with file size limit
const multerOptions = {
  limits: {
    fileSize: MAX_PDF_SIZE,
  },
};

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pageIndexService: PageIndexService,
  ) {}

  /**
   * Get all indexed documents from the database
   */
  @Get()
  async findAll() {
    try {
      const documents = await this.documentsService.findAll();
      return { documents };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch documents: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get PageIndex service capabilities
   * Returns information about OCR, table extraction, and other features
   * NOTE: This route must be defined BEFORE ':id' to avoid being captured by the param route
   */
  @Get('capabilities')
  async getCapabilities() {
    try {
      return await this.pageIndexService.getCapabilities();
    } catch (error) {
      throw new HttpException(
        `Failed to get capabilities: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single document by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.documentsService.findOne(id);
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload and index a new document
   * This uploads to PageIndex and creates a database record
   * @param file - The PDF file to upload
   * @param addSummary - Generate summaries for each section (default: true)
   * @param addDescription - Generate document description (default: false)
   * @param useOcr - Use Azure Document Intelligence for OCR on scanned documents (default: true)
   * @param extractTables - Extract and include tables in the content (default: true)
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadAndIndex(
    @UploadedFile() file: any,
    @Query('addSummary') addSummary: string = 'true',
    @Query('addDescription') addDescription: string = 'false',
    @Query('useOcr') useOcr: string = 'true',
    @Query('extractTables') extractTables: string = 'true',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size, MAX_PDF_SIZE);
    if (!sizeValidation.valid) {
      throw new PayloadTooLargeException(sizeValidation.message);
    }

    // Validate file type using magic bytes (not just extension)
    const typeValidation = validateFileType(file.buffer, ALLOWED_FILE_TYPES.PDF_ONLY);
    if (!typeValidation.valid) {
      throw new BadRequestException(
        `Invalid file type. Expected PDF but detected '${typeValidation.detectedType}'. ` +
        'Please upload a valid PDF file.'
      );
    }

    try {
      // Start indexing with PageIndex
      const pageIndexResult = await this.pageIndexService.indexDocumentAsync(
        file,
        addSummary === 'true',
        addDescription === 'true',
        useOcr === 'true',
        extractTables === 'true',
      );

      // Create database record
      const document = await this.documentsService.create({
        filename: file.originalname,
        documentId: pageIndexResult.document_id,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });

      return {
        ...document,
        message: 'Document upload started, indexing in progress',
        ocrEnabled: pageIndexResult.ocr_enabled,
        tableExtractionEnabled: pageIndexResult.table_extraction_enabled,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to upload document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extract text and tables from a document using OCR
   * This provides raw extraction without tree structure indexing
   * @param file - The PDF file to extract
   * @param includeTables - Include table extraction (default: true)
   * @param outputFormat - 'full', 'text', or 'tables' (default: full)
   */
  @Post('extract')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async extractContent(
    @UploadedFile() file: any,
    @Query('includeTables') includeTables: string = 'true',
    @Query('outputFormat') outputFormat: string = 'full',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size, MAX_PDF_SIZE);
    if (!sizeValidation.valid) {
      throw new PayloadTooLargeException(sizeValidation.message);
    }

    // Validate file type using magic bytes (not just extension)
    const typeValidation = validateFileType(file.buffer, ALLOWED_FILE_TYPES.PDF_ONLY);
    if (!typeValidation.valid) {
      throw new BadRequestException(
        `Invalid file type. Expected PDF but detected '${typeValidation.detectedType}'. ` +
        'Please upload a valid PDF file.'
      );
    }

    try {
      const result = await this.pageIndexService.extractDocument(
        file,
        includeTables === 'true',
        outputFormat as 'full' | 'text' | 'tables',
      );

      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to extract document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check indexing status and update database
   */
  @Get(':id/status')
  async checkStatus(@Param('id') id: string) {
    try {
      const document = await this.documentsService.findOne(id);
      
      // If already complete, return current status
      if (document.status === 'COMPLETE') {
        return document;
      }

      // Check status from PageIndex
      const pageIndexStatus = await this.pageIndexService.getIndexingStatus(
        document.documentId,
      );

      // Map PageIndex status to our enum
      const statusMap: Record<string, 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'ERROR'> = {
        pending: 'PENDING',
        processing: 'PROCESSING',
        complete: 'COMPLETE',
        error: 'ERROR',
      };

      const newStatus = statusMap[pageIndexStatus.status] || 'PENDING';

      // Update database
      if (newStatus === 'COMPLETE' && pageIndexStatus.tree_structure) {
        return await this.documentsService.updateTreeStructure(
          document.documentId,
          pageIndexStatus.tree_structure,
        );
      } else if (newStatus === 'ERROR') {
        return await this.documentsService.updateStatus(
          document.documentId,
          newStatus,
          pageIndexStatus.progress,
          pageIndexStatus.message,
        );
      } else {
        return await this.documentsService.updateStatus(
          document.documentId,
          newStatus,
          pageIndexStatus.progress,
        );
      }
    } catch (error) {
      throw new HttpException(
        `Failed to check status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync documents from PageIndex service to database
   */
  @Post('sync')
  async syncFromPageIndex() {
    try {
      const result = await this.documentsService.syncFromPageIndex();
      return {
        message: `Synced ${result.synced} documents`,
        synced: result.synced,
        errors: result.errors,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to sync documents: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a document with cascade effect
   * Removes from both database and PageIndex service
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.documentsService.remove(id);
      return {
        message: `Document '${result.filename}' deleted successfully`,
        deletedFromDB: result.deletedFromDB,
        deletedFromPageIndex: result.deletedFromPageIndex,
      };
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
