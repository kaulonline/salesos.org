// Two-Factor Authentication Types for SalesOS CRM
// TOTP-based 2FA with backup codes and trusted devices

export type TwoFactorMethod = 'TOTP' | 'SMS' | 'EMAIL';

export interface TwoFactorStatus {
  isEnabled: boolean;
  method?: TwoFactorMethod;
  backupCodesRemaining: number;
  enabledAt?: string;
  lastVerifiedAt?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  otpauthUrl: string;
}

export interface VerifyTwoFactorSetupDto {
  code: string;
}

export interface VerifyTwoFactorDto {
  code: string;
  trustDevice?: boolean;
}

export interface TwoFactorLoginDto {
  email: string;
  password: string;
  twoFactorCode?: string;
  backupCode?: string;
  trustDevice?: boolean;
  deviceName?: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface BackupCodesResponse {
  codes: string[];
  generatedAt: string;
  usedCount: number;
  remainingCount: number;
}

export interface DisableTwoFactorDto {
  password: string;
  code?: string;
}

// Extended auth response for 2FA flow
export interface AuthResponseWith2FA {
  access_token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  requiresTwoFactor: boolean;
  twoFactorToken?: string;
  twoFactorMethod?: TwoFactorMethod;
}

// 2FA enforcement settings (for admin)
export interface TwoFactorEnforcementSettings {
  enforceForAllUsers: boolean;
  enforceForAdmins: boolean;
  enforceForManagers: boolean;
  gracePeriodDays: number;
  allowedMethods: TwoFactorMethod[];
  trustedDeviceExpirationDays: number;
  maxTrustedDevices: number;
}
