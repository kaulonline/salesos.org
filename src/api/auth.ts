import client from './client';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '../types/auth';

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Get the current authenticated user's profile
   */
  getProfile: async (): Promise<User> => {
    const response = await client.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: { name?: string; avatarUrl?: string }): Promise<User> => {
    const response = await client.post<User>('/auth/update-profile', data);
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await client.post('/auth/change-password', data);
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email: string): Promise<void> => {
    await client.post('/auth/forgot-password', { email });
  },

  /**
   * Verify reset code
   */
  verifyResetCode: async (code: string): Promise<{ valid: boolean }> => {
    const response = await client.post<{ valid: boolean }>('/auth/verify-reset-code', { code });
    return response.data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: { token: string; newPassword: string }): Promise<void> => {
    await client.post('/auth/reset-password', data);
  },

  /**
   * Request magic link
   */
  requestMagicLink: async (email: string): Promise<void> => {
    await client.post('/auth/magic-link', { email });
  },

  /**
   * Verify magic link
   */
  verifyMagicLink: async (token: string): Promise<AuthResponse> => {
    const response = await client.get<AuthResponse>(`/auth/magic-link?token=${token}`);
    return response.data;
  },
};

export default authApi;
