import { IsString, IsOptional, IsNumber, IsArray, IsEmail, Min } from 'class-validator';

export class CreateDealRegistrationDto {
  @IsString()
  accountName: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  contactName: string;

  @IsEmail()
  contactEmail: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedValue?: number;

  @IsString()
  @IsOptional()
  estimatedCloseDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productInterest?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDealRegistrationDto {
  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedValue?: number;

  @IsString()
  @IsOptional()
  estimatedCloseDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productInterest?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
