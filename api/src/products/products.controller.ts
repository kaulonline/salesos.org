import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductType, ProductCategory } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Request() req,
    @Body() createProductDto: CreateProductDto,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    return this.productsService.create(userId, createProductDto, organizationId);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('type') type?: ProductType,
    @Query('category') category?: ProductCategory,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @CurrentOrganization() organizationId?: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.productsService.findAll(userId, {
      type,
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    }, isAdmin, organizationId);
  }

  @Get('stats')
  getStats(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.productsService.getStats(userId, isAdmin, organizationId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.productsService.findOne(id, organizationId);
  }

  @Get('sku/:sku')
  findBySku(
    @Param('sku') sku: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.productsService.findBySku(sku, organizationId);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.productsService.update(id, userId, updateProductDto, isAdmin, organizationId);
  }

  @Delete(':id')
  remove(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.productsService.remove(id, userId, isAdmin, organizationId);
  }

  // Bulk Operations
  @Post('bulk/update')
  bulkUpdate(
    @Request() req,
    @Body() body: { ids: string[]; updates: UpdateProductDto },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.productsService.bulkUpdate(body.ids, userId, body.updates, isAdmin, organizationId);
  }

  @Post('bulk/delete')
  bulkDelete(
    @Request() req,
    @Body() body: { ids: string[] },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.productsService.bulkDelete(body.ids, userId, isAdmin, organizationId);
  }
}
