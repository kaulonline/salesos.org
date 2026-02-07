import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ExchangeSdpDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  sdpOffer: string;

  @IsString()
  @IsOptional()
  model?: string;
}
