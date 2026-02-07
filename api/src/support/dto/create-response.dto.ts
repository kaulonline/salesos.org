import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateResponseDto {
  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean; // Internal notes vs customer-visible
}
