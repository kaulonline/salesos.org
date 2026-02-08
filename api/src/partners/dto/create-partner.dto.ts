import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { PartnerType, PartnerTier, PartnerStatus, PartnerUserRole } from '@prisma/client';

export class CreatePartnerDto {
  @IsString()
  companyName: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsEnum(PartnerType)
  @IsOptional()
  type?: PartnerType;

  @IsEnum(PartnerTier)
  @IsOptional()
  tier?: PartnerTier;

  @IsEnum(PartnerStatus)
  @IsOptional()
  status?: PartnerStatus;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionRate?: number;

  @IsBoolean()
  @IsOptional()
  portalEnabled?: boolean;
}

export class UpdatePartnerDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsEnum(PartnerType)
  @IsOptional()
  type?: PartnerType;

  @IsEnum(PartnerTier)
  @IsOptional()
  tier?: PartnerTier;

  @IsEnum(PartnerStatus)
  @IsOptional()
  status?: PartnerStatus;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionRate?: number;

  @IsBoolean()
  @IsOptional()
  portalEnabled?: boolean;
}

export class AddPartnerUserDto {
  @IsString()
  userId: string;

  @IsEnum(PartnerUserRole)
  @IsOptional()
  role?: PartnerUserRole;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class InvitePartnerUserDto {
  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(PartnerUserRole)
  @IsOptional()
  role?: PartnerUserRole;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class AssignAccountDto {
  @IsString()
  accountId: string;

  @IsBoolean()
  @IsOptional()
  isExclusive?: boolean;
}
