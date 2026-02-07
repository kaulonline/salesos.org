import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsNumber, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Webhook description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Webhook endpoint URL' })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Events to subscribe to',
    example: ['lead.created', 'opportunity.won']
  })
  @IsArray()
  events: string[];

  @ApiPropertyOptional({ description: 'Custom headers to send with requests' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Is webhook active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Number of retry attempts on failure', default: 3 })
  @IsOptional()
  @IsNumber()
  retryAttempts?: number;

  @ApiPropertyOptional({ description: 'Delay between retries in seconds', default: 60 })
  @IsOptional()
  @IsNumber()
  retryDelaySeconds?: number;
}
