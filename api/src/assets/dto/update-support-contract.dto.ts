import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsObject, Min } from 'class-validator';
import { SupportContractType, ContractStatus } from '@prisma/client';

export class UpdateSupportContractDto {
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SupportContractType)
  @IsOptional()
  type?: SupportContractType;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  contractValue?: number;

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

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
