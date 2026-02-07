import { IsEmail, IsOptional, IsString, IsEnum, IsObject, MaxLength, IsEmpty } from 'class-validator';

export class CreateWaitlistDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254, { message: 'Email address is too long' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Company name is too long' })
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name is too long' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // Honeypot field - should always be empty (bots often fill this)
  @IsOptional()
  @IsEmpty({ message: 'Invalid submission' })
  website?: string;
}

export enum WaitlistStatus {
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  INVITED = 'INVITED',
  CONVERTED = 'CONVERTED',
  DECLINED = 'DECLINED',
}

export class UpdateWaitlistDto {
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class WaitlistQueryDto {
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
