import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({ description: 'TOTP code or backup code', example: '123456' })
  @IsString()
  @Length(6, 10)
  code: string;
}
