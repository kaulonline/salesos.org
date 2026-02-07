import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';
import { ProductType, ProductCategory, BillingFrequency } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @IsNumber()
  @Min(0)
  listPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BillingFrequency)
  @IsOptional()
  billingFrequency?: BillingFrequency;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
