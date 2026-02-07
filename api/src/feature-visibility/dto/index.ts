import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { DeviceType } from '@prisma/client';

export class CreateVisibilityRuleDto {
  @IsString()
  featureKey: string;

  @IsOptional()
  @IsBoolean()
  showOnMobile?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnTablet?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnDesktop?: boolean;

  @IsOptional()
  @IsString()
  minLicenseTier?: string;

  @IsOptional()
  @IsNumber()
  uiPosition?: number;

  @IsOptional()
  @IsBoolean()
  showWhenDisabled?: boolean;

  @IsOptional()
  @IsString()
  upgradeMessage?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVisibilityRuleDto {
  @IsOptional()
  @IsBoolean()
  showOnMobile?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnTablet?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnDesktop?: boolean;

  @IsOptional()
  @IsString()
  minLicenseTier?: string;

  @IsOptional()
  @IsNumber()
  uiPosition?: number;

  @IsOptional()
  @IsBoolean()
  showWhenDisabled?: boolean;

  @IsOptional()
  @IsString()
  upgradeMessage?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetVisibleFeaturesDto {
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;
}
