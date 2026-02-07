import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  voice?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsArray()
  @IsOptional()
  tools?: any[];
}
