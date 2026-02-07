import { IsString, IsOptional, IsEmail, IsObject, Length } from 'class-validator';

export class GetUserTokenDto {
  @IsString()
  salesforceUserId: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    profileId?: string;
    roleId?: string;
    userType?: string;
  };
}

export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

export class TokenResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: {
    id: string;
    salesforceUserId: string;
    email: string;
    name: string;
  };
}

export class ValidateTokenResponseDto {
  valid: boolean;
  user?: {
    id: string;
    salesforceUserId: string;
    email: string;
    name: string;
  };
  expiresAt?: string;
}
