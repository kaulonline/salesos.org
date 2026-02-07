import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisableTwoFactorDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @MinLength(1)
  password: string;
}
