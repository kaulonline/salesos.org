import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsNumber, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Webhook name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Webhook description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Webhook endpoint URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Events to subscribe to' })
  @IsOptional()
  @IsArray()
  events?: string[];

  @ApiPropertyOptional({ description: 'Custom headers to send with requests' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Is webhook active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Number of retry attempts on failure' })
  @IsOptional()
  @IsNumber()
  retryAttempts?: number;

  @ApiPropertyOptional({ description: 'Delay between retries in seconds' })
  @IsOptional()
  @IsNumber()
  retryDelaySeconds?: number;
}
