import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebFormFieldOptionDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  value: string;
}

export class WebFormFieldDto {
  @ApiProperty({ description: 'Field name (used as form field name)' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Field label (displayed to user)' })
  @IsString()
  label: string;

  @ApiProperty({
    description: 'Field type',
    enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date']
  })
  @IsString()
  @IsIn(['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date'])
  type: string;

  @ApiPropertyOptional({ description: 'Is field required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Placeholder text' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Options for select/radio fields', type: [WebFormFieldOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebFormFieldOptionDto)
  options?: WebFormFieldOptionDto[];
}
