// FeatureGate - Component for controlling access to features based on license
import React, { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, Zap, AlertTriangle } from 'lucide-react';
import { licensingApi } from '../api/licensing';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';

// Feature keys - must match backend LicenseFeature.featureKey
export const Features = {
  // AI
  AI_CHAT: 'ai_chat',
  CUSTOM_AGENTS: 'custom_agents',
  // CRM
  CRM_SALESFORCE: 'crm_salesforce',
  CRM_HUBSPOT: 'crm_hubspot',
  // Meetings
  MEETINGS_INTELLIGENCE: 'meetings_intelligence',
  MEETINGS_RECORD: 'meetings_record',
  MEETINGS_TRANSCRIBE: 'meetings_transcribe',
  // Data Management
  LEADS_MANAGEMENT: 'leads_management',
  CONTACTS_MANAGEMENT: 'contacts_management',
  ACCOUNTS_MANAGEMENT: 'accounts_management',
  OPPORTUNITIES_MANAGEMENT: 'opportunities_management',
  DOCUMENTS_MANAGEMENT: 'documents_management',
  TRANSACTIONAL_DATA: 'transactional_data',
  METADATA_MANAGEMENT: 'metadata_management',
  // Analytics
  BASIC_ANALYTICS: 'basic_analytics',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  // Integrations
  API_ACCESS: 'api_access',
  WEBHOOKS: 'webhooks',
} as const;

export type FeatureKey = typeof Features[keyof typeof Features];

interface FeatureAccess {
  hasAccess: boolean;
  limit?: number;
  currentUsage?: number;
  reason?: string;
}

interface FeatureContextType {
  checkAccess: (featureKey: FeatureKey) => Promise<FeatureAccess>;
  hasFeature: (featureKey: FeatureKey) => boolean;
  featureCache: Record<string, FeatureAccess>;
  refreshFeatures: () => Promise<void>;
  isLoading: boolean;
  userTier?: string;
}

const FeatureContext = createContext<FeatureContextType | null>(null);

// Provider component
export function FeatureProvider({ children }: { children: ReactNode }) {
  const [featureCache, setFeatureCache] = useState<Record<string, FeatureAccess>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [userTier, setUserTier] = useState<string>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const refreshFeatures = async () => {
    try {
      setIsLoading(true);
      const [license, features] = await Promise.all([
        licensingApi.getMyLicense(),
        licensingApi.getMyFeatures(),
      ]);

      if (license?.licenseType?.tier) {
        setUserTier(license.licenseType.tier);
      }

      // Build cache from features (ensure features is an array)
      const cache: Record<string, FeatureAccess> = {};
      const featureList = Array.isArray(features) ? features : [];
      featureList.forEach((f: any) => {
        cache[f.featureKey] = {
          hasAccess: f.isEnabled !== false,
          limit: f.defaultLimit || undefined,
          currentUsage: 0,
        };
      });
      setFeatureCache(cache);
    } catch (err) {
      logger.error('Failed to load features:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch features after auth state is determined
    if (authLoading) {
      return;
    }

    // Only fetch features if user is authenticated
    if (!isAuthenticated) {
      setFeatureCache({});
      setUserTier(undefined);
      setIsLoading(false);
      return;
    }

    refreshFeatures();
  }, [isAuthenticated, authLoading]);

  const checkAccess = async (featureKey: FeatureKey): Promise<FeatureAccess> => {
    // ENTERPRISE and CUSTOM tiers have access to all features
    if (userTier === 'ENTERPRISE' || userTier === 'CUSTOM') {
      return { hasAccess: true };
    }

    // Return cached if available
    if (featureCache[featureKey]) {
      return featureCache[featureKey];
    }

    try {
      const result = await licensingApi.checkAccess(featureKey);
      const access: FeatureAccess = {
        hasAccess: result.hasAccess,
        limit: result.limit,
        currentUsage: result.currentUsage,
      };
      setFeatureCache(prev => ({ ...prev, [featureKey]: access }));
      return access;
    } catch (err) {
      return { hasAccess: false, reason: 'Failed to check access' };
    }
  };

  const hasFeature = (featureKey: FeatureKey): boolean => {
    // ENTERPRISE and CUSTOM tiers have access to all features
    if (userTier === 'ENTERPRISE' || userTier === 'CUSTOM') {
      return true;
    }
    return featureCache[featureKey]?.hasAccess ?? false;
  };

  return (
    <FeatureContext.Provider value={{ checkAccess, hasFeature, featureCache, refreshFeatures, isLoading, userTier }}>
      {children}
    </FeatureContext.Provider>
  );
}

// Hook to use feature context
export function useFeatureAccess() {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatureAccess must be used within a FeatureProvider');
  }
  return context;
}

// Props for FeatureGate component
interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  inline?: boolean;
}

// Main FeatureGate component
export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
  inline = false,
}: FeatureGateProps) {
  const { hasFeature, isLoading, userTier } = useFeatureAccess();
  const navigate = useNavigate();

  if (isLoading) {
    return null; // Or a loading skeleton
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // If fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt
  if (showUpgrade) {
    if (inline) {
      return (
        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-[#EAD07D] to-[#D4B85C] text-[#1A1A1A] rounded-full font-medium hover:shadow-md transition-shadow"
        >
          <Crown size={12} />
          Upgrade
        </button>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#F8F8F6] to-white rounded-2xl border border-[#F2F1EA]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EAD07D]/20 to-[#EAD07D]/5 flex items-center justify-center mb-4">
          <Lock size={28} className="text-[#EAD07D]" />
        </div>
        <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Feature Locked</h3>
        <p className="text-sm text-[#666] text-center mb-4 max-w-xs">
          This feature requires a higher plan. Upgrade to unlock full access.
        </p>
        <button
          onClick={() => navigate('/pricing')}
          className="px-6 py-2.5 bg-gradient-to-r from-[#1A1A1A] to-[#333] text-white rounded-xl font-medium text-sm hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <Crown size={16} />
          Upgrade Plan
        </button>
        {userTier && (
          <p className="text-xs text-[#999] mt-3">
            Current plan: <span className="font-medium">{userTier}</span>
          </p>
        )}
      </div>
    );
  }

  return null;
}

// Usage limit indicator component
interface UsageMeterProps {
  feature: FeatureKey;
  label?: string;
  showWhenUnlimited?: boolean;
}

export function UsageMeter({ feature, label, showWhenUnlimited = false }: UsageMeterProps) {
  const [usage, setUsage] = useState<FeatureAccess | null>(null);
  const { checkAccess } = useFeatureAccess();

  useEffect(() => {
    checkAccess(feature).then(setUsage);
  }, [feature, checkAccess]);

  if (!usage || !usage.hasAccess) return null;
  if (!usage.limit && !showWhenUnlimited) return null;

  const percentage = usage.limit ? Math.min((usage.currentUsage || 0) / usage.limit * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-[#666]">{label}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[#F2F1EA] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-[#EAD07D]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-[#666]'}`}>
          {usage.currentUsage || 0}/{usage.limit === -1 ? '∞' : usage.limit || '∞'}
        </span>
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} />
          Limit reached
        </p>
      )}
    </div>
  );
}

// HOC for protecting entire pages
export function withFeatureAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureKey,
) {
  return function FeatureProtectedComponent(props: P) {
    return (
      <FeatureGate feature={feature}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}

// Hook for checking access imperatively
export function useCanAccess(feature: FeatureKey): { canAccess: boolean; isLoading: boolean } {
  const { hasFeature, isLoading } = useFeatureAccess();
  return { canAccess: hasFeature(feature), isLoading };
}

export default FeatureGate;
