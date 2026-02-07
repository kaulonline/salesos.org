import { IsString, IsEmail, IsOptional, IsEnum, IsObject } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

// DTO for verifying email before ticket creation
export class InitiateTicketDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsString()
  @IsOptional()
  deviceInfo?: string;
}

// DTO for verifying the email token
export class VerifyTicketDto {
  @IsString()
  token: string;
}

// DTO for checking ticket status
export class CheckTicketStatusDto {
  @IsString()
  caseId: string;

  @IsEmail()
  email: string;
}
