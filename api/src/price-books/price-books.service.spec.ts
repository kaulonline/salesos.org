import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PriceBooksService } from './price-books.service';
import { PrismaService } from '../database/prisma.service';

describe('PriceBooksService', () => {
  let service: PriceBooksService;

  const mockPrisma = {
    priceBook: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    priceBookEntry: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceBooksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PriceBooksService>(PriceBooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===================== create =====================
  describe('create', () => {
    it('should create a price book with default currency', async () => {
      const dto = { name: 'Standard 2025' };
      const created = {
        id: 'pb-1',
        name: 'Standard 2025',
        currency: 'USD',
        isStandard: false,
        createdBy: 'user-1',
        entries: [],
        _count: { entries: 0 },
      };
      mockPrisma.priceBook.create.mockResolvedValue(created);

      const result = await service.create('user-1', dto as any);

      expect(result).toEqual(created);
      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Standard 2025',
          currency: 'USD',
          isStandard: false,
          createdBy: 'user-1',
        }),
        include: {
          entries: { take: 10 },
          _count: { select: { entries: true } },
        },
      });
    });

    it('should create a price book with custom currency', async () => {
      const dto = { name: 'EU Price Book', currency: 'EUR' };
      mockPrisma.priceBook.create.mockResolvedValue({ id: 'pb-2', currency: 'EUR' });

      const result = await service.create('user-1', dto as any);

      expect(result.currency).toBe('EUR');
      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currency: 'EUR' }),
        }),
      );
    });

    it('should create a standard price book when isStandard is true', async () => {
      const dto = { name: 'Standard', isStandard: true };
      mockPrisma.priceBook.create.mockResolvedValue({ id: 'pb-3', isStandard: true });

      await service.create('user-1', dto as any);

      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isStandard: true }),
        }),
      );
    });

    it('should pass validity dates through to create', async () => {
      const dto = { name: 'Q1 Prices', validFrom: '2025-01-01', validTo: '2025-03-31' };
      mockPrisma.priceBook.create.mockResolvedValue({ id: 'pb-4' });

      await service.create('user-1', dto as any);

      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            validFrom: '2025-01-01',
            validTo: '2025-03-31',
          }),
        }),
      );
    });
  });

  // ===================== findAll =====================
  describe('findAll', () => {
    it('should return all price books with no filters', async () => {
      const books = [
        { id: 'pb-1', name: 'Standard', isStandard: true, _count: { entries: 5 } },
        { id: 'pb-2', name: 'Custom', isStandard: false, _count: { entries: 3 } },
      ];
      mockPrisma.priceBook.findMany.mockResolvedValue(books);

      const result = await service.findAll();

      expect(result).toEqual(books);
      expect(mockPrisma.priceBook.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { entries: true } } },
        orderBy: [{ isStandard: 'desc' }, { name: 'asc' }],
      });
    });

    it('should filter by isActive', async () => {
      mockPrisma.priceBook.findMany.mockResolvedValue([]);

      await service.findAll({ isActive: true });

      expect(mockPrisma.priceBook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should filter by isStandard', async () => {
      mockPrisma.priceBook.findMany.mockResolvedValue([]);

      await service.findAll({ isStandard: true });

      expect(mockPrisma.priceBook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isStandard: true } }),
      );
    });

    it('should filter by currency', async () => {
      mockPrisma.priceBook.findMany.mockResolvedValue([]);

      await service.findAll({ currency: 'EUR' });

      expect(mockPrisma.priceBook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { currency: 'EUR' } }),
      );
    });

    it('should apply all filters simultaneously', async () => {
      mockPrisma.priceBook.findMany.mockResolvedValue([]);

      await service.findAll({ isActive: true, isStandard: false, currency: 'GBP' });

      expect(mockPrisma.priceBook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, isStandard: false, currency: 'GBP' },
        }),
      );
    });
  });

  // ===================== findOne =====================
  describe('findOne', () => {
    it('should return a price book by ID with entries', async () => {
      const priceBook = {
        id: 'pb-1',
        name: 'Standard',
        entries: [{ id: 'e-1', productId: 'prod-1', listPrice: 100 }],
        _count: { entries: 1 },
      };
      mockPrisma.priceBook.findUnique.mockResolvedValue(priceBook);

      const result = await service.findOne('pb-1');

      expect(result).toEqual(priceBook);
      expect(mockPrisma.priceBook.findUnique).toHaveBeenCalledWith({
        where: { id: 'pb-1' },
        include: {
          entries: { orderBy: { createdAt: 'desc' } },
          _count: { select: { entries: true } },
        },
      });
    });

    it('should throw NotFoundException when price book not found', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue(null);

      await expect(service.findOne('pb-missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ===================== findStandard =====================
  describe('findStandard', () => {
    it('should return the standard active price book', async () => {
      const standard = { id: 'pb-1', name: 'Standard', isStandard: true, isActive: true };
      mockPrisma.priceBook.findFirst.mockResolvedValue(standard);

      const result = await service.findStandard();

      expect(result).toEqual(standard);
      expect(mockPrisma.priceBook.findFirst).toHaveBeenCalledWith({
        where: { isStandard: true, isActive: true },
        include: {
          entries: true,
          _count: { select: { entries: true } },
        },
      });
    });

    it('should throw NotFoundException when no standard price book exists', async () => {
      mockPrisma.priceBook.findFirst.mockResolvedValue(null);

      await expect(service.findStandard()).rejects.toThrow(NotFoundException);
    });
  });

  // ===================== update =====================
  describe('update', () => {
    it('should update a price book', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1', name: 'Old Name' });
      mockPrisma.priceBook.update.mockResolvedValue({
        id: 'pb-1',
        name: 'New Name',
        _count: { entries: 0 },
      });

      const result = await service.update('pb-1', { name: 'New Name' } as any);

      expect(result.name).toBe('New Name');
      expect(mockPrisma.priceBook.update).toHaveBeenCalledWith({
        where: { id: 'pb-1' },
        data: expect.objectContaining({ name: 'New Name' }),
        include: { _count: { select: { entries: true } } },
      });
    });

    it('should throw NotFoundException when price book not found', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue(null);

      await expect(service.update('pb-missing', { name: 'X' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should update isActive status', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1' });
      mockPrisma.priceBook.update.mockResolvedValue({ id: 'pb-1', isActive: false });

      await service.update('pb-1', { isActive: false } as any);

      expect(mockPrisma.priceBook.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  // ===================== remove =====================
  describe('remove', () => {
    it('should delete a non-standard price book', async () => {
      const priceBook = { id: 'pb-1', isStandard: false, _count: { entries: 0 } };
      mockPrisma.priceBook.findUnique.mockResolvedValue(priceBook);
      mockPrisma.priceBook.delete.mockResolvedValue(priceBook);

      const result = await service.remove('pb-1');

      expect(result).toEqual(priceBook);
      expect(mockPrisma.priceBook.delete).toHaveBeenCalledWith({ where: { id: 'pb-1' } });
    });

    it('should throw NotFoundException when price book not found', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue(null);

      await expect(service.remove('pb-missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to delete the standard price book', async () => {
      const standardBook = { id: 'pb-std', isStandard: true, _count: { entries: 5 } };
      mockPrisma.priceBook.findUnique.mockResolvedValue(standardBook);

      await expect(service.remove('pb-std')).rejects.toThrow(BadRequestException);
    });
  });

  // ===================== clone =====================
  describe('clone', () => {
    it('should clone a price book with all entries', async () => {
      const original = {
        id: 'pb-1',
        name: 'Original',
        description: 'Original desc',
        currency: 'USD',
        isStandard: true,
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2025-12-31'),
        entries: [
          { id: 'e-1', productId: 'prod-1', listPrice: 100, unitPrice: 90, minQuantity: 1, discountTiers: null },
          { id: 'e-2', productId: 'prod-2', listPrice: 200, unitPrice: 180, minQuantity: 5, discountTiers: [{ minQty: 10, discountPercent: 10 }] },
        ],
      };
      mockPrisma.priceBook.findUnique.mockResolvedValue(original);
      mockPrisma.priceBook.create.mockResolvedValue({
        id: 'pb-clone',
        name: 'Cloned Book',
        isStandard: false,
        entries: [],
        _count: { entries: 2 },
      });

      const result = await service.clone('pb-1', 'Cloned Book', 'user-1');

      expect(result.id).toBe('pb-clone');
      expect(result.name).toBe('Cloned Book');
      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Cloned Book',
          description: 'Original desc',
          currency: 'USD',
          isStandard: false,
          createdBy: 'user-1',
          entries: {
            create: expect.arrayContaining([
              expect.objectContaining({ productId: 'prod-1', listPrice: 100 }),
              expect.objectContaining({ productId: 'prod-2', listPrice: 200 }),
            ]),
          },
        }),
        include: {
          entries: true,
          _count: { select: { entries: true } },
        },
      });
    });

    it('should throw NotFoundException when original price book not found', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue(null);

      await expect(service.clone('pb-missing', 'Clone', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should always set isStandard to false on cloned book', async () => {
      const original = {
        id: 'pb-1',
        isStandard: true,
        description: null,
        currency: 'USD',
        validFrom: null,
        validTo: null,
        entries: [],
      };
      mockPrisma.priceBook.findUnique.mockResolvedValue(original);
      mockPrisma.priceBook.create.mockResolvedValue({ id: 'pb-clone', isStandard: false });

      await service.clone('pb-1', 'Clone', 'user-1');

      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isStandard: false }),
        }),
      );
    });
  });

  // ===================== getEntries =====================
  describe('getEntries', () => {
    it('should return all entries for a price book', async () => {
      const entries = [
        { id: 'e-1', priceBookId: 'pb-1', productId: 'prod-1', listPrice: 100 },
        { id: 'e-2', priceBookId: 'pb-1', productId: 'prod-2', listPrice: 200 },
      ];
      mockPrisma.priceBookEntry.findMany.mockResolvedValue(entries);

      const result = await service.getEntries('pb-1');

      expect(result).toEqual(entries);
      expect(mockPrisma.priceBookEntry.findMany).toHaveBeenCalledWith({
        where: { priceBookId: 'pb-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no entries exist', async () => {
      mockPrisma.priceBookEntry.findMany.mockResolvedValue([]);

      const result = await service.getEntries('pb-empty');

      expect(result).toEqual([]);
    });
  });

  // ===================== createEntry =====================
  describe('createEntry', () => {
    it('should create a price book entry', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1' });
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue(null);
      mockPrisma.priceBookEntry.create.mockResolvedValue({
        id: 'e-1',
        priceBookId: 'pb-1',
        productId: 'prod-1',
        listPrice: 100,
        unitPrice: 90,
        minQuantity: 1,
      });

      const dto = { productId: 'prod-1', listPrice: 100, unitPrice: 90 };
      const result = await service.createEntry('pb-1', dto as any);

      expect(result).toBeDefined();
      expect(result.listPrice).toBe(100);
      expect(mockPrisma.priceBookEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priceBookId: 'pb-1',
          productId: 'prod-1',
          listPrice: 100,
          unitPrice: 90,
          minQuantity: 1,
        }),
      });
    });

    it('should throw NotFoundException when price book not found', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue(null);

      await expect(
        service.createEntry('pb-missing', { productId: 'p1', listPrice: 50 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when product already exists in price book', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1' });
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({ id: 'e-existing' });

      await expect(
        service.createEntry('pb-1', { productId: 'prod-dup', listPrice: 50 } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should default minQuantity to 1 when not provided', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1' });
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue(null);
      mockPrisma.priceBookEntry.create.mockResolvedValue({ id: 'e-1' });

      await service.createEntry('pb-1', { productId: 'prod-1', listPrice: 100 } as any);

      expect(mockPrisma.priceBookEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ minQuantity: 1 }),
      });
    });

    it('should use provided minQuantity when specified', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1' });
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue(null);
      mockPrisma.priceBookEntry.create.mockResolvedValue({ id: 'e-1' });

      await service.createEntry('pb-1', { productId: 'prod-1', listPrice: 100, minQuantity: 10 } as any);

      expect(mockPrisma.priceBookEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ minQuantity: 10 }),
      });
    });
  });

  // ===================== createEntriesBulk =====================
  describe('createEntriesBulk', () => {
    it('should bulk create entries and return count', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1' });
      mockPrisma.priceBookEntry.createMany.mockResolvedValue({ count: 3 });

      const entries = [
        { productId: 'p1', listPrice: 10 },
        { productId: 'p2', listPrice: 20 },
        { productId: 'p3', listPrice: 30 },
      ];

      const result = await service.createEntriesBulk('pb-1', entries as any);

      expect(result).toEqual({ created: 3 });
      expect(mockPrisma.priceBookEntry.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ priceBookId: 'pb-1', productId: 'p1', listPrice: 10, minQuantity: 1 }),
          expect.objectContaining({ priceBookId: 'pb-1', productId: 'p2', listPrice: 20, minQuantity: 1 }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should throw NotFoundException when price book not found', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue(null);

      await expect(
        service.createEntriesBulk('pb-missing', [{ productId: 'p1', listPrice: 10 }] as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip duplicates without error', async () => {
      mockPrisma.priceBook.findUnique.mockResolvedValue({ id: 'pb-1' });
      mockPrisma.priceBookEntry.createMany.mockResolvedValue({ count: 1 });

      const entries = [
        { productId: 'p-existing', listPrice: 10 },
        { productId: 'p-new', listPrice: 20 },
      ];

      const result = await service.createEntriesBulk('pb-1', entries as any);

      expect(result).toEqual({ created: 1 });
    });
  });

  // ===================== updateEntry =====================
  describe('updateEntry', () => {
    it('should update an existing entry', async () => {
      mockPrisma.priceBookEntry.findFirst.mockResolvedValue({ id: 'e-1', priceBookId: 'pb-1' });
      mockPrisma.priceBookEntry.update.mockResolvedValue({
        id: 'e-1',
        listPrice: 150,
        unitPrice: 130,
      });

      const result = await service.updateEntry('pb-1', 'e-1', { listPrice: 150, unitPrice: 130 } as any);

      expect(result.listPrice).toBe(150);
      expect(mockPrisma.priceBookEntry.update).toHaveBeenCalledWith({
        where: { id: 'e-1' },
        data: expect.objectContaining({ listPrice: 150, unitPrice: 130 }),
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrisma.priceBookEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEntry('pb-1', 'e-missing', { listPrice: 100 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update entry isActive status', async () => {
      mockPrisma.priceBookEntry.findFirst.mockResolvedValue({ id: 'e-1', priceBookId: 'pb-1' });
      mockPrisma.priceBookEntry.update.mockResolvedValue({ id: 'e-1', isActive: false });

      await service.updateEntry('pb-1', 'e-1', { isActive: false } as any);

      expect(mockPrisma.priceBookEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should update discount tiers', async () => {
      mockPrisma.priceBookEntry.findFirst.mockResolvedValue({ id: 'e-1', priceBookId: 'pb-1' });
      const tiers = [{ minQty: 10, maxQty: 50, discountPercent: 5 }];
      mockPrisma.priceBookEntry.update.mockResolvedValue({ id: 'e-1', discountTiers: tiers });

      await service.updateEntry('pb-1', 'e-1', { discountTiers: tiers } as any);

      expect(mockPrisma.priceBookEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ discountTiers: tiers }),
        }),
      );
    });
  });

  // ===================== removeEntry =====================
  describe('removeEntry', () => {
    it('should delete an entry', async () => {
      mockPrisma.priceBookEntry.findFirst.mockResolvedValue({ id: 'e-1', priceBookId: 'pb-1' });
      mockPrisma.priceBookEntry.delete.mockResolvedValue({ id: 'e-1' });

      const result = await service.removeEntry('pb-1', 'e-1');

      expect(result).toEqual({ id: 'e-1' });
      expect(mockPrisma.priceBookEntry.delete).toHaveBeenCalledWith({ where: { id: 'e-1' } });
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrisma.priceBookEntry.findFirst.mockResolvedValue(null);

      await expect(service.removeEntry('pb-1', 'e-missing')).rejects.toThrow(NotFoundException);
    });

    it('should verify entry belongs to the specified price book', async () => {
      mockPrisma.priceBookEntry.findFirst.mockResolvedValue(null);

      await expect(service.removeEntry('pb-wrong', 'e-1')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.priceBookEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 'e-1', priceBookId: 'pb-wrong' },
      });
    });
  });

  // ===================== getProductPrice =====================
  describe('getProductPrice', () => {
    it('should return unit price for a product without discount tiers', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({
        listPrice: 100,
        unitPrice: 80,
        discountTiers: null,
      });

      const result = await service.getProductPrice('pb-1', 'prod-1', 1);

      expect(result).toEqual({
        listPrice: 100,
        unitPrice: 80,
        quantity: 1,
        discountPercent: 0,
        discountedUnitPrice: 80,
        totalPrice: 80,
      });
    });

    it('should use listPrice when unitPrice is null', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({
        listPrice: 100,
        unitPrice: null,
        discountTiers: null,
      });

      const result = await service.getProductPrice('pb-1', 'prod-1', 1);

      expect(result.unitPrice).toBe(100);
      expect(result.discountedUnitPrice).toBe(100);
      expect(result.totalPrice).toBe(100);
    });

    it('should apply discount tier based on quantity', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({
        listPrice: 100,
        unitPrice: 100,
        discountTiers: [
          { minQty: 1, maxQty: 9, discountPercent: 0 },
          { minQty: 10, maxQty: 49, discountPercent: 10 },
          { minQty: 50, maxQty: null, discountPercent: 20 },
        ],
      });

      const result = await service.getProductPrice('pb-1', 'prod-1', 25);

      expect(result.discountPercent).toBe(10);
      expect(result.discountedUnitPrice).toBe(90);
      expect(result.totalPrice).toBe(2250);
    });

    it('should apply highest tier discount for large quantities', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({
        listPrice: 50,
        unitPrice: 50,
        discountTiers: [
          { minQty: 1, maxQty: 10, discountPercent: 0 },
          { minQty: 11, maxQty: null, discountPercent: 15 },
        ],
      });

      const result = await service.getProductPrice('pb-1', 'prod-1', 100);

      expect(result.discountPercent).toBe(15);
      expect(result.discountedUnitPrice).toBe(42.5);
      expect(result.totalPrice).toBe(4250);
    });

    it('should throw NotFoundException when product not in price book', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue(null);

      await expect(
        service.getProductPrice('pb-1', 'prod-missing', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should default quantity to 1', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({
        listPrice: 100,
        unitPrice: 100,
        discountTiers: null,
      });

      const result = await service.getProductPrice('pb-1', 'prod-1');

      expect(result.quantity).toBe(1);
      expect(result.totalPrice).toBe(100);
    });

    it('should handle empty discount tiers array', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({
        listPrice: 200,
        unitPrice: 180,
        discountTiers: [],
      });

      const result = await service.getProductPrice('pb-1', 'prod-1', 5);

      expect(result.discountPercent).toBe(0);
      expect(result.discountedUnitPrice).toBe(180);
      expect(result.totalPrice).toBe(900);
    });

    it('should match the first applicable tier and break', async () => {
      mockPrisma.priceBookEntry.findUnique.mockResolvedValue({
        listPrice: 100,
        unitPrice: 100,
        discountTiers: [
          { minQty: 5, maxQty: 20, discountPercent: 5 },
          { minQty: 10, maxQty: 30, discountPercent: 10 },
        ],
      });

      // quantity=15 matches both tiers, but the first one should be used
      const result = await service.getProductPrice('pb-1', 'prod-1', 15);

      expect(result.discountPercent).toBe(5);
    });
  });

  // ===================== getStats =====================
  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      mockPrisma.priceBook.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(8)   // active
        .mockResolvedValueOnce(1);  // standard
      mockPrisma.priceBookEntry.count.mockResolvedValue(50);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        standard: 1,
        totalEntries: 50,
      });
    });

    it('should handle zero counts', async () => {
      mockPrisma.priceBook.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.priceBookEntry.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        standard: 0,
        totalEntries: 0,
      });
    });
  });
});
