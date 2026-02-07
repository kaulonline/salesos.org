import { IsString, IsOptional, IsArray, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyStatus } from '@prisma/client';

export class UpdateApiKeyDto {
  @ApiPropertyOptional({ description: 'API key name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'API key description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Scopes/permissions for the key' })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Rate limit (requests per window)' })
  @IsOptional()
  @IsNumber()
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Rate limit window in seconds' })
  @IsOptional()
  @IsNumber()
  rateLimitWindow?: number;

  @ApiPropertyOptional({ description: 'Allowed IP addresses' })
  @IsOptional()
  @IsArray()
  allowedIps?: string[];

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'API key status', enum: ApiKeyStatus })
  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;
}
