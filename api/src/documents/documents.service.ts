import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PageIndexService } from '../pageindex/pageindex.service';
import { IndexingStatus } from '@prisma/client';

export interface CreateDocumentDto {
  filename: string;
  documentId: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface DocumentResponse {
  id: string;
  filename: string;
  documentId: string;
  status: IndexingStatus;
  progress: number;
  treeStructure?: any;
  summary?: string;
  pageCount?: number;
  createdAt: Date;
  indexedAt?: Date;
}

@Injectable()
export class DocumentsService implements OnModuleInit {
  private readonly logger = new Logger(DocumentsService.name);
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pageIndexService: PageIndexService,
  ) {}

  /**
   * On module init, start background sync job
   */
  async onModuleInit() {
    // Initial sync on startup
    await this.syncFromPageIndex();
    
    // Set up periodic sync every 30 seconds to catch any missed updates
    this.syncInterval = setInterval(async () => {
      await this.refreshPendingDocuments();
    }, 30000);
    
    this.logger.log('Document sync service initialized');
  }

  /**
   * Refresh status of all pending/processing documents
   */
  async refreshPendingDocuments(): Promise<void> {
    try {
      const pendingDocs = await this.prisma.indexedDocument.findMany({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      });

      for (const doc of pendingDocs) {
        try {
          const status = await this.pageIndexService.getIndexingStatus(doc.documentId);
          
          if (status.status === 'complete') {
            await this.prisma.indexedDocument.update({
              where: { id: doc.id },
              data: {
                status: 'COMPLETE',
                progress: 100,
                indexedAt: new Date(),
                treeStructure: status.tree_structure || null,
              },
            });
            this.logger.log(`Auto-updated document ${doc.filename} to COMPLETE`);
          } else if (status.status === 'error') {
            await this.prisma.indexedDocument.update({
              where: { id: doc.id },
              data: {
                status: 'ERROR',
                progress: status.progress || 0,
              },
            });
            this.logger.warn(`Document ${doc.filename} failed indexing`);
          } else if (status.status === 'processing') {
            await this.prisma.indexedDocument.update({
              where: { id: doc.id },
              data: {
                status: 'PROCESSING',
                progress: status.progress || 0,
              },
            });
          }
        } catch (error) {
          // Check if document exists in PageIndex
          const pageIndexDocs = await this.pageIndexService.listDocuments();
          const existsInPageIndex = pageIndexDocs.documents?.some(
            (d) => d.document_id === doc.documentId
          );
          
          if (existsInPageIndex) {
            // Document exists and is complete
            await this.prisma.indexedDocument.update({
              where: { id: doc.id },
              data: {
                status: 'COMPLETE',
                progress: 100,
                indexedAt: new Date(),
              },
            });
            this.logger.log(`Recovered document ${doc.filename} status to COMPLETE`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to refresh pending documents: ${error.message}`);
    }
  }

  /**
   * Create a new indexed document record
   */
  async create(data: CreateDocumentDto): Promise<DocumentResponse> {
    const document = await this.prisma.indexedDocument.create({
      data: {
        filename: data.filename,
        documentId: data.documentId,
        mimeType: data.mimeType || 'application/pdf',
        sizeBytes: data.sizeBytes,
        status: 'PENDING',
        progress: 0,
      },
    });

    return this.mapToResponse(document);
  }

  /**
   * Get all indexed documents (auto-refreshes stale pending documents)
   */
  async findAll(): Promise<DocumentResponse[]> {
    // First, refresh any documents stuck in pending for more than 10 seconds
    const staleCutoff = new Date(Date.now() - 10000);
    const staleDocs = await this.prisma.indexedDocument.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { lt: staleCutoff },
      },
    });

    // Quick check for stale documents
    if (staleDocs.length > 0) {
      await this.refreshPendingDocuments();
    }

    const documents = await this.prisma.indexedDocument.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return documents.map(doc => this.mapToResponse(doc));
  }

  /**
   * Get a single document by ID
   */
  async findOne(id: string): Promise<DocumentResponse> {
    const document = await this.prisma.indexedDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.mapToResponse(document);
  }

  /**
   * Get a document by PageIndex document ID
   */
  async findByDocumentId(documentId: string): Promise<DocumentResponse | null> {
    const document = await this.prisma.indexedDocument.findUnique({
      where: { documentId },
    });

    return document ? this.mapToResponse(document) : null;
  }

  /**
   * Update document indexing status
   */
  async updateStatus(
    documentId: string,
    status: IndexingStatus,
    progress: number,
    errorMessage?: string,
  ): Promise<DocumentResponse> {
    const updateData: any = {
      status,
      progress,
    };

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (status === 'COMPLETE') {
      updateData.indexedAt = new Date();
    }

    const document = await this.prisma.indexedDocument.update({
      where: { documentId },
      data: updateData,
    });

    return this.mapToResponse(document);
  }

  /**
   * Update document with tree structure after indexing
   */
  async updateTreeStructure(
    documentId: string,
    treeStructure: any,
    summary?: string,
    pageCount?: number,
  ): Promise<DocumentResponse> {
    const document = await this.prisma.indexedDocument.update({
      where: { documentId },
      data: {
        treeStructure,
        summary,
        pageCount,
        status: 'COMPLETE',
        progress: 100,
        indexedAt: new Date(),
      },
    });

    return this.mapToResponse(document);
  }

  /**
   * Delete a document with cascade effect
   * - Deletes from PostgreSQL database
   * - Deletes from PageIndex service (storage + in-memory)
   */
  async remove(id: string): Promise<{ deletedFromDB: boolean; deletedFromPageIndex: boolean; filename: string }> {
    const document = await this.prisma.indexedDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    const result = {
      deletedFromDB: false,
      deletedFromPageIndex: false,
      filename: document.filename,
    };

    // Step 1: Delete from PageIndex service (both in-memory and persisted storage)
    try {
      await this.pageIndexService.deleteDocument(document.documentId);
      result.deletedFromPageIndex = true;
      this.logger.log(`Deleted document ${document.filename} from PageIndex service`);
    } catch (error) {
      this.logger.warn(`Failed to delete document from PageIndex (may already be deleted): ${error.message}`);
      // Continue with database deletion even if PageIndex deletion fails
    }

    // Step 2: Delete from PostgreSQL database
    try {
      await this.prisma.indexedDocument.delete({
        where: { id },
      });
      result.deletedFromDB = true;
      this.logger.log(`Deleted document ${document.filename} from database`);
    } catch (error) {
      this.logger.error(`Failed to delete document from database: ${error.message}`);
      throw error;
    }

    return result;
  }

  /**
   * Delete a document by its PageIndex document ID
   */
  async removeByDocumentId(documentId: string): Promise<{ deletedFromDB: boolean; deletedFromPageIndex: boolean; filename: string }> {
    const document = await this.prisma.indexedDocument.findUnique({
      where: { documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with documentId ${documentId} not found`);
    }

    return this.remove(document.id);
  }

  /**
   * Sync documents from PageIndex service to database
   * This pulls any documents that exist in PageIndex but not in our database
   * AND updates existing documents that are stuck in PENDING status
   */
  async syncFromPageIndex(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const pageIndexDocs = await this.pageIndexService.listDocuments();
      
      for (const doc of pageIndexDocs.documents || []) {
        try {
          // Check if document already exists in database
          const existing = await this.prisma.indexedDocument.findUnique({
            where: { documentId: doc.document_id },
          });

          if (!existing) {
            // Create new record
            await this.prisma.indexedDocument.create({
              data: {
                filename: doc.filename,
                documentId: doc.document_id,
                status: 'COMPLETE',
                progress: 100,
                indexedAt: new Date(doc.indexed_at),
              },
            });
            synced++;
            this.logger.log(`Synced new document: ${doc.filename}`);
          } else if (existing.status !== 'COMPLETE') {
            // Update existing document that's stuck in PENDING/PROCESSING
            await this.prisma.indexedDocument.update({
              where: { id: existing.id },
              data: {
                status: 'COMPLETE',
                progress: 100,
                indexedAt: new Date(doc.indexed_at),
              },
            });
            synced++;
            this.logger.log(`Updated document status: ${doc.filename}`);
          }
        } catch (error) {
          errors.push(`Failed to sync ${doc.filename}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch PageIndex documents: ${error.message}`);
    }

    return { synced, errors };
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponse(document: any): DocumentResponse {
    return {
      id: document.id,
      filename: document.filename,
      documentId: document.documentId,
      status: document.status,
      progress: document.progress,
      treeStructure: document.treeStructure,
      summary: document.summary,
      pageCount: document.pageCount,
      createdAt: document.createdAt,
      indexedAt: document.indexedAt,
    };
  }
}
