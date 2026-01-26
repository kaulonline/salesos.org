import client from './client';
import type {
  TwoFactorStatus,
  TwoFactorSetupResponse,
  VerifyTwoFactorSetupDto,
  VerifyTwoFactorDto,
  TrustedDevice,
  BackupCodesResponse,
  DisableTwoFactorDto,
  TwoFactorEnforcementSettings,
} from '../types';

export const twoFactorApi = {
  /**
   * Get 2FA status for current user
   */
  getStatus: async (): Promise<TwoFactorStatus> => {
    const response = await client.get<TwoFactorStatus>('/auth/2fa/status');
    return response.data;
  },

  /**
   * Initiate 2FA setup (returns QR code and secret)
   */
  setup: async (): Promise<TwoFactorSetupResponse> => {
    const response = await client.post<TwoFactorSetupResponse>('/auth/2fa/setup');
    return response.data;
  },

  /**
   * Verify 2FA setup with code from authenticator
   */
  verifySetup: async (data: VerifyTwoFactorSetupDto): Promise<{ success: boolean; backupCodes: string[] }> => {
    const response = await client.post<{ success: boolean; backupCodes: string[] }>(
      '/auth/2fa/verify-setup',
      data
    );
    return response.data;
  },

  /**
   * Disable 2FA (requires password and optionally a code)
   */
  disable: async (data: DisableTwoFactorDto): Promise<void> => {
    await client.post('/auth/2fa/disable', data);
  },

  /**
   * Verify 2FA code during login
   */
  verify: async (
    twoFactorToken: string,
    data: VerifyTwoFactorDto
  ): Promise<{ access_token: string; user: unknown }> => {
    const response = await client.post<{ access_token: string; user: unknown }>(
      '/auth/2fa/verify',
      data,
      { headers: { 'X-2FA-Token': twoFactorToken } }
    );
    return response.data;
  },

  /**
   * Get backup codes
   */
  getBackupCodes: async (): Promise<BackupCodesResponse> => {
    const response = await client.get<BackupCodesResponse>('/auth/2fa/backup-codes');
    return response.data;
  },

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes: async (password: string): Promise<BackupCodesResponse> => {
    const response = await client.post<BackupCodesResponse>('/auth/2fa/regenerate-backup-codes', {
      password,
    });
    return response.data;
  },

  /**
   * Get trusted devices
   */
  getTrustedDevices: async (): Promise<TrustedDevice[]> => {
    const response = await client.get<TrustedDevice[]>('/auth/2fa/trusted-devices');
    return response.data;
  },

  /**
   * Remove a trusted device
   */
  removeTrustedDevice: async (deviceId: string): Promise<void> => {
    await client.delete(`/auth/2fa/trusted-devices/${deviceId}`);
  },

  /**
   * Remove all trusted devices except current
   */
  removeAllTrustedDevices: async (): Promise<{ count: number }> => {
    const response = await client.delete<{ count: number }>('/auth/2fa/trusted-devices');
    return response.data;
  },

  // Admin endpoints
  /**
   * Get 2FA enforcement settings (admin only)
   */
  getEnforcementSettings: async (): Promise<TwoFactorEnforcementSettings> => {
    const response = await client.get<TwoFactorEnforcementSettings>('/admin/2fa/settings');
    return response.data;
  },

  /**
   * Update 2FA enforcement settings (admin only)
   */
  updateEnforcementSettings: async (
    data: Partial<TwoFactorEnforcementSettings>
  ): Promise<TwoFactorEnforcementSettings> => {
    const response = await client.patch<TwoFactorEnforcementSettings>('/admin/2fa/settings', data);
    return response.data;
  },

  /**
   * Reset 2FA for a user (admin only)
   */
  resetUserTwoFactor: async (userId: string): Promise<void> => {
    await client.post(`/admin/users/${userId}/reset-2fa`);
  },
};

export default twoFactorApi;
