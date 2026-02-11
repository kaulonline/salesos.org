import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebFormsService } from './web-forms.service';
import { PrismaService } from '../database/prisma.service';

describe('WebFormsService', () => {
  let service: WebFormsService;

  const mockPrisma = {
    webForm: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    webFormSubmission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    lead: {
      create: jest.fn(),
    },
  };

  const mockForm = {
    id: 'form-1',
    name: 'Contact Us',
    description: 'Contact form',
    slug: 'contact-us-abc12345',
    fields: [
      { name: 'firstName', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'message', type: 'textarea', required: false },
    ],
    settings: { submitButtonText: 'Submit' },
    styling: { backgroundColor: '#fff' },
    successMessage: 'Thank you!',
    successRedirectUrl: 'https://example.com/thanks',
    assignmentRuleId: null,
    defaultOwnerId: 'owner-1',
    isActive: true,
    submissionCount: 5,
    lastSubmissionAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
  };

  const mockSubmission = {
    id: 'sub-1',
    formId: 'form-1',
    data: { firstName: 'John', email: 'john@test.com', message: 'Hello' },
    status: 'PENDING',
    processedAt: null,
    errorMessage: null,
    createdLeadId: null,
    createdContactId: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    referrer: 'https://google.com',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebFormsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WebFormsService>(WebFormsService);
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    it('should create a web form with generated slug', async () => {
      mockPrisma.webForm.create.mockResolvedValue(mockForm);

      const result = await service.create('user-1', {
        name: 'Contact Us',
        description: 'Contact form',
        fields: [{ name: 'firstName', type: 'text', required: true } as any],
      });

      expect(result).toEqual(mockForm);
      expect(mockPrisma.webForm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Contact Us',
            createdBy: 'user-1',
            slug: expect.stringMatching(/^contact-us-[a-f0-9]+$/),
          }),
        }),
      );
    });

    it('should default isActive to true', async () => {
      mockPrisma.webForm.create.mockResolvedValue(mockForm);

      await service.create('user-1', { name: 'Test Form' });

      expect(mockPrisma.webForm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should set custom success message', async () => {
      mockPrisma.webForm.create.mockResolvedValue(mockForm);

      await service.create('user-1', {
        name: 'Test Form',
        thankYouMessage: 'Custom thanks!',
      });

      expect(mockPrisma.webForm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            successMessage: 'Custom thanks!',
          }),
        }),
      );
    });

    it('should default success message when not provided', async () => {
      mockPrisma.webForm.create.mockResolvedValue(mockForm);

      await service.create('user-1', { name: 'Test' });

      expect(mockPrisma.webForm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            successMessage: 'Thank you for your submission!',
          }),
        }),
      );
    });

    it('should handle empty fields and settings', async () => {
      mockPrisma.webForm.create.mockResolvedValue(mockForm);

      await service.create('user-1', { name: 'Minimal Form' });

      expect(mockPrisma.webForm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fields: [],
            settings: {},
            styling: {},
          }),
        }),
      );
    });
  });

  // ============================================
  // findAll
  // ============================================

  describe('findAll', () => {
    it('should return all forms with submission counts', async () => {
      mockPrisma.webForm.findMany.mockResolvedValue([
        { ...mockForm, _count: { submissions: 5 } },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrisma.webForm.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { _count: { select: { submissions: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.webForm.findMany.mockResolvedValue([]);

      await service.findAll({ isActive: true });

      expect(mockPrisma.webForm.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should return empty array when no forms exist', async () => {
      mockPrisma.webForm.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // findOne
  // ============================================

  describe('findOne', () => {
    it('should return a form by id', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue({
        ...mockForm,
        _count: { submissions: 5 },
      });

      const result = await service.findOne('form-1');

      expect(result.id).toBe('form-1');
    });

    it('should throw NotFoundException when form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // findBySlug
  // ============================================

  describe('findBySlug', () => {
    it('should return public form data by slug', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);

      const result = await service.findBySlug('contact-us-abc12345');

      expect(result).toEqual({
        id: mockForm.id,
        name: mockForm.name,
        description: mockForm.description,
        fields: mockForm.fields,
        styling: mockForm.styling,
        settings: mockForm.settings,
      });
    });

    it('should throw NotFoundException when slug not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing-slug')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when form is inactive', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue({
        ...mockForm,
        isActive: false,
      });

      await expect(service.findBySlug('contact-us-abc12345')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // update
  // ============================================

  describe('update', () => {
    it('should update a form', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webForm.update.mockResolvedValue({
        ...mockForm,
        name: 'Updated Form',
      });

      const result = await service.update('form-1', { name: 'Updated Form' });

      expect(result.name).toBe('Updated Form');
    });

    it('should throw NotFoundException when form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update fields, settings, and styling', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webForm.update.mockResolvedValue(mockForm);

      const newFields = [{ name: 'phone', type: 'tel', required: false } as any];
      const newSettings = { submitButtonText: 'Send' } as any;
      const newStyling = { backgroundColor: '#000' } as any;

      await service.update('form-1', {
        fields: newFields,
        settings: newSettings,
        styling: newStyling,
      });

      expect(mockPrisma.webForm.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fields: newFields,
            settings: newSettings,
            styling: newStyling,
          }),
        }),
      );
    });
  });

  // ============================================
  // remove
  // ============================================

  describe('remove', () => {
    it('should delete a form', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webForm.delete.mockResolvedValue(mockForm);

      const result = await service.remove('form-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.webForm.delete).toHaveBeenCalledWith({ where: { id: 'form-1' } });
    });

    it('should throw NotFoundException when form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // submit
  // ============================================

  describe('submit', () => {
    const metadata = {
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      referrer: 'https://google.com',
    };

    it('should submit a form successfully', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.create.mockResolvedValue(mockSubmission);
      mockPrisma.webForm.update.mockResolvedValue(mockForm);
      // Mock processSubmission internals (called asynchronously)
      mockPrisma.webFormSubmission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.lead.create.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.webFormSubmission.update.mockResolvedValue(mockSubmission);

      const result = await service.submit(
        'contact-us-abc12345',
        { data: { firstName: 'John', email: 'john@test.com' } },
        metadata,
      );

      expect(result.success).toBe(true);
      expect(result.submissionId).toBe('sub-1');
      expect(result.message).toBe('Thank you!');
      expect(result.redirectUrl).toBe('https://example.com/thanks');
    });

    it('should throw NotFoundException when form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(
        service.submit('missing-slug', { data: {} }, metadata),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when form is inactive', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue({
        ...mockForm,
        isActive: false,
      });

      await expect(
        service.submit('contact-us-abc12345', { data: {} }, metadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing required field', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);

      await expect(
        service.submit(
          'contact-us-abc12345',
          { data: { message: 'Hello' } }, // missing firstName and email
          metadata,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment submission count on form', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.create.mockResolvedValue(mockSubmission);
      mockPrisma.webForm.update.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.lead.create.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.webFormSubmission.update.mockResolvedValue(mockSubmission);

      await service.submit(
        'contact-us-abc12345',
        { data: { firstName: 'John', email: 'john@test.com' } },
        metadata,
      );

      expect(mockPrisma.webForm.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should store submission metadata', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.create.mockResolvedValue(mockSubmission);
      mockPrisma.webForm.update.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.lead.create.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.webFormSubmission.update.mockResolvedValue(mockSubmission);

      await service.submit(
        'contact-us-abc12345',
        { data: { firstName: 'John', email: 'john@test.com' } },
        metadata,
      );

      expect(mockPrisma.webFormSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
            referrer: 'https://google.com',
          }),
        }),
      );
    });
  });

  // ============================================
  // getSubmissions
  // ============================================

  describe('getSubmissions', () => {
    it('should return paginated submissions', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.findMany.mockResolvedValue([mockSubmission]);
      mockPrisma.webFormSubmission.count.mockResolvedValue(1);

      const result = await service.getSubmissions('form-1');

      expect(result.submissions).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should throw NotFoundException when form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(service.getSubmissions('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('should apply status filter', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.findMany.mockResolvedValue([]);
      mockPrisma.webFormSubmission.count.mockResolvedValue(0);

      await service.getSubmissions('form-1', { status: 'PROCESSED' as any });

      expect(mockPrisma.webFormSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PROCESSED' }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.findMany.mockResolvedValue([]);
      mockPrisma.webFormSubmission.count.mockResolvedValue(0);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      await service.getSubmissions('form-1', { startDate, endDate });

      expect(mockPrisma.webFormSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it('should handle custom pagination', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webFormSubmission.findMany.mockResolvedValue([]);
      mockPrisma.webFormSubmission.count.mockResolvedValue(50);

      const result = await service.getSubmissions('form-1', { page: 3, limit: 10 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(5);
      expect(mockPrisma.webFormSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  // ============================================
  // getSubmission
  // ============================================

  describe('getSubmission', () => {
    it('should return a single submission', async () => {
      mockPrisma.webFormSubmission.findFirst.mockResolvedValue(mockSubmission);

      const result = await service.getSubmission('form-1', 'sub-1');

      expect(result).toEqual(mockSubmission);
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockPrisma.webFormSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.getSubmission('form-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // deleteSubmission
  // ============================================

  describe('deleteSubmission', () => {
    it('should delete a submission', async () => {
      mockPrisma.webFormSubmission.findFirst.mockResolvedValue(mockSubmission);
      mockPrisma.webFormSubmission.delete.mockResolvedValue(mockSubmission);

      const result = await service.deleteSubmission('form-1', 'sub-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.webFormSubmission.delete).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockPrisma.webFormSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteSubmission('form-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getEmbedCode
  // ============================================

  describe('getEmbedCode', () => {
    it('should return embed code snippets', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);

      const result = await service.getEmbedCode('form-1', 'https://app.salesos.org');

      expect(result.slug).toBe(mockForm.slug);
      expect(result.iframe).toContain(`/forms/embed/${mockForm.slug}`);
      expect(result.iframe).toContain('iframe');
      expect(result.script).toContain(`data-form-slug="${mockForm.slug}"`);
      expect(result.directUrl).toBe(`https://app.salesos.org/forms/${mockForm.slug}`);
    });

    it('should throw NotFoundException when form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(
        service.getEmbedCode('missing-id', 'https://app.salesos.org'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // regenerateSlug
  // ============================================

  describe('regenerateSlug', () => {
    it('should generate a new slug for the form', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webForm.update.mockResolvedValue({
        ...mockForm,
        slug: 'contact-us-newslug1',
      });

      const result = await service.regenerateSlug('form-1');

      expect(mockPrisma.webForm.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'form-1' },
          data: { slug: expect.stringMatching(/^contact-us-[a-f0-9]+$/) },
        }),
      );
    });

    it('should throw NotFoundException when form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(service.regenerateSlug('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getStats
  // ============================================

  describe('getStats', () => {
    it('should return form-specific stats when formId provided', async () => {
      mockPrisma.webFormSubmission.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(15);
      mockPrisma.webFormSubmission.groupBy.mockResolvedValue([
        { status: 'PROCESSED', _count: 80 },
        { status: 'PENDING', _count: 15 },
        { status: 'FAILED', _count: 5 },
      ]);

      const result = await service.getStats('form-1');

      expect(result).toEqual({
        total: 100,
        byStatus: { PROCESSED: 80, PENDING: 15, FAILED: 5 },
        lastWeek: 15,
      });
    });

    it('should return global stats when no formId', async () => {
      mockPrisma.webForm.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);
      mockPrisma.webFormSubmission.count
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(50);

      const result = await service.getStats();

      expect(result).toEqual({
        forms: { total: 10, active: 8 },
        submissions: { total: 500, lastWeek: 50 },
      });
    });
  });

  // ============================================
  // clone
  // ============================================

  describe('clone', () => {
    it('should clone a form with a new name and slug', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webForm.create.mockResolvedValue({
        ...mockForm,
        id: 'form-2',
        name: 'Cloned Form',
        slug: 'cloned-form-xyz',
        isActive: false,
      });

      const result = await service.clone('form-1', 'Cloned Form', 'user-2');

      expect(result.name).toBe('Cloned Form');
      expect(result.isActive).toBe(false);
      expect(mockPrisma.webForm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Cloned Form',
            createdBy: 'user-2',
            isActive: false,
            description: mockForm.description,
            successMessage: mockForm.successMessage,
            successRedirectUrl: mockForm.successRedirectUrl,
          }),
        }),
      );
    });

    it('should throw NotFoundException when original form not found', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(null);

      await expect(
        service.clone('missing-id', 'Clone', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should clone form with new slug, not the original slug', async () => {
      mockPrisma.webForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.webForm.create.mockResolvedValue({
        ...mockForm,
        id: 'form-2',
        name: 'New Form',
        slug: 'new-form-abcd1234',
      });

      await service.clone('form-1', 'New Form', 'user-1');

      expect(mockPrisma.webForm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/^new-form-[a-f0-9]+$/),
          }),
        }),
      );
    });
  });

  // ============================================
  // generateSlug (tested through public methods)
  // ============================================

  describe('slug generation', () => {
    it('should generate URL-friendly slugs with random suffix', async () => {
      mockPrisma.webForm.create.mockImplementation(async (args) => ({
        ...mockForm,
        slug: args.data.slug,
      }));

      const result = await service.create('user-1', { name: 'My Amazing Form!' });

      expect(result.slug).toMatch(/^my-amazing-form-[a-f0-9]{8}$/);
    });

    it('should strip leading/trailing dashes from slug', async () => {
      mockPrisma.webForm.create.mockImplementation(async (args) => ({
        ...mockForm,
        slug: args.data.slug,
      }));

      const result = await service.create('user-1', { name: '---Test---' });

      expect(result.slug).toMatch(/^test-[a-f0-9]{8}$/);
    });

    it('should handle special characters in form name', async () => {
      mockPrisma.webForm.create.mockImplementation(async (args) => ({
        ...mockForm,
        slug: args.data.slug,
      }));

      const result = await service.create('user-1', { name: 'Hello @World! #2025' });

      expect(result.slug).toMatch(/^hello-world-2025-[a-f0-9]{8}$/);
    });
  });
});
