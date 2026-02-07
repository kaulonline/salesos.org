import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;
}
