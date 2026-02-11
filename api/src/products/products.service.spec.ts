import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../database/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProduct = {
    id: 'product-1',
    ownerId: 'user-1',
    organizationId: 'org-1',
    name: 'Enterprise License',
    sku: 'ENT-001',
    description: 'Enterprise software license',
    type: 'LICENSE',
    category: 'SOFTWARE',
    listPrice: 5000,
    unitPrice: 4500,
    costPrice: 2000,
    currency: 'USD',
    billingFrequency: 'ANNUAL',
    isActive: true,
    features: ['SSO', 'API Access'],
    tags: ['enterprise', 'license'],
    metadata: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    owner: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  };

  const mockPrisma = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    quoteLineItem: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      name: 'New Product',
      sku: 'NP-001',
      description: 'A new product',
      type: 'PRODUCT' as any,
      category: 'SOFTWARE' as any,
      listPrice: 1000,
      unitPrice: 900,
      features: ['Feature A'],
      tags: ['new'],
    };

    it('should create a product when SKU does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({
        ...mockProduct,
        ...createDto,
        ownerId: 'user-1',
        organizationId: 'org-1',
      });

      const result = await service.create('user-1', createDto, 'org-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('New Product');
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { sku: 'NP-001', organizationId: 'org-1' },
      });
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'user-1',
            organizationId: 'org-1',
            unitPrice: 900,
          }),
          include: expect.objectContaining({
            owner: expect.objectContaining({
              select: { id: true, name: true, email: true },
            }),
          }),
        }),
      );
    });

    it('should use listPrice as unitPrice when unitPrice is not provided', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const dtoWithoutUnitPrice = {
        name: 'Simple Product',
        sku: 'SP-001',
        listPrice: 500,
      };

      await service.create('user-1', dtoWithoutUnitPrice as any, 'org-1');

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitPrice: 500,
          }),
        }),
      );
    });

    it('should throw BadRequestException when SKU already exists in organization', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(
        service.create('user-1', createDto, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with message containing the duplicate SKU', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(
        service.create('user-1', createDto, 'org-1'),
      ).rejects.toThrow(`Product with SKU "${createDto.sku}" already exists`);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all active products for non-admin', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAll('user-1', {}, false, 'org-1');

      expect(result).toEqual([mockProduct]);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            isActive: true,
          }),
          orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        }),
      );
    });

    it('should return all products (including inactive) for admin without isActive filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAll('user-1', {}, true, 'org-1');

      expect(result).toEqual([mockProduct]);
      const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBeUndefined();
    });

    it('should respect isActive filter for admin when provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-1', { isActive: false }, true, 'org-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it('should filter by type when provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-1', { type: 'SERVICE' as any }, true, 'org-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'SERVICE',
          }),
        }),
      );
    });

    it('should filter by category when provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-1', { category: 'HARDWARE' as any }, true, 'org-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'HARDWARE',
          }),
        }),
      );
    });

    it('should apply search across name, sku, and description', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-1', { search: 'enterprise' }, true, 'org-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'enterprise', mode: 'insensitive' } },
              { sku: { contains: 'enterprise', mode: 'insensitive' } },
              { description: { contains: 'enterprise', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should handle empty filters for non-admin', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-1', undefined, false, 'org-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            isActive: true,
          }),
        }),
      );
    });

    it('should include owner select in response', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-1', {}, true, 'org-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            owner: expect.objectContaining({
              select: { id: true, name: true, email: true },
            }),
          }),
        }),
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the product when found', async () => {
      const productWithLineItems = { ...mockProduct, lineItems: [] };
      mockPrisma.product.findFirst.mockResolvedValue(productWithLineItems);

      const result = await service.findOne('product-1', 'org-1');

      expect(result).toEqual(productWithLineItems);
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1', organizationId: 'org-1' },
          include: expect.objectContaining({
            lineItems: expect.objectContaining({
              take: 10,
              orderBy: { createdAt: 'desc' },
            }),
          }),
        }),
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with descriptive message', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'org-1'),
      ).rejects.toThrow('Product with ID "non-existent" not found');
    });

    it('should include recent quote line items with quote details', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ ...mockProduct, lineItems: [] });

      await service.findOne('product-1', 'org-1');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            lineItems: expect.objectContaining({
              include: expect.objectContaining({
                quote: expect.objectContaining({
                  select: { id: true, quoteNumber: true, status: true },
                }),
              }),
            }),
          }),
        }),
      );
    });
  });

  // ─── findBySku ──────────────────────────────────────────────────────────────

  describe('findBySku', () => {
    it('should return the product when found by SKU', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findBySku('ENT-001', 'org-1');

      expect(result).toEqual(mockProduct);
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sku: 'ENT-001', organizationId: 'org-1' },
        }),
      );
    });

    it('should throw NotFoundException when product with SKU does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findBySku('UNKNOWN-SKU', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with descriptive message including SKU', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findBySku('UNKNOWN-SKU', 'org-1'),
      ).rejects.toThrow('Product with SKU "UNKNOWN-SKU" not found');
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update the product when found', async () => {
      const updatedProduct = { ...mockProduct, name: 'Updated Product' };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update('product-1', 'user-1', { name: 'Updated Product' } as any, true, 'org-1');

      expect(result.name).toBe('Updated Product');
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1' },
          data: { name: 'Updated Product' },
        }),
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'user-1', { name: 'Foo' } as any, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow updating SKU when new SKU does not exist', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce(mockProduct) // finding the product
        .mockResolvedValueOnce(null); // checking duplicate SKU
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, sku: 'NEW-SKU' });

      const result = await service.update('product-1', 'user-1', { sku: 'NEW-SKU' } as any, true, 'org-1');

      expect(result.sku).toBe('NEW-SKU');
    });

    it('should throw BadRequestException when updating to an existing SKU', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce(mockProduct) // finding the product
        .mockResolvedValueOnce({ id: 'other-product', sku: 'EXISTING-SKU' }); // duplicate found

      await expect(
        service.update('product-1', 'user-1', { sku: 'EXISTING-SKU' } as any, true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not check for duplicate SKU when SKU is the same', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce(mockProduct);
      mockPrisma.product.update.mockResolvedValue(mockProduct);

      await service.update('product-1', 'user-1', { sku: 'ENT-001' } as any, true, 'org-1');

      // findFirst called only once (for finding the product, not for duplicate check)
      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should not check for duplicate SKU when SKU is not provided', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, name: 'Updated' });

      await service.update('product-1', 'user-1', { name: 'Updated' } as any, true, 'org-1');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should include owner in the response', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue(mockProduct);

      await service.update('product-1', 'user-1', { name: 'Updated' } as any, true, 'org-1');

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            owner: expect.objectContaining({
              select: { id: true, name: true, email: true },
            }),
          }),
        }),
      );
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete the product when it has no line items', async () => {
      const productNoItems = { ...mockProduct, lineItems: [] };
      mockPrisma.product.findFirst.mockResolvedValue(productNoItems);
      mockPrisma.product.delete.mockResolvedValue(productNoItems);

      const result = await service.remove('product-1', 'user-1', true, 'org-1');

      expect(result).toEqual(productNoItems);
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when product is used in quotes', async () => {
      const productWithItems = { ...mockProduct, lineItems: [{ id: 'li-1' }] };
      mockPrisma.product.findFirst.mockResolvedValue(productWithItems);

      await expect(
        service.remove('product-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with deactivation suggestion', async () => {
      const productWithItems = { ...mockProduct, lineItems: [{ id: 'li-1' }] };
      mockPrisma.product.findFirst.mockResolvedValue(productWithItems);

      await expect(
        service.remove('product-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow('Cannot delete product that is used in quotes. Deactivate it instead.');
    });

    it('should filter by organizationId for tenant isolation', async () => {
      const productNoItems = { ...mockProduct, lineItems: [] };
      mockPrisma.product.findFirst.mockResolvedValue(productNoItems);
      mockPrisma.product.delete.mockResolvedValue(productNoItems);

      await service.remove('product-1', 'user-1', true, 'org-1');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'product-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });
  });

  // ─── getStats ───────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return aggregate product statistics for admin', async () => {
      mockPrisma.product.count
        .mockResolvedValueOnce(20) // totalProducts
        .mockResolvedValueOnce(18) // activeCount
        .mockResolvedValueOnce(2); // inactiveCount
      mockPrisma.product.groupBy
        .mockResolvedValueOnce([
          { type: 'PRODUCT', _count: 10, _avg: { listPrice: 100 } },
          { type: 'SERVICE', _count: 10, _avg: { listPrice: 200 } },
        ])
        .mockResolvedValueOnce([
          { category: 'SOFTWARE', _count: 12 },
          { category: 'HARDWARE', _count: 8 },
        ]);

      const result = await service.getStats('user-1', true, 'org-1');

      expect(result.total).toBe(20);
      expect(result.active).toBe(18);
      expect(result.inactive).toBe(2);
      expect(result.byType).toEqual([
        { type: 'PRODUCT', count: 10, avgPrice: 100 },
        { type: 'SERVICE', count: 10, avgPrice: 200 },
      ]);
      expect(result.byCategory).toEqual([
        { category: 'SOFTWARE', count: 12 },
        { category: 'HARDWARE', count: 8 },
      ]);
    });

    it('should handle zero products gracefully', async () => {
      mockPrisma.product.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.product.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStats('user-1', true, 'org-1');

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.inactive).toBe(0);
      expect(result.byType).toEqual([]);
      expect(result.byCategory).toEqual([]);
    });

    it('should use isActive filter for non-admin base where', async () => {
      mockPrisma.product.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(0);
      mockPrisma.product.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getStats('user-1', false, 'org-1');

      // For non-admin, base where includes isActive: true
      expect(mockPrisma.product.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should handle null avgPrice in byType', async () => {
      mockPrisma.product.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);
      mockPrisma.product.groupBy
        .mockResolvedValueOnce([
          { type: 'BUNDLE', _count: 5, _avg: { listPrice: null } },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getStats('user-1', true, 'org-1');

      expect(result.byType).toEqual([
        { type: 'BUNDLE', count: 5, avgPrice: 0 },
      ]);
    });
  });

  // ─── bulkUpdate ─────────────────────────────────────────────────────────────

  describe('bulkUpdate', () => {
    it('should update multiple products by IDs', async () => {
      mockPrisma.product.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdate(
        ['prod-1', 'prod-2', 'prod-3'],
        'user-1',
        { isActive: false } as any,
        true,
        'org-1',
      );

      expect(result).toEqual({ count: 3 });
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['prod-1', 'prod-2', 'prod-3'] },
          organizationId: 'org-1',
        },
        data: { isActive: false },
      });
    });

    it('should return count of 0 when no products match', async () => {
      mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.bulkUpdate(
        ['non-existent'],
        'user-1',
        { isActive: false } as any,
        true,
        'org-1',
      );

      expect(result).toEqual({ count: 0 });
    });

    it('should filter by organizationId for tenant isolation', async () => {
      mockPrisma.product.updateMany.mockResolvedValue({ count: 2 });

      await service.bulkUpdate(['prod-1', 'prod-2'], 'user-1', { name: 'Updated' } as any, false, 'org-1');

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
          }),
        }),
      );
    });
  });

  // ─── bulkDelete ─────────────────────────────────────────────────────────────

  describe('bulkDelete', () => {
    it('should delete multiple products when none are used in quotes', async () => {
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);
      mockPrisma.product.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkDelete(
        ['prod-1', 'prod-2', 'prod-3'],
        'user-1',
        true,
        'org-1',
      );

      expect(result).toEqual({ count: 3 });
      expect(mockPrisma.quoteLineItem.findMany).toHaveBeenCalledWith({
        where: { productId: { in: ['prod-1', 'prod-2', 'prod-3'] } },
        select: { productId: true },
      });
      expect(mockPrisma.product.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['prod-1', 'prod-2', 'prod-3'] },
          organizationId: 'org-1',
        },
      });
    });

    it('should throw BadRequestException when any products are used in quotes', async () => {
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([
        { productId: 'prod-1' },
      ]);

      await expect(
        service.bulkDelete(['prod-1', 'prod-2'], 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with deactivation suggestion on bulk delete', async () => {
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([
        { productId: 'prod-2' },
      ]);

      await expect(
        service.bulkDelete(['prod-1', 'prod-2'], 'user-1', true, 'org-1'),
      ).rejects.toThrow('Cannot delete products that are used in quotes. Deactivate them instead.');
    });

    it('should filter by organizationId for tenant isolation', async () => {
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);
      mockPrisma.product.deleteMany.mockResolvedValue({ count: 1 });

      await service.bulkDelete(['prod-1'], 'user-1', false, 'org-1');

      expect(mockPrisma.product.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
          }),
        }),
      );
    });
  });
});
