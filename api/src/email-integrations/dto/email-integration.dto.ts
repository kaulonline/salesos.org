import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { EmailProvider } from '@prisma/client';

export class InitiateOAuthDto {
  @IsEnum(EmailProvider)
  provider: EmailProvider;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class CompleteOAuthDto {
  @IsString()
  code: string;

  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;
}

export class UpdateEmailConnectionDto {
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  syncIncoming?: boolean;

  @IsOptional()
  @IsBoolean()
  syncOutgoing?: boolean;
}

export class EmailConnectionResponseDto {
  id: string;
  provider: EmailProvider;
  email: string;
  status: string;
  syncEnabled: boolean;
  syncIncoming: boolean;
  syncOutgoing: boolean;
  lastSyncAt: Date | null;
  emailsSynced: number;
  lastEmailAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OAuthUrlResponseDto {
  authUrl: string;
  state: string;
}
