import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PriceBooksService } from './price-books.service';
import { CreatePriceBookDto } from './dto/create-price-book.dto';
import { UpdatePriceBookDto } from './dto/update-price-book.dto';
import { CreatePriceBookEntryDto, UpdatePriceBookEntryDto } from './dto/price-book-entry.dto';

@ApiTags('Price Books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('price-books')
export class PriceBooksController {
  constructor(private readonly priceBooksService: PriceBooksService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new price book' })
  async create(@Request() req, @Body() dto: CreatePriceBookDto) {
    return this.priceBooksService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all price books' })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'isStandard', type: Boolean, required: false })
  @ApiQuery({ name: 'currency', type: String, required: false })
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('isStandard') isStandard?: string,
    @Query('currency') currency?: string,
  ) {
    return this.priceBooksService.findAll({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isStandard: isStandard !== undefined ? isStandard === 'true' : undefined,
      currency,
    });
  }

  @Get('standard')
  @ApiOperation({ summary: 'Get the standard price book' })
  async findStandard() {
    return this.priceBooksService.findStandard();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get price book statistics' })
  async getStats() {
    return this.priceBooksService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a price book by ID' })
  async findOne(@Param('id') id: string) {
    return this.priceBooksService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a price book' })
  async update(@Param('id') id: string, @Body() dto: UpdatePriceBookDto) {
    return this.priceBooksService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a price book' })
  async remove(@Param('id') id: string) {
    return this.priceBooksService.remove(id);
  }

  @Post(':id/clone')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Clone a price book' })
  async clone(@Param('id') id: string, @Body() body: { name: string }, @Request() req) {
    return this.priceBooksService.clone(id, body.name, req.user.id);
  }

  // Price Book Entries
  @Get(':id/entries')
  @ApiOperation({ summary: 'Get all entries in a price book' })
  async getEntries(@Param('id') id: string) {
    return this.priceBooksService.getEntries(id);
  }

  @Post(':id/entries')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a product entry to price book' })
  async createEntry(@Param('id') id: string, @Body() dto: CreatePriceBookEntryDto) {
    return this.priceBooksService.createEntry(id, dto);
  }

  @Post(':id/entries/bulk')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add multiple product entries to price book' })
  async createEntriesBulk(@Param('id') id: string, @Body() body: { entries: CreatePriceBookEntryDto[] }) {
    return this.priceBooksService.createEntriesBulk(id, body.entries);
  }

  @Patch(':id/entries/:entryId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a price book entry' })
  async updateEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdatePriceBookEntryDto,
  ) {
    return this.priceBooksService.updateEntry(id, entryId, dto);
  }

  @Delete(':id/entries/:entryId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove a price book entry' })
  async removeEntry(@Param('id') id: string, @Param('entryId') entryId: string) {
    return this.priceBooksService.removeEntry(id, entryId);
  }

  @Get(':id/products/:productId/price')
  @ApiOperation({ summary: 'Get product price from price book' })
  @ApiQuery({ name: 'quantity', type: Number, required: false })
  async getProductPrice(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Query('quantity') quantity?: string,
  ) {
    return this.priceBooksService.getProductPrice(id, productId, quantity ? parseInt(quantity) : 1);
  }
}
