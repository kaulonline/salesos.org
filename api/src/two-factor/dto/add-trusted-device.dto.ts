import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddTrustedDeviceDto {
  @ApiProperty({ description: 'Device name', example: 'Chrome on MacBook Pro' })
  @IsString()
  deviceName: string;

  @ApiProperty({ description: 'Device type', example: 'desktop' })
  @IsString()
  deviceType: string;

  @ApiPropertyOptional({ description: 'Browser information' })
  @IsOptional()
  @IsString()
  browserInfo?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Unique device fingerprint' })
  @IsString()
  deviceFingerprint: string;
}
