// PageIndex Controller - Document Indexing API Endpoints
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PageIndexService, SearchResult } from './pageindex.service';

interface SearchDocumentDto {
  query: string;
  maxResults?: number;
}

@Controller('pageindex')
export class PageIndexController {
  constructor(private readonly pageIndexService: PageIndexService) {}

  /**
   * Health check for PageIndex service
   */
  @Get('health')
  async healthCheck() {
    try {
      return await this.pageIndexService.checkHealth();
    } catch (error) {
      throw new HttpException(
        'PageIndex service is not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Index a document asynchronously
   * Returns immediately with a document_id for status polling
   */
  @Post('index')
  @UseInterceptors(FileInterceptor('file'))
  async indexDocument(
    @UploadedFile() file: any,
    @Query('addSummary') addSummary: string = 'true',
    @Query('addDescription') addDescription: string = 'false',
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new HttpException('Only PDF files are supported', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.pageIndexService.indexDocumentAsync(
        file,
        addSummary === 'true',
        addDescription === 'true',
      );
    } catch (error) {
      throw new HttpException(
        `Failed to index document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Index a document synchronously
   * Waits for completion and returns the tree structure
   */
  @Post('index-sync')
  @UseInterceptors(FileInterceptor('file'))
  async indexDocumentSync(
    @UploadedFile() file: any,
    @Query('addSummary') addSummary: string = 'true',
    @Query('addDescription') addDescription: string = 'false',
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new HttpException('Only PDF files are supported', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.pageIndexService.indexDocumentSync(
        file,
        addSummary === 'true',
        addDescription === 'true',
      );
    } catch (error) {
      throw new HttpException(
        `Failed to index document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get indexing status for a document
   */
  @Get('status/:documentId')
  async getStatus(@Param('documentId') documentId: string) {
    try {
      return await this.pageIndexService.getIndexingStatus(documentId);
    } catch (error) {
      throw new HttpException(
        `Document not found: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Get the tree structure of an indexed document
   */
  @Get('document/:documentId')
  async getDocument(@Param('documentId') documentId: string) {
    try {
      return await this.pageIndexService.getDocumentTree(documentId);
    } catch (error) {
      throw new HttpException(
        `Document not found: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * List all indexed documents
   */
  @Get('documents')
  async listDocuments() {
    try {
      return await this.pageIndexService.listDocuments();
    } catch (error) {
      throw new HttpException(
        `Failed to list documents: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete an indexed document
   */
  @Delete('document/:documentId')
  async deleteDocument(@Param('documentId') documentId: string) {
    try {
      return await this.pageIndexService.deleteDocument(documentId);
    } catch (error) {
      throw new HttpException(
        `Failed to delete document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search within an indexed document
   */
  @Post('search/:documentId')
  async searchDocument(
    @Param('documentId') documentId: string,
    @Body() searchDto: SearchDocumentDto,
  ): Promise<SearchResult[]> {
    if (!searchDto.query) {
      throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.pageIndexService.searchDocument(
        documentId,
        searchDto.query,
        searchDto.maxResults || 5,
      );
    } catch (error) {
      throw new HttpException(
        `Search failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
