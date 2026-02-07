import { IsString, IsOptional, IsBoolean, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebFormFieldDto } from './web-form-field.dto';

export class CreateWebFormDto {
  @ApiProperty({ description: 'Form name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Form description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Form fields configuration', type: [WebFormFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebFormFieldDto)
  fields?: WebFormFieldDto[];

  @ApiPropertyOptional({ description: 'Form settings' })
  @IsOptional()
  @IsObject()
  settings?: {
    submitButtonText?: string;
    showLabels?: boolean;
    showPlaceholders?: boolean;
    enableCaptcha?: boolean;
    doubleOptIn?: boolean;
    autoResponderEnabled?: boolean;
    autoResponderSubject?: string;
    autoResponderBody?: string;
  };

  @ApiPropertyOptional({ description: 'Form styling' })
  @IsOptional()
  @IsObject()
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    fontFamily?: string;
    borderRadius?: string;
    padding?: string;
    customCss?: string;
  };

  @ApiPropertyOptional({ description: 'Redirect URL after submission' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'Thank you message after submission' })
  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @ApiPropertyOptional({ description: 'Email addresses to notify on submission' })
  @IsOptional()
  @IsArray()
  notificationEmails?: string[];

  @ApiPropertyOptional({ description: 'Assignment rule ID to apply to leads' })
  @IsOptional()
  @IsString()
  assignmentRuleId?: string;

  @ApiPropertyOptional({ description: 'Is form active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
