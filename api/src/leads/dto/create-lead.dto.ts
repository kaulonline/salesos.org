import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { LeadSource, LeadStatus, LeadRating } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  @IsOptional()
  salutation?: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsEnum(LeadSource)
  @IsOptional()
  leadSource?: LeadSource;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsEnum(LeadRating)
  @IsOptional()
  rating?: LeadRating;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsNumber()
  @IsOptional()
  numberOfEmployees?: number;

  @IsNumber()
  @IsOptional()
  annualRevenue?: number;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  painPoints?: string[];

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  timeline?: string;
}
