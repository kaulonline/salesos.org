import { IsString, IsOptional, IsBoolean, IsObject, IsUrl } from 'class-validator';

/**
 * DTO for Oracle CX OAuth connection initiation
 */
export class InitiateOracleCXConnectionDto {
  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @IsOptional()
  @IsString()
  customLoginUrl?: string;
}

/**
 * DTO for storing Oracle CX connection
 */
export class StoreOracleCXConnectionDto {
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsString()
  instanceUrl: string;

  @IsOptional()
  @IsString()
  externalOrgId?: string;

  @IsOptional()
  @IsString()
  externalUserId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;
}

/**
 * DTO for OAuth callback
 */
export class OracleCXOAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;
}

/**
 * DTO for sync settings
 */
export class OracleCXSyncSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoSyncOpportunities?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSyncAccounts?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSyncContacts?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSyncLeads?: boolean;

  @IsOptional()
  @IsBoolean()
  bidirectionalSync?: boolean;

  @IsOptional()
  syncInterval?: number; // in minutes
}

/**
 * Response type for connection status
 */
export interface OracleCXConnectionStatus {
  connected: boolean;
  connection?: {
    id: string;
    instanceUrl: string;
    externalOrgId?: string;
    externalUserId?: string;
    displayName?: string;
    isSandbox: boolean;
    isActive: boolean;
    connectedAt?: Date;
    expiresAt?: Date;
    lastSyncAt?: Date;
    lastError?: string;
  };
  error?: string;
}
