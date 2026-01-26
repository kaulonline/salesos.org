import React from 'react';
import { usePermissions } from '../context/PermissionContext';
import type { PermissionModule, PermissionAction } from '../types';

interface PermissionGateProps {
  children: React.ReactNode;
  module: PermissionModule;
  action?: PermissionAction;
  actions?: PermissionAction[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  showError?: boolean;
}

/**
 * PermissionGate - Conditionally renders children based on user permissions
 *
 * Usage:
 * ```tsx
 * <PermissionGate module="LEADS" action="DELETE">
 *   <DeleteButton />
 * </PermissionGate>
 *
 * <PermissionGate module="LEADS" actions={['CREATE', 'EDIT']} requireAll>
 *   <EditForm />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  children,
  module,
  action,
  actions,
  requireAll = false,
  fallback = null,
  showError = false,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  // While loading, don't show anything
  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  if (action) {
    // Single action check
    hasAccess = hasPermission(module, action);
  } else if (actions && actions.length > 0) {
    // Multiple actions check
    hasAccess = requireAll
      ? hasAllPermissions(module, actions)
      : hasAnyPermission(module, actions);
  } else {
    // Just check if can view the module
    hasAccess = hasPermission(module, 'VIEW');
  }

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          You don't have permission to access this feature.
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * withPermission - HOC for permission-gated components
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  module: PermissionModule,
  action: PermissionAction,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionGatedComponent(props: P) {
    return (
      <PermissionGate
        module={module}
        action={action}
        fallback={FallbackComponent ? <FallbackComponent /> : null}
      >
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * useHasPermission - Hook for checking permissions in components
 */
export function useHasPermission(module: PermissionModule, action: PermissionAction): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(module, action);
}

/**
 * useCanAccessModule - Hook for checking module access
 */
export function useCanAccessModule(module: PermissionModule): boolean {
  const { canViewModule } = usePermissions();
  return canViewModule(module);
}
