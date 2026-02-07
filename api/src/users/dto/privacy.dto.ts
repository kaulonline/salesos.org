import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

/**
 * DTO for creating a data export request
 */
export class CreateDataExportRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for creating a data deletion request
 */
export class CreateDataDeletionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  confirmationPhrase: string; // User must type "DELETE MY DATA" to confirm
}

/**
 * DTO for creating an account deletion request
 */
export class CreateAccountDeletionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  confirmationPhrase: string; // User must type "DELETE MY ACCOUNT" to confirm

  @IsString()
  password: string; // Re-authenticate before deletion
}

/**
 * DTO for updating privacy preferences
 */
export class UpdatePrivacyPreferencesDto {
  @IsOptional()
  @IsBoolean()
  analyticsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  personalizationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  crashReportingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  aiTrainingConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  contextRetentionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmailsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  productUpdatesEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(365)
  retentionPeriodDays?: number;
}

/**
 * Response type for privacy preferences
 */
export interface PrivacyPreferencesResponse {
  analyticsEnabled: boolean;
  personalizationEnabled: boolean;
  crashReportingEnabled: boolean;
  aiTrainingConsent: boolean;
  contextRetentionEnabled: boolean;
  marketingEmailsEnabled: boolean;
  productUpdatesEnabled: boolean;
  retentionPeriodDays: number | null;
  lastConsentUpdate: Date;
  consentVersion: string;
}

/**
 * Response type for data requests
 */
export interface DataRequestResponse {
  id: string;
  type: string;
  status: string;
  reason?: string;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Response type for data retention info
 */
export interface DataRetentionInfoResponse {
  defaultRetentionDays: number;
  userRetentionDays: number | null;
  dataCategories: DataCategoryInfo[];
}

/**
 * Information about a data category
 */
export interface DataCategoryInfo {
  category: string;
  description: string;
  retentionDays: number;
  canDelete: boolean;
}

/**
 * Response type for storage usage
 */
export interface StorageUsageResponse {
  chatMessages: number;
  cachedFiles: number;
  documents: number;
  totalBytes: number;
}
