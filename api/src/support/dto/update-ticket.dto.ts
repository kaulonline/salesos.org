import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  resolution?: string;
}

export class AssignTicketDto {
  @IsString()
  assignedToId: string;
}

export class ResolveTicketDto {
  @IsString()
  resolution: string;
}
