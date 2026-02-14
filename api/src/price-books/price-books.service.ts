import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePriceBookDto } from './dto/create-price-book.dto';
import { UpdatePriceBookDto } from './dto/update-price-book.dto';
import { CreatePriceBookEntryDto, UpdatePriceBookEntryDto } from './dto/price-book-entry.dto';

@Injectable()
export class PriceBooksService {
  private readonly logger = new Logger(PriceBooksService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePriceBookDto) {
    return this.prisma.priceBook.create({
      data: {
        name: dto.name,
        description: dto.description,
        currency: dto.currency ?? 'USD',
        isStandard: dto.isStandard ?? false,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
        createdBy: userId,
      },
      include: {
        entries: { take: 10 },
        _count: { select: { entries: true } },
      },
    });
  }

  async findAll(filters?: {
    isActive?: boolean;
    isStandard?: boolean;
    currency?: string;
  }) {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isStandard !== undefined) {
      where.isStandard = filters.isStandard;
    }

    if (filters?.currency) {
      where.currency = filters.currency;
    }

    return this.prisma.priceBook.findMany({
      where,
      include: {
        _count: { select: { entries: true } },
      },
      orderBy: [
        { isStandard: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const priceBook = await this.prisma.priceBook.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { entries: true } },
      },
    });

    if (!priceBook) {
      throw new NotFoundException(`Price book with ID "${id}" not found`);
    }

    return priceBook;
  }

  async findStandard() {
    const priceBook = await this.prisma.priceBook.findFirst({
      where: { isStandard: true, isActive: true },
      include: {
        entries: true,
        _count: { select: { entries: true } },
      },
    });

    if (!priceBook) {
      throw new NotFoundException('No standard price book found');
    }

    return priceBook;
  }

  async update(id: string, dto: UpdatePriceBookDto) {
    const priceBook = await this.prisma.priceBook.findUnique({
      where: { id },
    });

    if (!priceBook) {
      throw new NotFoundException(`Price book with ID "${id}" not found`);
    }

    return this.prisma.priceBook.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        currency: dto.currency,
        isActive: dto.isActive,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      },
      include: {
        _count: { select: { entries: true } },
      },
    });
  }

  async remove(id: string) {
    const priceBook = await this.prisma.priceBook.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });

    if (!priceBook) {
      throw new NotFoundException(`Price book with ID "${id}" not found`);
    }

    if (priceBook.isStandard) {
      throw new BadRequestException('Cannot delete the standard price book');
    }

    return this.prisma.priceBook.delete({
      where: { id },
    });
  }

  async clone(id: string, newName: string, userId: string) {
    const priceBook = await this.prisma.priceBook.findUnique({
      where: { id },
      include: { entries: true },
    });

    if (!priceBook) {
      throw new NotFoundException(`Price book with ID "${id}" not found`);
    }

    return this.prisma.priceBook.create({
      data: {
        name: newName,
        description: priceBook.description,
        currency: priceBook.currency,
        isStandard: false,
        validFrom: priceBook.validFrom,
        validTo: priceBook.validTo,
        createdBy: userId,
        entries: {
          create: priceBook.entries.map(e => ({
            productId: e.productId,
            listPrice: e.listPrice,
            unitPrice: e.unitPrice,
            minQuantity: e.minQuantity,
            discountTiers: e.discountTiers as any,
          })),
        },
      },
      include: {
        entries: true,
        _count: { select: { entries: true } },
      },
    });
  }

  // Price Book Entries
  async getEntries(priceBookId: string) {
    return this.prisma.priceBookEntry.findMany({
      where: { priceBookId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEntry(priceBookId: string, dto: CreatePriceBookEntryDto) {
    const priceBook = await this.prisma.priceBook.findUnique({
      where: { id: priceBookId },
    });

    if (!priceBook) {
      throw new NotFoundException(`Price book with ID "${priceBookId}" not found`);
    }

    // Check for duplicate product entry
    const existing = await this.prisma.priceBookEntry.findUnique({
      where: {
        priceBookId_productId: {
          priceBookId,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Product already exists in this price book');
    }

    return this.prisma.priceBookEntry.create({
      data: {
        priceBookId,
        productId: dto.productId,
        listPrice: dto.listPrice,
        unitPrice: dto.unitPrice,
        minQuantity: dto.minQuantity ?? 1,
        discountTiers: dto.discountTiers,
      },
    });
  }

  async createEntriesBulk(priceBookId: string, entries: CreatePriceBookEntryDto[]) {
    const priceBook = await this.prisma.priceBook.findUnique({
      where: { id: priceBookId },
    });

    if (!priceBook) {
      throw new NotFoundException(`Price book with ID "${priceBookId}" not found`);
    }

    const created = await this.prisma.priceBookEntry.createMany({
      data: entries.map(e => ({
        priceBookId,
        productId: e.productId,
        listPrice: e.listPrice,
        unitPrice: e.unitPrice,
        minQuantity: e.minQuantity ?? 1,
        discountTiers: e.discountTiers,
      })),
      skipDuplicates: true,
    });

    return { created: created.count };
  }

  async updateEntry(priceBookId: string, entryId: string, dto: UpdatePriceBookEntryDto) {
    const entry = await this.prisma.priceBookEntry.findFirst({
      where: { id: entryId, priceBookId },
    });

    if (!entry) {
      throw new NotFoundException(`Price book entry not found`);
    }

    return this.prisma.priceBookEntry.update({
      where: { id: entryId },
      data: {
        listPrice: dto.listPrice,
        unitPrice: dto.unitPrice,
        minQuantity: dto.minQuantity,
        discountTiers: dto.discountTiers,
        isActive: dto.isActive,
      },
    });
  }

  async removeEntry(priceBookId: string, entryId: string) {
    const entry = await this.prisma.priceBookEntry.findFirst({
      where: { id: entryId, priceBookId },
    });

    if (!entry) {
      throw new NotFoundException(`Price book entry not found`);
    }

    return this.prisma.priceBookEntry.delete({
      where: { id: entryId },
    });
  }

  async getProductPrice(priceBookId: string, productId: string, quantity: number = 1) {
    const entry = await this.prisma.priceBookEntry.findUnique({
      where: {
        priceBookId_productId: { priceBookId, productId },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Product not found in price book`);
    }

    const price = entry.unitPrice ?? entry.listPrice;
    let discountPercent = 0;

    // Apply discount tiers
    if (entry.discountTiers && Array.isArray(entry.discountTiers)) {
      const tiers = entry.discountTiers as any[];
      for (const tier of tiers) {
        if (quantity >= tier.minQty && (!tier.maxQty || quantity <= tier.maxQty)) {
          discountPercent = tier.discountPercent;
          break;
        }
      }
    }

    const discountedPrice = price * (1 - discountPercent / 100);
    const totalPrice = discountedPrice * quantity;

    return {
      listPrice: entry.listPrice,
      unitPrice: entry.unitPrice ?? entry.listPrice,
      quantity,
      discountPercent,
      discountedUnitPrice: discountedPrice,
      totalPrice,
    };
  }

  async getStats() {
    const [total, active, standard] = await Promise.all([
      this.prisma.priceBook.count(),
      this.prisma.priceBook.count({ where: { isActive: true } }),
      this.prisma.priceBook.count({ where: { isStandard: true } }),
    ]);

    const totalEntries = await this.prisma.priceBookEntry.count();

    return {
      total,
      active,
      inactive: total - active,
      standard,
      totalEntries,
    };
  }
}
