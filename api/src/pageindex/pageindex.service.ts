// PageIndex Service - Document Indexing Service
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FormData = require('form-data');

// File interface for uploaded files
interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface IndexingStatus {
  document_id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  message?: string;
  tree_structure?: any;
  ocr_enabled?: boolean;
  table_extraction_enabled?: boolean;
}

export interface SearchResult {
  node_id: string;
  title: string;
  summary: string;
  relevance_score: number;
  start_page: number;
  end_page: number;
}

export interface DocumentInfo {
  document_id: string;
  filename: string;
  indexed_at: string;
}

export interface ServiceCapabilities {
  service: string;
  version: string;
  capabilities: {
    text_extraction: boolean;
    tree_structure_indexing: boolean;
    ocr: boolean;
    table_extraction: boolean;
    summarization: boolean;
    search: boolean;
  };
  configuration: {
    azure_openai_configured: boolean;
    document_intelligence_configured: boolean;
    document_intelligence_endpoint?: string;
    fallback_method: string;
  };
}

export interface ExtractedContent {
  filename: string;
  extraction_method: string;
  has_ocr_content: boolean;
  total_pages: number;
  total_tables: number;
  pages?: any[];
  text?: string;
  tables?: any[];
}

export interface HealthCheckResponse {
  status: string;
  azure_configured: boolean;
  model: string;
  document_intelligence_configured: boolean;
  ocr_available: boolean;
  table_extraction_available: boolean;
}

@Injectable()
export class PageIndexService {
  private readonly logger = new Logger(PageIndexService.name);
  private readonly pageIndexUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Default to localhost:8001 if not configured
    this.pageIndexUrl = this.configService.get<string>('PAGEINDEX_SERVICE_URL') || 'http://localhost:8001';
    this.logger.log(`PageIndex service URL: ${this.pageIndexUrl}`);
  }

  /**
   * Check health of the PageIndex service
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pageIndexUrl}/health`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`PageIndex health check failed: ${error.message}`);
      throw new Error('PageIndex service is not available');
    }
  }

  /**
   * Get service capabilities including OCR and table extraction status
   */
  async getCapabilities(): Promise<ServiceCapabilities> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pageIndexUrl}/capabilities`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get capabilities: ${error.message}`);
      throw new Error('Failed to get PageIndex capabilities');
    }
  }

  /**
   * Index a document asynchronously (returns immediately)
   * @param file - The uploaded file
   * @param addSummary - Generate summaries for each section
   * @param addDescription - Generate document description
   * @param useOcr - Use Azure Document Intelligence for OCR (scanned documents)
   * @param extractTables - Extract and include tables in the content
   */
  async indexDocumentAsync(
    file: UploadedFile,
    addSummary: boolean = true,
    addDescription: boolean = false,
    useOcr: boolean = true,
    extractTables: boolean = true,
  ): Promise<{ document_id: string; status: string; message: string; ocr_enabled?: boolean; table_extraction_enabled?: boolean }> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const queryParams = new URLSearchParams({
        add_summary: String(addSummary),
        add_description: String(addDescription),
        use_ocr: String(useOcr),
        extract_tables: String(extractTables),
      });

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pageIndexUrl}/index?${queryParams.toString()}`,
          formData,
          {
            headers: formData.getHeaders(),
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to index document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Index a document synchronously (waits for completion)
   * @param file - The uploaded file
   * @param addSummary - Generate summaries for each section
   * @param addDescription - Generate document description
   * @param useOcr - Use Azure Document Intelligence for OCR (scanned documents)
   * @param extractTables - Extract and include tables in the content
   */
  async indexDocumentSync(
    file: UploadedFile,
    addSummary: boolean = true,
    addDescription: boolean = false,
    useOcr: boolean = true,
    extractTables: boolean = true,
  ): Promise<{ document_id: string; structure: any; ocr_used?: boolean; tables_extracted?: number }> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const queryParams = new URLSearchParams({
        add_summary: String(addSummary),
        add_description: String(addDescription),
        use_ocr: String(useOcr),
        extract_tables: String(extractTables),
      });

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pageIndexUrl}/index-sync?${queryParams.toString()}`,
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 300000, // 5 minutes for sync processing
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to index document synchronously: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract text and tables from a document using OCR (without tree indexing)
   * @param file - The uploaded file
   * @param includeTables - Include table extraction
   * @param outputFormat - 'full', 'text', or 'tables'
   */
  async extractDocument(
    file: UploadedFile,
    includeTables: boolean = true,
    outputFormat: 'full' | 'text' | 'tables' = 'full',
  ): Promise<ExtractedContent> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const queryParams = new URLSearchParams({
        include_tables: String(includeTables),
        output_format: outputFormat,
      });

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pageIndexUrl}/extract?${queryParams.toString()}`,
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 300000, // 5 minutes for extraction
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to extract document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get indexing status for a document
   */
  async getIndexingStatus(documentId: string): Promise<IndexingStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pageIndexUrl}/status/${documentId}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get indexing status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the tree structure of an indexed document
   */
  async getDocumentTree(documentId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pageIndexUrl}/document/${documentId}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get document tree: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all indexed documents
   */
  async listDocuments(): Promise<{ documents: DocumentInfo[] }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pageIndexUrl}/documents`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an indexed document
   */
  async deleteDocument(documentId: string): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.pageIndexUrl}/document/${documentId}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search within an indexed document
   */
  async searchDocument(
    documentId: string,
    query: string,
    maxResults: number = 5,
  ): Promise<SearchResult[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pageIndexUrl}/search`, {
          document_id: documentId,
          query,
          max_results: maxResults,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to search document: ${error.message}`);
      throw error;
    }
  }
}
