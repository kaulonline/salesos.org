import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';

export class ConvertLeadDto {
  @IsBoolean()
  @IsOptional()
  createAccount?: boolean = true;

  @IsBoolean()
  @IsOptional()
  createContact?: boolean = true;

  @IsBoolean()
  @IsOptional()
  createOpportunity?: boolean = true;

  @IsString()
  @IsOptional()
  opportunityName?: string;

  @IsNumber()
  @IsOptional()
  opportunityAmount?: number;

  @IsString()
  @IsOptional()
  accountName?: string; // If different from lead.company

  @IsString()
  @IsOptional()
  existingAccountId?: string; // Link to existing account instead of creating new
}
