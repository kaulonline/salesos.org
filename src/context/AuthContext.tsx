import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData, AuthState } from '../types/auth';
import authApi from '../api/auth';
import { tokenManager } from '../lib/tokenManager';
import { clearCsrfToken, generateCsrfToken, setCsrfToken } from '../lib/security';
import { setOrganizationContext, clearOrganizationContext } from '../api/client';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Ref to store cleanup function for token refresh scheduling
  const refreshCleanupRef = useRef<(() => void) | null>(null);

  // Schedule automatic token refresh
  const scheduleTokenRefresh = useCallback(() => {
    // Clear any existing scheduled refresh
    if (refreshCleanupRef.current) {
      refreshCleanupRef.current();
    }

    // Schedule new refresh
    refreshCleanupRef.current = tokenManager.scheduleRefresh(async () => {
      const response = await authApi.refreshToken();
      return response;
    });
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenManager.getToken();
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Check if token needs refresh
          if (tokenManager.shouldRefresh()) {
            const refreshResponse = await authApi.refreshToken();
            tokenManager.setToken(refreshResponse.access_token, refreshResponse.expires_in);
          }

          // Verify token is still valid by fetching profile
          const user = await authApi.getProfile() as User & { organizationId?: string };
          setState({
            user,
            token: tokenManager.getToken(),
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          // Update stored user with fresh data
          localStorage.setItem('user', JSON.stringify(user));

          // Restore organization context for multi-tenant API requests
          if (user.organizationId) {
            setOrganizationContext(user.organizationId);
          }

          // Schedule automatic refresh
          scheduleTokenRefresh();
        } catch {
          // Token is invalid, clear storage
          tokenManager.clearToken();
          localStorage.removeItem('user');
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // Cleanup on unmount
    return () => {
      if (refreshCleanupRef.current) {
        refreshCleanupRef.current();
      }
    };
  }, [scheduleTokenRefresh]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.login(credentials);
      const { access_token, user, expires_in } = response as { access_token: string; user: User & { organizationId?: string }; expires_in?: number };

      // Use token manager to store token with expiry
      tokenManager.setToken(access_token, expires_in);
      localStorage.setItem('user', JSON.stringify(user));

      // Set organization context for multi-tenant API requests
      if (user.organizationId) {
        setOrganizationContext(user.organizationId);
      }

      setState({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Schedule automatic refresh
      scheduleTokenRefresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw new Error(message);
    }
  }, [scheduleTokenRefresh]);

  const register = useCallback(async (data: RegisterData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.register(data);
      const { access_token, user, expires_in } = response as { access_token: string; user: User & { organizationId?: string }; expires_in?: number };

      // Use token manager to store token with expiry
      tokenManager.setToken(access_token, expires_in);
      localStorage.setItem('user', JSON.stringify(user));

      // Set organization context for multi-tenant API requests
      if (user.organizationId) {
        setOrganizationContext(user.organizationId);
      }

      setState({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Schedule automatic refresh
      scheduleTokenRefresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw new Error(message);
    }
  }, [scheduleTokenRefresh]);

  const logout = useCallback(() => {
    // Cancel any scheduled refresh
    if (refreshCleanupRef.current) {
      refreshCleanupRef.current();
      refreshCleanupRef.current = null;
    }

    // Clear tokens and user data
    tokenManager.clearToken();
    clearCsrfToken();
    clearOrganizationContext(); // Clear organization context for multi-tenant
    localStorage.removeItem('user');

    // Notify backend (fire and forget)
    authApi.logout().catch(() => {});

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const updateUser = useCallback((user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    setState((prev) => ({ ...prev, user }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
