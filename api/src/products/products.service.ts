import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductType, ProductCategory } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProductDto: CreateProductDto, organizationId: string) {
    // Check if SKU already exists within the organization
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        sku: createProductDto.sku,
        organizationId,
      },
    });

    if (existingProduct) {
      throw new BadRequestException(`Product with SKU "${createProductDto.sku}" already exists`);
    }

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        ownerId: userId,
        unitPrice: createProductDto.unitPrice ?? createProductDto.listPrice,
        organizationId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(
    userId: string,
    filters?: {
      type?: ProductType;
      category?: ProductCategory;
      isActive?: boolean;
      search?: string;
    },
    isAdmin?: boolean,
    organizationId?: string,
  ) {
    const where: any = {};

    // Add organization filter (mandatory for tenant isolation)
    where.organizationId = organizationId;

    // Non-admins can only see active products
    if (!isAdmin) {
      where.isActive = true;
    } else if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lineItems: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            quote: {
              select: {
                id: true,
                quoteNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async findBySku(sku: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        sku,
        organizationId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" not found`);
    }

    return product;
  }

  async update(id: string, userId: string, updateProductDto: UpdateProductDto, isAdmin?: boolean, organizationId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Any user in the organization can update products (organization-level access)
    // The organizationId filter above ensures tenant isolation

    // Check if SKU is being changed and already exists within the organization
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          sku: updateProductDto.sku,
          organizationId,
        },
      });

      if (existingProduct) {
        throw new BadRequestException(`Product with SKU "${updateProductDto.sku}" already exists`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, isAdmin?: boolean, organizationId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        lineItems: {
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Any user in the organization can delete products (organization-level access)
    // The organizationId filter above ensures tenant isolation

    // Check if product is used in any quotes
    if (product.lineItems.length > 0) {
      throw new BadRequestException('Cannot delete product that is used in quotes. Deactivate it instead.');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async getStats(userId: string, isAdmin?: boolean, organizationId?: string) {
    const where: any = isAdmin ? {} : { isActive: true };

    // Add organization filter (mandatory for tenant isolation)
    where.organizationId = organizationId;

    const [
      totalProducts,
      byType,
      byCategory,
      activeCount,
      inactiveCount,
    ] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.groupBy({
        by: ['type'],
        where,
        _count: true,
        _avg: { listPrice: true },
      }),
      this.prisma.product.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      this.prisma.product.count({ where: { ...where, isActive: true } }),
      this.prisma.product.count({ where: { ...where, isActive: false } }),
    ]);

    return {
      total: totalProducts,
      active: activeCount,
      inactive: inactiveCount,
      byType: byType.map(t => ({
        type: t.type,
        count: t._count,
        avgPrice: t._avg.listPrice || 0,
      })),
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count,
      })),
    };
  }

  // Bulk Operations
  async bulkUpdate(ids: string[], userId: string, updates: UpdateProductDto, isAdmin?: boolean, organizationId?: string) {
    // Any user in the organization can update products (organization-level access)
    // The organizationId filter ensures tenant isolation
    const where: any = {
      id: { in: ids },
      organizationId,
    };

    return this.prisma.product.updateMany({
      where,
      data: updates,
    });
  }

  async bulkDelete(ids: string[], userId: string, isAdmin?: boolean, organizationId?: string) {
    // Any user in the organization can delete products (organization-level access)
    // The organizationId filter ensures tenant isolation
    const where: any = {
      id: { in: ids },
      organizationId,
    };

    // Check if any products are used in quotes
    const usedProducts = await this.prisma.quoteLineItem.findMany({
      where: { productId: { in: ids } },
      select: { productId: true },
    });

    if (usedProducts.length > 0) {
      throw new BadRequestException('Cannot delete products that are used in quotes. Deactivate them instead.');
    }

    return this.prisma.product.deleteMany({
      where,
    });
  }
}
