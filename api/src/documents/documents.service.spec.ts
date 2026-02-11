import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../database/prisma.service';
import { PageIndexService } from '../pageindex/pageindex.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: PrismaService;
  let pageIndexService: PageIndexService;

  const mockDocument = {
    id: 'doc-1',
    uploadedFileId: null,
    filename: 'test-document.pdf',
    documentId: 'pageindex-doc-123',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    status: 'COMPLETE',
    progress: 100,
    errorMessage: null,
    treeStructure: { sections: [] },
    summary: 'A test document summary',
    pageCount: 5,
    createdAt: new Date('2025-01-01'),
    indexedAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockPendingDocument = {
    ...mockDocument,
    id: 'doc-2',
    documentId: 'pageindex-doc-456',
    filename: 'pending-document.pdf',
    status: 'PENDING',
    progress: 0,
    indexedAt: null,
    treeStructure: null,
    summary: null,
    pageCount: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockPrisma = {
    indexedDocument: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockPageIndexService = {
    listDocuments: jest.fn(),
    getIndexingStatus: jest.fn(),
    deleteDocument: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PageIndexService, useValue: mockPageIndexService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prisma = module.get<PrismaService>(PrismaService);
    pageIndexService = module.get<PageIndexService>(PageIndexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new document record with PENDING status', async () => {
      const createDto = {
        filename: 'new-doc.pdf',
        documentId: 'pageindex-new-123',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
      };

      const createdDoc = {
        ...mockDocument,
        id: 'doc-new',
        filename: createDto.filename,
        documentId: createDto.documentId,
        mimeType: createDto.mimeType,
        sizeBytes: createDto.sizeBytes,
        status: 'PENDING',
        progress: 0,
        indexedAt: null,
        treeStructure: null,
        summary: null,
        pageCount: null,
      };

      mockPrisma.indexedDocument.create.mockResolvedValue(createdDoc);

      const result = await service.create(createDto);

      expect(mockPrisma.indexedDocument.create).toHaveBeenCalledWith({
        data: {
          filename: 'new-doc.pdf',
          documentId: 'pageindex-new-123',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          status: 'PENDING',
          progress: 0,
        },
      });
      expect(result.filename).toBe('new-doc.pdf');
      expect(result.documentId).toBe('pageindex-new-123');
    });

    it('should default mimeType to application/pdf when not provided', async () => {
      const createDto = {
        filename: 'doc.pdf',
        documentId: 'pageindex-999',
      };

      mockPrisma.indexedDocument.create.mockResolvedValue({
        ...mockDocument,
        ...createDto,
        status: 'PENDING',
        progress: 0,
      });

      await service.create(createDto);

      expect(mockPrisma.indexedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mimeType: 'application/pdf',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all documents ordered by createdAt desc', async () => {
      // First call: find stale pending docs (returns empty)
      mockPrisma.indexedDocument.findMany
        .mockResolvedValueOnce([])  // stale docs query
        .mockResolvedValueOnce([mockDocument]); // main findMany

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('doc-1');
      expect(result[0].filename).toBe('test-document.pdf');
    });

    it('should refresh pending documents if stale ones exist', async () => {
      const stalePendingDoc = {
        ...mockPendingDocument,
        createdAt: new Date('2020-01-01'), // very old, definitely stale
      };

      // First call: stale docs query returns a stale doc
      mockPrisma.indexedDocument.findMany
        .mockResolvedValueOnce([stalePendingDoc])  // stale docs query
        .mockResolvedValueOnce([stalePendingDoc])  // refreshPendingDocuments inner findMany
        .mockResolvedValueOnce([mockDocument]);     // final findMany

      mockPageIndexService.getIndexingStatus.mockResolvedValue({
        document_id: stalePendingDoc.documentId,
        status: 'complete',
        progress: 100,
        tree_structure: { sections: [] },
      });
      mockPrisma.indexedDocument.update.mockResolvedValue(mockDocument);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no documents exist', async () => {
      mockPrisma.indexedDocument.findMany
        .mockResolvedValueOnce([])  // stale docs query
        .mockResolvedValueOnce([]); // main findMany

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a document by ID', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findOne('doc-1');

      expect(result.id).toBe('doc-1');
      expect(result.filename).toBe('test-document.pdf');
      expect(result.status).toBe('COMPLETE');
      expect(mockPrisma.indexedDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByDocumentId', () => {
    it('should return a document by its PageIndex document ID', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findByDocumentId('pageindex-doc-123');

      expect(result).not.toBeNull();
      expect(result!.documentId).toBe('pageindex-doc-123');
      expect(mockPrisma.indexedDocument.findUnique).toHaveBeenCalledWith({
        where: { documentId: 'pageindex-doc-123' },
      });
    });

    it('should return null when document is not found', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(null);

      const result = await service.findByDocumentId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update document status and progress', async () => {
      const updatedDoc = { ...mockDocument, status: 'PROCESSING', progress: 50 };
      mockPrisma.indexedDocument.update.mockResolvedValue(updatedDoc);

      const result = await service.updateStatus('pageindex-doc-123', 'PROCESSING' as any, 50);

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { documentId: 'pageindex-doc-123' },
        data: {
          status: 'PROCESSING',
          progress: 50,
        },
      });
      expect(result.status).toBe('PROCESSING');
      expect(result.progress).toBe(50);
    });

    it('should set indexedAt when status is COMPLETE', async () => {
      const completedDoc = { ...mockDocument, status: 'COMPLETE', progress: 100 };
      mockPrisma.indexedDocument.update.mockResolvedValue(completedDoc);

      await service.updateStatus('pageindex-doc-123', 'COMPLETE' as any, 100);

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { documentId: 'pageindex-doc-123' },
        data: expect.objectContaining({
          status: 'COMPLETE',
          progress: 100,
          indexedAt: expect.any(Date),
        }),
      });
    });

    it('should include error message when provided', async () => {
      const errorDoc = { ...mockDocument, status: 'ERROR', progress: 0, errorMessage: 'Parse failed' };
      mockPrisma.indexedDocument.update.mockResolvedValue(errorDoc);

      await service.updateStatus('pageindex-doc-123', 'ERROR' as any, 0, 'Parse failed');

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { documentId: 'pageindex-doc-123' },
        data: expect.objectContaining({
          status: 'ERROR',
          progress: 0,
          errorMessage: 'Parse failed',
        }),
      });
    });
  });

  describe('updateTreeStructure', () => {
    it('should update tree structure, summary, and page count', async () => {
      const treeStructure = { sections: [{ title: 'Section 1' }] };
      const updatedDoc = {
        ...mockDocument,
        treeStructure,
        summary: 'Updated summary',
        pageCount: 10,
      };
      mockPrisma.indexedDocument.update.mockResolvedValue(updatedDoc);

      const result = await service.updateTreeStructure(
        'pageindex-doc-123',
        treeStructure,
        'Updated summary',
        10,
      );

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { documentId: 'pageindex-doc-123' },
        data: {
          treeStructure,
          summary: 'Updated summary',
          pageCount: 10,
          status: 'COMPLETE',
          progress: 100,
          indexedAt: expect.any(Date),
        },
      });
      expect(result.treeStructure).toEqual(treeStructure);
      expect(result.summary).toBe('Updated summary');
      expect(result.pageCount).toBe(10);
    });
  });

  describe('remove', () => {
    it('should delete document from both PageIndex and database', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument);
      mockPageIndexService.deleteDocument.mockResolvedValue({ message: 'Deleted' });
      mockPrisma.indexedDocument.delete.mockResolvedValue(mockDocument);

      const result = await service.remove('doc-1');

      expect(result.deletedFromDB).toBe(true);
      expect(result.deletedFromPageIndex).toBe(true);
      expect(result.filename).toBe('test-document.pdf');
      expect(mockPageIndexService.deleteDocument).toHaveBeenCalledWith('pageindex-doc-123');
      expect(mockPrisma.indexedDocument.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should still delete from DB when PageIndex deletion fails', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument);
      mockPageIndexService.deleteDocument.mockRejectedValue(new Error('PageIndex unavailable'));
      mockPrisma.indexedDocument.delete.mockResolvedValue(mockDocument);

      const result = await service.remove('doc-1');

      expect(result.deletedFromDB).toBe(true);
      expect(result.deletedFromPageIndex).toBe(false);
      expect(result.filename).toBe('test-document.pdf');
    });

    it('should throw when DB deletion fails', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument);
      mockPageIndexService.deleteDocument.mockResolvedValue({ message: 'Deleted' });
      mockPrisma.indexedDocument.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('doc-1')).rejects.toThrow('DB error');
    });
  });

  describe('removeByDocumentId', () => {
    it('should find document by documentId and delegate to remove', async () => {
      mockPrisma.indexedDocument.findUnique
        .mockResolvedValueOnce(mockDocument)  // removeByDocumentId lookup
        .mockResolvedValueOnce(mockDocument); // remove lookup
      mockPageIndexService.deleteDocument.mockResolvedValue({ message: 'Deleted' });
      mockPrisma.indexedDocument.delete.mockResolvedValue(mockDocument);

      const result = await service.removeByDocumentId('pageindex-doc-123');

      expect(result.deletedFromDB).toBe(true);
      expect(result.deletedFromPageIndex).toBe(true);
      expect(result.filename).toBe('test-document.pdf');
    });

    it('should throw NotFoundException when documentId not found', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(null);

      await expect(service.removeByDocumentId('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refreshPendingDocuments', () => {
    it('should update pending documents to COMPLETE when indexing is done', async () => {
      mockPrisma.indexedDocument.findMany.mockResolvedValue([mockPendingDocument]);
      mockPageIndexService.getIndexingStatus.mockResolvedValue({
        document_id: mockPendingDocument.documentId,
        status: 'complete',
        progress: 100,
        tree_structure: { sections: [] },
      });
      mockPrisma.indexedDocument.update.mockResolvedValue({
        ...mockPendingDocument,
        status: 'COMPLETE',
        progress: 100,
      });

      await service.refreshPendingDocuments();

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: expect.objectContaining({
          status: 'COMPLETE',
          progress: 100,
          indexedAt: expect.any(Date),
        }),
      });
    });

    it('should update pending documents to ERROR when indexing fails', async () => {
      mockPrisma.indexedDocument.findMany.mockResolvedValue([mockPendingDocument]);
      mockPageIndexService.getIndexingStatus.mockResolvedValue({
        document_id: mockPendingDocument.documentId,
        status: 'error',
        progress: 30,
      });
      mockPrisma.indexedDocument.update.mockResolvedValue({
        ...mockPendingDocument,
        status: 'ERROR',
        progress: 30,
      });

      await service.refreshPendingDocuments();

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: {
          status: 'ERROR',
          progress: 30,
        },
      });
    });

    it('should update progress for documents still processing', async () => {
      mockPrisma.indexedDocument.findMany.mockResolvedValue([mockPendingDocument]);
      mockPageIndexService.getIndexingStatus.mockResolvedValue({
        document_id: mockPendingDocument.documentId,
        status: 'processing',
        progress: 60,
      });
      mockPrisma.indexedDocument.update.mockResolvedValue({
        ...mockPendingDocument,
        status: 'PROCESSING',
        progress: 60,
      });

      await service.refreshPendingDocuments();

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: {
          status: 'PROCESSING',
          progress: 60,
        },
      });
    });

    it('should recover document status when getIndexingStatus fails but doc exists in list', async () => {
      mockPrisma.indexedDocument.findMany.mockResolvedValue([mockPendingDocument]);
      mockPageIndexService.getIndexingStatus.mockRejectedValue(new Error('Status API failed'));
      mockPageIndexService.listDocuments.mockResolvedValue({
        documents: [
          { document_id: mockPendingDocument.documentId, filename: 'pending-document.pdf', indexed_at: '2025-01-01T00:00:00Z' },
        ],
      });
      mockPrisma.indexedDocument.update.mockResolvedValue({
        ...mockPendingDocument,
        status: 'COMPLETE',
        progress: 100,
      });

      await service.refreshPendingDocuments();

      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: expect.objectContaining({
          status: 'COMPLETE',
          progress: 100,
        }),
      });
    });

    it('should not update when getIndexingStatus fails and doc is not in list', async () => {
      mockPrisma.indexedDocument.findMany.mockResolvedValue([mockPendingDocument]);
      mockPageIndexService.getIndexingStatus.mockRejectedValue(new Error('Status API failed'));
      mockPageIndexService.listDocuments.mockResolvedValue({ documents: [] });

      await service.refreshPendingDocuments();

      expect(mockPrisma.indexedDocument.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and not throw', async () => {
      mockPrisma.indexedDocument.findMany.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.refreshPendingDocuments()).resolves.toBeUndefined();
    });
  });

  describe('syncFromPageIndex', () => {
    it('should create new records for documents only in PageIndex', async () => {
      mockPageIndexService.listDocuments.mockResolvedValue({
        documents: [
          { document_id: 'new-pi-doc', filename: 'remote-doc.pdf', indexed_at: '2025-06-01T00:00:00Z' },
        ],
      });
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(null);
      mockPrisma.indexedDocument.create.mockResolvedValue({
        ...mockDocument,
        documentId: 'new-pi-doc',
        filename: 'remote-doc.pdf',
      });

      const result = await service.syncFromPageIndex();

      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.indexedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filename: 'remote-doc.pdf',
          documentId: 'new-pi-doc',
          status: 'COMPLETE',
          progress: 100,
        }),
      });
    });

    it('should update existing documents that are stuck in PENDING', async () => {
      mockPageIndexService.listDocuments.mockResolvedValue({
        documents: [
          { document_id: 'pageindex-doc-456', filename: 'pending-document.pdf', indexed_at: '2025-06-01T00:00:00Z' },
        ],
      });
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockPendingDocument);
      mockPrisma.indexedDocument.update.mockResolvedValue({
        ...mockPendingDocument,
        status: 'COMPLETE',
        progress: 100,
      });

      const result = await service.syncFromPageIndex();

      expect(result.synced).toBe(1);
      expect(mockPrisma.indexedDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: expect.objectContaining({
          status: 'COMPLETE',
          progress: 100,
        }),
      });
    });

    it('should skip documents already COMPLETE in database', async () => {
      mockPageIndexService.listDocuments.mockResolvedValue({
        documents: [
          { document_id: 'pageindex-doc-123', filename: 'test-document.pdf', indexed_at: '2025-01-01T00:00:00Z' },
        ],
      });
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument); // already COMPLETE

      const result = await service.syncFromPageIndex();

      expect(result.synced).toBe(0);
      expect(mockPrisma.indexedDocument.create).not.toHaveBeenCalled();
      expect(mockPrisma.indexedDocument.update).not.toHaveBeenCalled();
    });

    it('should handle PageIndex service errors gracefully', async () => {
      mockPageIndexService.listDocuments.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.syncFromPageIndex();

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to fetch PageIndex documents');
    });

    it('should collect per-document errors without stopping sync', async () => {
      mockPageIndexService.listDocuments.mockResolvedValue({
        documents: [
          { document_id: 'doc-ok', filename: 'good.pdf', indexed_at: '2025-06-01T00:00:00Z' },
          { document_id: 'doc-fail', filename: 'bad.pdf', indexed_at: '2025-06-01T00:00:00Z' },
        ],
      });
      mockPrisma.indexedDocument.findUnique
        .mockResolvedValueOnce(null)  // doc-ok: new
        .mockRejectedValueOnce(new Error('DB lookup failed')); // doc-fail: error
      mockPrisma.indexedDocument.create.mockResolvedValue(mockDocument);

      const result = await service.syncFromPageIndex();

      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('bad.pdf');
    });
  });

  describe('mapToResponse (via public methods)', () => {
    it('should map all expected fields in the response', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findOne('doc-1');

      expect(result).toEqual({
        id: 'doc-1',
        filename: 'test-document.pdf',
        documentId: 'pageindex-doc-123',
        status: 'COMPLETE',
        progress: 100,
        treeStructure: { sections: [] },
        summary: 'A test document summary',
        pageCount: 5,
        createdAt: mockDocument.createdAt,
        indexedAt: mockDocument.indexedAt,
      });
    });

    it('should not include extra database fields like uploadedFileId or updatedAt', async () => {
      mockPrisma.indexedDocument.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findOne('doc-1');

      expect(result).not.toHaveProperty('uploadedFileId');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('mimeType');
      expect(result).not.toHaveProperty('sizeBytes');
      expect(result).not.toHaveProperty('errorMessage');
    });
  });
});
