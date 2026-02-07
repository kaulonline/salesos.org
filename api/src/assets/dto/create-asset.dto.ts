import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  accountId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @IsString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  warrantyEndDate?: string;

  @IsString()
  @IsOptional()
  renewalDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  renewalValue?: number;

  @IsString()
  @IsOptional()
  licenseKey?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  seatCount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  seatsUsed?: number;

  @IsString()
  @IsOptional()
  supportContractId?: string;
}
