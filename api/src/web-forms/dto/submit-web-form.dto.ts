import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitWebFormDto {
  @ApiProperty({ description: 'Form field values' })
  @IsObject()
  data: Record<string, any>;
}
