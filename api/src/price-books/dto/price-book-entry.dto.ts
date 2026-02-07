import { IsString, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePriceBookEntryDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'List price' })
  @IsNumber()
  listPrice: number;

  @ApiPropertyOptional({ description: 'Unit price override' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum quantity', default: 1 })
  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Discount tiers array' })
  @IsOptional()
  @IsArray()
  discountTiers?: Array<{ minQty: number; maxQty?: number; discountPercent: number }>;
}

export class UpdatePriceBookEntryDto {
  @ApiPropertyOptional({ description: 'List price' })
  @IsOptional()
  @IsNumber()
  listPrice?: number;

  @ApiPropertyOptional({ description: 'Unit price override' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum quantity' })
  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Discount tiers array' })
  @IsOptional()
  @IsArray()
  discountTiers?: Array<{ minQty: number; maxQty?: number; discountPercent: number }>;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
