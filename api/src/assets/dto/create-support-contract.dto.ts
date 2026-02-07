import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsObject, Min } from 'class-validator';
import { SupportContractType } from '@prisma/client';

export class CreateSupportContractDto {
  @IsString()
  accountId: string;

  @IsString()
  @IsOptional()
  contractNumber?: string;

  @IsString()
  name: string;

  @IsEnum(SupportContractType)
  @IsOptional()
  type?: SupportContractType;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsNumber()
  @Min(0)
  contractValue: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  annualValue?: number;

  @IsString()
  @IsOptional()
  slaLevel?: string;

  @IsNumber()
  @IsOptional()
  responseTime?: number;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsNumber()
  @IsOptional()
  renewalNotice?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
