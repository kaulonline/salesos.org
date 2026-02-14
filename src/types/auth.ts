export type UserRole = 'USER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  role: UserRole;
  company?: string;
  // Organization membership
  organizationId?: string;
  organizationName?: string;
  organizationRole?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  membershipActive?: boolean;
  // License info
  hasLicense?: boolean;
  licenseStatus?: string;
  licenseTier?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  // Partner portal fields
  isPartnerUser?: boolean;
  partnerId?: string;
  partnerRole?: 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  organizationCode?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
