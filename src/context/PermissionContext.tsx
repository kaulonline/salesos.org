import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { profilesApi } from '../api/profiles';
import type { Profile, PermissionModule, PermissionAction, DataAccessLevel } from '../types';
import { logger } from '../lib/logger';

interface PermissionContextType {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  hasAnyPermission: (module: PermissionModule, actions: PermissionAction[]) => boolean;
  hasAllPermissions: (module: PermissionModule, actions: PermissionAction[]) => boolean;
  getDataAccess: (module: PermissionModule) => DataAccessLevel;
  canViewModule: (module: PermissionModule) => boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!isAuthenticated || !user) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, fetch the user's profile
      // For now, we'll use a default profile based on user role
      const profiles = await profilesApi.getAll();

      // Find the profile assigned to the user or use default based on role
      let userProfile: Profile | null = null;

      if (user.role?.toUpperCase() === 'ADMIN') {
        userProfile = profiles.find(p => p.name === 'Administrator') || profiles.find(p => p.isSystem && p.name.includes('Admin')) || null;
      } else if (user.role?.toUpperCase() === 'MANAGER') {
        userProfile = profiles.find(p => p.name === 'Manager') || profiles.find(p => p.isDefault) || null;
      } else {
        userProfile = profiles.find(p => p.isDefault) || profiles[0] || null;
      }

      // If no profile found, create a default one with all permissions for demo
      if (!userProfile) {
        userProfile = {
          id: 'default',
          name: 'Default',
          isSystem: true,
          isDefault: true,
          userCount: 1,
          permissions: [
            { module: 'LEADS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN'], dataAccess: 'ALL' },
            { module: 'CONTACTS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN'], dataAccess: 'ALL' },
            { module: 'ACCOUNTS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN'], dataAccess: 'ALL' },
            { module: 'OPPORTUNITIES', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN'], dataAccess: 'ALL' },
            { module: 'PRODUCTS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT'], dataAccess: 'ALL' },
            { module: 'QUOTES', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'], dataAccess: 'ALL' },
            { module: 'CAMPAIGNS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'], dataAccess: 'ALL' },
            { module: 'TASKS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'], dataAccess: 'ALL' },
            { module: 'MEETINGS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'], dataAccess: 'ALL' },
            { module: 'REPORTS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'], dataAccess: 'ALL' },
            { module: 'WORKFLOWS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'], dataAccess: 'ALL' },
            { module: 'EMAIL_TEMPLATES', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'], dataAccess: 'ALL' },
            { module: 'WEB_FORMS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'], dataAccess: 'ALL' },
            { module: 'CUSTOM_FIELDS', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'], dataAccess: 'ALL' },
            { module: 'ASSIGNMENT_RULES', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'], dataAccess: 'ALL' },
            { module: 'API_KEYS', actions: ['VIEW', 'CREATE', 'DELETE'], dataAccess: 'ALL' },
            { module: 'ADMIN', actions: ['VIEW', 'EDIT'], dataAccess: 'ALL' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      setProfile(userProfile);
    } catch (err) {
      logger.error('Failed to fetch user profile:', err);
      setError('Failed to load permissions');
      // Set a default profile with basic permissions
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [isAuthenticated, user?.id]);

  const isAdmin = useMemo(() => {
    return user?.role?.toUpperCase() === 'ADMIN';
  }, [user?.role]);

  const hasPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    // Admins have all permissions
    if (isAdmin) return true;

    if (!profile) return false;

    const permission = profile.permissions.find(p => p.module === module);
    if (!permission) return false;

    return permission.actions?.includes(action) ?? false;
  };

  const hasAnyPermission = (module: PermissionModule, actions: PermissionAction[]): boolean => {
    return actions.some(action => hasPermission(module, action));
  };

  const hasAllPermissions = (module: PermissionModule, actions: PermissionAction[]): boolean => {
    return actions.every(action => hasPermission(module, action));
  };

  const getDataAccess = (module: PermissionModule): DataAccessLevel => {
    // Admins have full access
    if (isAdmin) return 'ALL';

    if (!profile) return 'NONE';

    const permission = profile.permissions.find(p => p.module === module);
    return permission?.dataAccess ?? 'NONE';
  };

  const canViewModule = (module: PermissionModule): boolean => {
    return hasPermission(module, 'VIEW');
  };

  const value = useMemo(() => ({
    profile,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getDataAccess,
    canViewModule,
    isAdmin,
    refetch: fetchProfile,
  }), [profile, isLoading, error, isAdmin]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}
