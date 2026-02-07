import { IsString, IsOptional, IsArray, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API key name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'API key description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Scopes/permissions for the key',
    default: ['read'],
    example: ['read', 'write', 'delete']
  })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Rate limit (requests per window)', default: 1000 })
  @IsOptional()
  @IsNumber()
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Rate limit window in seconds', default: 3600 })
  @IsOptional()
  @IsNumber()
  rateLimitWindow?: number;

  @ApiPropertyOptional({ description: 'Allowed IP addresses (empty for all)' })
  @IsOptional()
  @IsArray()
  allowedIps?: string[];

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
