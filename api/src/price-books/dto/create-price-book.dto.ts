import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePriceBookDto {
  @ApiProperty({ description: 'Price book name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Is this the standard price book' })
  @IsOptional()
  @IsBoolean()
  isStandard?: boolean;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid to date' })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
