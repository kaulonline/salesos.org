import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto';
import { IsEnum, IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';
import { LeadStatus, LeadRating, BuyingIntent } from '@prisma/client';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsEnum(LeadRating)
  @IsOptional()
  rating?: LeadRating;

  @IsBoolean()
  @IsOptional()
  isQualified?: boolean;

  @IsString()
  @IsOptional()
  disqualifiedReason?: string;

  @IsNumber()
  @IsOptional()
  leadScore?: number;

  @IsEnum(BuyingIntent)
  @IsOptional()
  buyingIntent?: BuyingIntent;
}
