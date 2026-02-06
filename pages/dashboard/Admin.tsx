import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Shield, Activity, Search, MoreHorizontal, Ban, CheckCircle,
  XCircle, Key, RefreshCw, Database, Server, Zap, Clock, ChevronRight,
  CreditCard, Building2, Settings, TrendingUp, DollarSign, Package,
  Plus, Trash2, Edit, Eye, Copy, AlertTriangle, Crown, Star, Sparkles,
  ToggleLeft, ToggleRight, ChevronDown, X, Loader2, Check, Filter,
  Download, Upload, Calendar, Mail, UserPlus, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, FileText, Lock, Bell
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import {
  useAdminDashboard,
  useAdminUsers,
  useFeatureFlags,
  useSystemConfig,
  useAuditLogs,
  useLicensingDashboard,
  useLicenseTypes,
  useUserLicenses,
  usePreGeneratedKeys,
  useCoupons,
  useTransactions,
  usePaymentsDashboard,
  useGatewayConfigs,
} from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import type { LicenseStatus, LicenseTier, PreGeneratedKeyStatus } from '../../src/api/licensing';
import type { Coupon, Payment, DiscountType, CouponDuration, PaymentStatus, GatewayConfig, PaymentGateway, StripeSyncResult } from '../../src/api/payments';
import paymentsApi from '../../src/api/payments';

type TabType = 'overview' | 'users' | 'billing' | 'features' | 'settings' | 'audit';
type BillingSubTab = 'overview' | 'plans' | 'licenses' | 'keys' | 'coupons' | 'transactions';

const formatNumber = (num?: number) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatCurrency = (cents?: number, compact = false) => {
  if (!cents) return '$0';
  const value = cents / 100;
  if (compact) {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'green' | 'yellow' | 'red' | 'outline' | 'dark'> = {
    ACTIVE: 'green',
    PENDING: 'yellow',
    SUSPENDED: 'red',
    INACTIVE: 'outline',
    TRIAL: 'yellow',
    EXPIRED: 'red',
    CANCELLED: 'outline',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

const getRoleBadge = (role: string) => {
  const variants: Record<string, 'dark' | 'yellow' | 'outline'> = {
    ADMIN: 'dark',
    MANAGER: 'yellow',
    USER: 'outline',
    VIEWER: 'outline',
  };
  return <Badge variant={variants[role] || 'outline'} size="sm">{role}</Badge>;
};

const getTierBadge = (tier: LicenseTier) => {
  const config: Record<LicenseTier, { variant: 'outline' | 'yellow' | 'dark' | 'green'; icon?: React.ReactNode }> = {
    FREE: { variant: 'outline' },
    STARTER: { variant: 'yellow', icon: <Star size={10} /> },
    PROFESSIONAL: { variant: 'dark', icon: <Sparkles size={10} /> },
    ENTERPRISE: { variant: 'green', icon: <Crown size={10} /> },
    CUSTOM: { variant: 'dark' },
  };
  const { variant, icon } = config[tier] || { variant: 'outline' };
  return (
    <Badge variant={variant} size="sm" className="gap-1">
      {icon}
      {tier}
    </Badge>
  );
};

const getKeyStatusBadge = (status: PreGeneratedKeyStatus) => {
  const variants: Record<PreGeneratedKeyStatus, 'green' | 'yellow' | 'red' | 'outline'> = {
    AVAILABLE: 'green',
    CLAIMED: 'yellow',
    EXPIRED: 'outline',
    REVOKED: 'red',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL
  const activeTab = useMemo<TabType>(() => {
    const path = location.pathname;
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/billing')) return 'billing';
    if (path.includes('/admin/features')) return 'features';
    if (path.includes('/admin/settings') || path.includes('/admin/system')) return 'settings';
    if (path.includes('/admin/audit')) return 'audit';
    // For /dashboard/admin, check query params
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'users', 'billing', 'features', 'settings', 'audit'].includes(tab)) {
      return tab as TabType;
    }
    return 'overview';
  }, [location.pathname, location.search]);

  const [billingSubTab, setBillingSubTab] = useState<BillingSubTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [usersPage, setUsersPage] = useState(1);
  const [showAuditFilterMenu, setShowAuditFilterMenu] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showAssignLicenseModal, setShowAssignLicenseModal] = useState(false);
  const [showGenerateKeysModal, setShowGenerateKeysModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    tier: 'STARTER' as 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'USD',
    maxUsers: 5,
    maxConversations: 1000,
    maxLeads: 500,
    maxDocuments: 100,
    isActive: true,
    isPublic: true,
  });
  const [generateKeysForm, setGenerateKeysForm] = useState({
    licenseTypeId: '',
    count: 5,
    durationDays: 365,
    isTrial: false,
    notes: '',
  });
  const [assignLicenseForm, setAssignLicenseForm] = useState({
    userEmail: '',
    licenseTypeId: '',
    isTrial: false,
    durationDays: 365,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'deletePlan' | 'deleteCoupon' | 'refundPayment' | null;
    itemId: string | null;
    itemName: string;
  }>({ isOpen: false, type: null, itemId: null, itemName: '' });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Check if user is admin (handle case sensitivity)
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Helper to navigate to tab (works for both /admin/* and /dashboard/admin routes)
  const handleTabChange = (tab: TabType) => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    if (isAdminRoute) {
      if (tab === 'overview') navigate('/admin');
      else navigate(`/admin/${tab}`);
    } else {
      // For /dashboard/admin, use query params
      navigate(tab === 'overview' ? '/dashboard/admin' : `/dashboard/admin?tab=${tab}`);
    }
  };

  // Admin Hooks
  const { stats, loading: statsLoading } = useAdminDashboard();
  const {
    users,
    total: totalUsers,
    loading: usersLoading,
    suspendUser,
    activateUser,
    resetPassword,
    refetch: refetchUsers,
  } = useAdminUsers({ search: searchQuery, role: selectedRole, status: selectedStatus, page: usersPage });
  const { flags, loading: flagsLoading, toggleFlag } = useFeatureFlags();
  const { configs, loading: configsLoading } = useSystemConfig();
  const { logs, loading: logsLoading } = useAuditLogs({ limit: 20 });

  // Licensing Hooks
  const { dashboard: licensingDashboard, loading: licensingLoading } = useLicensingDashboard();
  const { types: licenseTypes, loading: typesLoading, createType, updateType, deleteType } = useLicenseTypes();
  const {
    licenses: userLicenses,
    total: totalLicenses,
    loading: licensesLoading,
    assignLicense,
    revokeLicense,
    suspendLicense,
    resumeLicense,
    renewLicense,
    refetch: refetchLicenses,
  } = useUserLicenses();
  const {
    keys: licenseKeys,
    total: totalKeys,
    loading: keysLoading,
    generateKeys,
    revokeKey,
    refetch: refetchKeys,
  } = usePreGeneratedKeys();

  // Payment Hooks
  const {
    coupons,
    loading: couponsLoading,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    refetch: refetchCoupons,
  } = useCoupons();
  const {
    transactions,
    loading: transactionsLoading,
    refundPayment,
    refetch: refetchTransactions,
  } = useTransactions();
  const { dashboard: paymentsDashboard } = usePaymentsDashboard();
  const { configs: gatewayConfigs, loading: gatewaysLoading, updateConfig: updateGatewayConfig, testConnection: testGatewayConnection, testing: testingGateway, refetch: refetchGateways } = useGatewayConfigs();

  // Gateway config editing state
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [gatewayForm, setGatewayForm] = useState({
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
    testMode: true,
    isActive: false,
  });

  // Stripe sync state
  const [syncingStripe, setSyncingStripe] = useState(false);
  const [syncResult, setSyncResult] = useState<StripeSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // OAuth Settings state
  interface OAuthConfig {
    googleEnabled: boolean;
    googleClientId: string;
    googleClientSecret: string;
    appleEnabled: boolean;
    appleClientId: string;
    appleTeamId: string;
    appleKeyId: string;
    applePrivateKey: string;
  }
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({
    googleEnabled: false,
    googleClientId: '',
    googleClientSecret: '',
    appleEnabled: false,
    appleClientId: '',
    appleTeamId: '',
    appleKeyId: '',
    applePrivateKey: '',
  });
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthSaving, setOauthSaving] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState<'google' | 'apple' | null>(null);
  const [oauthFormData, setOauthFormData] = useState({
    enabled: false,
    clientId: '',
    clientSecret: '',
    teamId: '',
    keyId: '',
    privateKey: '',
  });

  const handleStripeSync = async () => {
    setSyncingStripe(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const result = await paymentsApi.syncStripeData();
      setSyncResult(result);
      // Refetch data after sync
      if (result.subscriptionsCreated > 0 || result.invoicesCreated > 0) {
        // Refresh transactions and dashboard data
        window.location.reload();
      }
    } catch (error: any) {
      setSyncError(error.response?.data?.message || error.message || 'Sync failed');
    } finally {
      setSyncingStripe(false);
    }
  };

  // Fetch OAuth config on Settings tab
  const fetchOAuthConfig = async () => {
    setOauthLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/config?category=oauth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const configMap: Record<string, string> = {};
        data.forEach((c: { key: string; value: string }) => {
          configMap[c.key] = c.value;
        });
        setOauthConfig({
          googleEnabled: configMap['oauth_google_enabled'] === 'true',
          googleClientId: configMap['oauth_google_client_id'] || '',
          googleClientSecret: configMap['oauth_google_client_secret'] || '',
          appleEnabled: configMap['oauth_apple_enabled'] === 'true',
          appleClientId: configMap['oauth_apple_client_id'] || '',
          appleTeamId: configMap['oauth_apple_team_id'] || '',
          appleKeyId: configMap['oauth_apple_key_id'] || '',
          applePrivateKey: configMap['oauth_apple_private_key'] || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch OAuth config:', err);
    } finally {
      setOauthLoading(false);
    }
  };

  // Save OAuth config
  const saveOAuthConfig = async (provider: 'google' | 'apple') => {
    setOauthSaving(true);
    try {
      const token = localStorage.getItem('token');
      const configs = provider === 'google'
        ? [
            { key: 'oauth_google_enabled', value: String(oauthFormData.enabled) },
            { key: 'oauth_google_client_id', value: oauthFormData.clientId },
            { key: 'oauth_google_client_secret', value: oauthFormData.clientSecret },
          ]
        : [
            { key: 'oauth_apple_enabled', value: String(oauthFormData.enabled) },
            { key: 'oauth_apple_client_id', value: oauthFormData.clientId },
            { key: 'oauth_apple_team_id', value: oauthFormData.teamId },
            { key: 'oauth_apple_key_id', value: oauthFormData.keyId },
            { key: 'oauth_apple_private_key', value: oauthFormData.privateKey },
          ];

      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/config/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ configs }),
      });

      // Refresh config
      await fetchOAuthConfig();
      setShowOAuthModal(null);
    } catch (err) {
      console.error('Failed to save OAuth config:', err);
    } finally {
      setOauthSaving(false);
    }
  };

  // Open OAuth modal with existing config
  const openOAuthModal = (provider: 'google' | 'apple') => {
    if (provider === 'google') {
      setOauthFormData({
        enabled: oauthConfig.googleEnabled,
        clientId: oauthConfig.googleClientId,
        clientSecret: oauthConfig.googleClientSecret,
        teamId: '',
        keyId: '',
        privateKey: '',
      });
    } else {
      setOauthFormData({
        enabled: oauthConfig.appleEnabled,
        clientId: oauthConfig.appleClientId,
        clientSecret: '',
        teamId: oauthConfig.appleTeamId,
        keyId: oauthConfig.appleKeyId,
        privateKey: oauthConfig.applePrivateKey,
      });
    }
    setShowOAuthModal(provider);
  };

  // Coupon form state
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE' as DiscountType,
    discountValue: 10,
    duration: 'ONCE' as CouponDuration,
    durationMonths: 3,
    maxRedemptions: undefined as number | undefined,
    expiresAt: '',
    syncToStripe: true,
  });

  // Export transactions to CSV
  const handleExportTransactions = () => {
    if (!transactions || transactions.length === 0) return;
    const headers = ['ID', 'Amount', 'Status', 'Gateway', 'Customer', 'Date'];
    const rows = transactions.map(t => [
      t.id,
      formatCurrency(t.amount),
      t.status,
      t.gateway,
      t.customerEmail || 'N/A',
      formatDate(t.createdAt),
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export audit logs to CSV
  const handleExportAuditLogs = () => {
    if (!logs || logs.length === 0) return;
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Details'];
    const rows = logs.map(l => [
      formatDate(l.createdAt),
      l.user?.name || l.user?.email || 'System',
      l.action,
      l.resourceType,
      l.details || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    if (!logs || auditActionFilter === 'all') return logs;
    return logs.filter(l => l.action.toLowerCase().includes(auditActionFilter.toLowerCase()));
  }, [logs, auditActionFilter]);

  // Pagination handlers
  const handlePreviousPage = () => {
    if (usersPage > 1) {
      setUsersPage(usersPage - 1);
    }
  };

  const handleNextPage = () => {
    const maxPages = Math.ceil(totalUsers / 20);
    if (usersPage < maxPages) {
      setUsersPage(usersPage + 1);
    }
  };

  // Refetch users when search/filters/page change
  useEffect(() => {
    if (activeTab === 'users') {
      refetchUsers({ search: searchQuery, role: selectedRole, status: selectedStatus, page: usersPage });
    }
  }, [searchQuery, selectedRole, selectedStatus, usersPage]);

  // Fetch OAuth config when Settings tab is active
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchOAuthConfig();
    }
  }, [activeTab]);

  // Calculate revenue from license types
  const calculatedRevenue = useMemo(() => {
    const safeTypes = licenseTypes || [];
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;

    safeTypes.forEach(type => {
      const userCount = type._count?.userLicenses || type.userCount || 0;
      monthlyRevenue += (type.priceMonthly || 0) * userCount;
      yearlyRevenue += (type.priceYearly || 0) * userCount;
    });

    return {
      monthly: monthlyRevenue,
      yearly: yearlyRevenue,
      projected: monthlyRevenue * 12,
    };
  }, [licenseTypes]);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Access Denied</h2>
          <p className="text-[#666]">
            You don't have permission to access the admin panel. Please contact your administrator.
          </p>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'features', label: 'Features', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit', icon: Clock },
  ];

  const billingTabs = [
    { id: 'overview', label: 'Revenue', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: Package },
    { id: 'licenses', label: 'Licenses', icon: FileText },
    { id: 'keys', label: 'Keys', icon: Key },
    { id: 'coupons', label: 'Coupons', icon: Star },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
  ];

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#666] text-sm mb-2">
          <Shield size={16} />
          <span>Administration</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Admin Console</h1>
            <p className="text-[#666] mt-1">Manage users, billing, features, and system settings</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="green" size="sm" dot>System Operational</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-6 bg-white/60 p-1.5 rounded-2xl w-fit border border-white/50 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as TabType)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#1A1A1A] text-white shadow-md'
                : 'text-[#666] hover:text-[#1A1A1A] hover:bg-white/70'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))
            ) : (
              <>
                <div className="bg-[#EAD07D] rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/10 flex items-center justify-center mb-4">
                      <Users size={20} className="text-[#1A1A1A]" />
                    </div>
                    <p className="text-3xl font-light text-[#1A1A1A] mb-1">
                      {formatNumber(stats?.users.total)}
                    </p>
                    <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-wider">Total Users</p>
                    <p className="text-xs text-[#1A1A1A]/70 mt-2 flex items-center gap-1">
                      <ArrowUpRight size={12} />
                      +{stats?.users.newThisMonth || 0} this month
                    </p>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                    <p className="text-3xl font-light text-white mb-1">
                      {formatNumber(stats?.users.active)}
                    </p>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Active Users</p>
                    <p className="text-xs text-white/50 mt-2">
                      {stats?.users.total ? Math.round((stats.users.active / stats.users.total) * 100) : 0}% of total
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleTabChange('billing')}
                  className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform text-left w-full"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                      <DollarSign size={20} className="text-white" />
                    </div>
                    <p className="text-3xl font-light text-white mb-1">
                      {formatCurrency(paymentsDashboard?.totalRevenue || calculatedRevenue.monthly, true)}
                    </p>
                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Subscription Revenue</p>
                    <p className="text-xs text-white/80 mt-2 flex items-center gap-1">
                      <ArrowUpRight size={12} />
                      {paymentsDashboard?.activeSubscriptions || 0} active subscriptions
                    </p>
                  </div>
                </button>

                <div className="bg-[#888] rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <Zap size={20} className="text-white" />
                    </div>
                    <p className="text-3xl font-light text-white mb-1">
                      {formatNumber(stats?.ai.totalTokensUsed)}
                    </p>
                    <p className="text-xs font-bold text-white/50 uppercase tracking-wider">AI Tokens</p>
                    <p className="text-xs text-white/60 mt-2">
                      {stats?.ai.successRate || 0}% success rate
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CRM Stats */}
            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Database size={18} className="text-[#EAD07D]" />
                CRM Statistics
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Leads', value: stats?.crm.leads || 0, color: 'bg-blue-500' },
                  { label: 'Contacts', value: stats?.crm.contacts || 0, color: 'bg-green-500' },
                  { label: 'Accounts', value: stats?.crm.accounts || 0, color: 'bg-purple-500' },
                  { label: 'Opportunities', value: stats?.crm.opportunities || 0, color: 'bg-[#EAD07D]' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm text-[#666]">{item.label}</span>
                    </div>
                    <span className="font-bold text-[#1A1A1A]">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Licensing Stats */}
            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-[#EAD07D]" />
                Licensing Overview
              </h3>
              {licensingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 rounded" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#666]">Active Licenses</span>
                    <span className="font-bold text-[#1A1A1A]">{licensingDashboard?.activeLicenses || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#666]">Trial Users</span>
                    <span className="font-bold text-[#1A1A1A]">{licensingDashboard?.trialLicenses || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#666]">Monthly Revenue</span>
                    <span className="font-bold text-green-600">{formatCurrency(licensingDashboard?.revenue?.monthly)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#666]">Annual Revenue</span>
                    <span className="font-bold text-[#1A1A1A]">{formatCurrency(licensingDashboard?.revenue?.yearly)}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* System Health */}
            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Server size={18} className="text-[#EAD07D]" />
                System Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#666]">System Status</span>
                  <Badge variant="green" size="sm">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#666]">Version</span>
                  <span className="font-mono text-sm">{stats?.system.version || '1.0.0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#666]">Uptime</span>
                  <span className="text-sm font-medium">
                    {stats?.system.uptime ? `${Math.floor(stats.system.uptime / 3600)}h` : '99.9%'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#666]">Last Backup</span>
                  <span className="text-sm">{formatDate(stats?.system.lastBackup)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A] flex items-center gap-2">
                <Activity size={18} className="text-[#EAD07D]" />
                Recent Activity
              </h3>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1 font-medium"
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {logsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))
              ) : (logs || []).length === 0 ? (
                <p className="text-center text-[#666] py-8">No recent activity</p>
              ) : (
                (logs || []).slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl hover:bg-[#F2F1EA] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Activity size={14} className="text-[#666]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{log.action}</p>
                        <p className="text-xs text-[#666]">{log.user?.email || 'System'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#999]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="USER">User</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <button
                  onClick={() => refetchUsers()}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                  <tr>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">User</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Role</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Last Login</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F1EA]">
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="py-4 px-6">
                          <Skeleton className="h-12 rounded-xl" />
                        </td>
                      </tr>
                    ))
                  ) : (users || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#666]">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    (users || []).map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar src={u.avatarUrl} name={u.name || u.email} size="sm" />
                            <div>
                              <p className="font-medium text-[#1A1A1A]">{u.name || 'No name'}</p>
                              <p className="text-xs text-[#666]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">{getRoleBadge(u.role)}</td>
                        <td className="py-4 px-6">{getStatusBadge(u.status)}</td>
                        <td className="py-4 px-6 text-sm text-[#666]">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            {u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => suspendUser(u.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                                title="Suspend"
                              >
                                <Ban size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => activateUser(u.id)}
                                className="p-2 rounded-lg hover:bg-green-50 text-[#666] hover:text-green-600 transition-colors"
                                title="Activate"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => resetPassword(u.id)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-[#666] hover:text-blue-600 transition-colors"
                              title="Reset Password"
                            >
                              <Key size={14} />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-[#F2F1EA] text-[#666] transition-colors"
                              title="More"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalUsers > 20 && (
              <div className="p-4 border-t border-[#F2F1EA] flex items-center justify-between">
                <p className="text-sm text-[#666]">
                  Page {usersPage} of {Math.ceil(totalUsers / 20)} • Showing {(users || []).length} of {totalUsers} users
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={usersPage === 1}
                    className="px-4 py-2 rounded-lg bg-[#F8F8F6] text-sm font-medium hover:bg-[#F2F1EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={usersPage >= Math.ceil(totalUsers / 20)}
                    className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Billing Sub-tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {billingTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBillingSubTab(tab.id as BillingSubTab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  billingSubTab === tab.id
                    ? 'bg-[#EAD07D] text-[#1A1A1A]'
                    : 'bg-white text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] border border-[#F2F1EA]'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Revenue Overview */}
          {billingSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Revenue Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {licensingLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                  ))
                ) : (
                  <>
                    <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-green-600/70 uppercase tracking-wider">Monthly Revenue</p>
                          <p className="text-2xl font-light text-green-700 mt-1">
                            {formatCurrency(calculatedRevenue.monthly)}
                          </p>
                          <p className="text-xs text-green-600/70 mt-2">
                            {licensingDashboard?.activeLicenses || 0} active licenses
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <TrendingUp size={18} className="text-green-600" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Annual Revenue</p>
                          <p className="text-2xl font-light text-[#1A1A1A] mt-1">
                            {formatCurrency(calculatedRevenue.yearly)}
                          </p>
                          <p className="text-xs text-[#666] mt-2">
                            Projected: {formatCurrency(calculatedRevenue.projected)}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#F2F1EA] flex items-center justify-center">
                          <DollarSign size={18} className="text-[#666]" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Active Licenses</p>
                          <p className="text-2xl font-light text-[#1A1A1A] mt-1">
                            {licensingDashboard?.activeLicenses || 0}
                          </p>
                          <p className="text-xs text-[#666] mt-2">
                            {licensingDashboard?.trialLicenses || 0} on trial
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#F2F1EA] flex items-center justify-center">
                          <FileText size={18} className="text-[#666]" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Total Licenses</p>
                          <p className="text-2xl font-light text-[#1A1A1A] mt-1">
                            {licensingDashboard?.totalLicenses || 0}
                          </p>
                          <p className="text-xs text-[#666] mt-2">
                            {licensingDashboard?.expiredLicenses || 0} expired
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                          <BarChart3 size={18} className="text-[#1A1A1A]" />
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </div>

              {/* Revenue by Tier */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <PieChart size={18} className="text-[#EAD07D]" />
                    Licenses by Tier
                  </h3>
                  <div className="space-y-3">
                    {(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as LicenseTier[]).map((tier) => {
                      const count = licensingDashboard?.byTier?.[tier] || 0;
                      const total = licensingDashboard?.totalLicenses || 1;
                      const percentage = Math.round((count / total) * 100) || 0;
                      return (
                        <div key={tier}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-[#666]">{tier}</span>
                            <span className="text-sm font-bold text-[#1A1A1A]">{count}</span>
                          </div>
                          <div className="h-2 bg-[#F2F1EA] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                tier === 'ENTERPRISE' ? 'bg-green-500' :
                                tier === 'PROFESSIONAL' ? 'bg-[#1A1A1A]' :
                                tier === 'STARTER' ? 'bg-[#EAD07D]' : 'bg-[#888]'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-[#EAD07D]" />
                    Licenses by Status
                  </h3>
                  <div className="space-y-3">
                    {(['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED'] as LicenseStatus[]).map((status) => {
                      const count = licensingDashboard?.byStatus?.[status] || 0;
                      return (
                        <div key={status} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'ACTIVE' ? 'bg-green-500' :
                              status === 'TRIAL' ? 'bg-[#EAD07D]' :
                              status === 'EXPIRED' ? 'bg-[#888]' : 'bg-red-500'
                            }`} />
                            <span className="text-sm text-[#666]">{status}</span>
                          </div>
                          <span className="font-bold text-[#1A1A1A]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Plans Management */}
          {billingSubTab === 'plans' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Subscription Plans</h3>
                  <p className="text-sm text-[#666]">Manage your pricing tiers and features</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanForm({
                      name: '', slug: '', description: '', tier: 'STARTER',
                      priceMonthly: 0, priceYearly: 0, currency: 'USD',
                      maxUsers: 5, maxConversations: 1000, maxLeads: 500, maxDocuments: 100,
                      isActive: true, isPublic: true,
                    });
                    setShowCreatePlanModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={14} />
                  New Plan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {typesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))
                ) : (licenseTypes || []).length === 0 ? (
                  <Card className="col-span-full p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                      <Package size={24} className="text-[#999]" />
                    </div>
                    <h4 className="font-bold text-[#1A1A1A] mb-2">No Plans Yet</h4>
                    <p className="text-sm text-[#666] mb-4">Create your first subscription plan</p>
                    <button
                      onClick={() => setShowCreatePlanModal(true)}
                      className="px-4 py-2 rounded-xl bg-[#EAD07D] text-[#1A1A1A] font-medium text-sm hover:bg-[#E5C56B] transition-colors"
                    >
                      Create Plan
                    </button>
                  </Card>
                ) : (
                  (licenseTypes || []).map((plan) => (
                    <Card key={plan.id} className={`p-5 relative overflow-hidden ${
                      plan.tier === 'ENTERPRISE' ? 'bg-gradient-to-br from-[#1A1A1A] to-[#333] text-white' :
                      plan.tier === 'PROFESSIONAL' ? 'bg-gradient-to-br from-[#EAD07D]/20 to-[#EAD07D]/5' : ''
                    }`}>
                      {plan.tier === 'ENTERPRISE' && (
                        <div className="absolute top-3 right-3">
                          <Crown size={16} className="text-[#EAD07D]" />
                        </div>
                      )}
                      <div className="mb-4">
                        {getTierBadge(plan.tier)}
                      </div>
                      <h4 className={`font-bold text-lg mb-1 ${plan.tier === 'ENTERPRISE' ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {plan.name}
                      </h4>
                      <p className={`text-xs mb-4 ${plan.tier === 'ENTERPRISE' ? 'text-white/60' : 'text-[#666]'}`}>
                        {plan.description || 'No description'}
                      </p>
                      <div className="mb-4">
                        <span className={`text-2xl font-light ${plan.tier === 'ENTERPRISE' ? 'text-white' : 'text-[#1A1A1A]'}`}>
                          {formatCurrency(plan.priceMonthly)}
                        </span>
                        <span className={`text-xs ${plan.tier === 'ENTERPRISE' ? 'text-white/50' : 'text-[#888]'}`}>/mo</span>
                      </div>
                      <div className={`space-y-2 text-xs ${plan.tier === 'ENTERPRISE' ? 'text-white/70' : 'text-[#666]'}`}>
                        {plan.maxUsers && (
                          <div className="flex items-center gap-2">
                            <Users size={12} />
                            <span>{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} users</span>
                          </div>
                        )}
                        {plan.maxConversations && (
                          <div className="flex items-center gap-2">
                            <Zap size={12} />
                            <span>{plan.maxConversations === -1 ? 'Unlimited' : formatNumber(plan.maxConversations)} AI chats</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className={`text-xs ${plan.tier === 'ENTERPRISE' ? 'text-white/50' : 'text-[#888]'}`}>
                          {plan._count?.userLicenses || 0} active
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingPlan(plan);
                              setPlanForm({
                                name: plan.name || '',
                                slug: plan.slug || '',
                                description: plan.description || '',
                                tier: plan.tier || 'STARTER',
                                priceMonthly: plan.priceMonthly || 0,
                                priceYearly: plan.priceYearly || 0,
                                currency: plan.currency || 'USD',
                                maxUsers: plan.maxUsers ?? 5,
                                maxConversations: plan.maxConversations ?? 1000,
                                maxLeads: plan.maxLeads ?? 500,
                                maxDocuments: plan.maxDocuments ?? 100,
                                isActive: plan.isActive ?? true,
                                isPublic: plan.isPublic ?? true,
                              });
                              setShowCreatePlanModal(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                            plan.tier === 'ENTERPRISE'
                              ? 'hover:bg-white/10 text-white/60'
                              : 'hover:bg-[#F2F1EA] text-[#888]'
                          }`}
                            title="Edit Plan"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              type: 'deletePlan',
                              itemId: plan.id,
                              itemName: plan.name,
                            })}
                            className={`p-1.5 rounded-lg transition-colors ${
                            plan.tier === 'ENTERPRISE'
                              ? 'hover:bg-white/10 text-white/60'
                              : 'hover:bg-red-50 text-[#888] hover:text-red-600'
                          }`}
                            title="Delete Plan"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* User Licenses */}
          {billingSubTab === 'licenses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">User Licenses</h3>
                  <p className="text-sm text-[#666]">Manage individual user subscriptions</p>
                </div>
                <button
                  onClick={() => setShowAssignLicenseModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <UserPlus size={14} />
                  Assign License
                </button>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                      <tr>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">User</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Plan</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Expires</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F1EA]">
                      {licensesLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5} className="py-4 px-6">
                              <Skeleton className="h-12 rounded-xl" />
                            </td>
                          </tr>
                        ))
                      ) : (userLicenses || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#666]">
                            No licenses assigned yet
                          </td>
                        </tr>
                      ) : (
                        (userLicenses || []).map((license) => (
                          <tr key={license.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <Avatar src={license.user?.avatarUrl} name={license.user?.name || license.user?.email} size="sm" />
                                <div>
                                  <p className="font-medium text-[#1A1A1A]">
                                    {license.user?.firstName && license.user?.lastName
                                      ? `${license.user.firstName} ${license.user.lastName}`
                                      : license.user?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-[#666]">{license.user?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {license.licenseType ? getTierBadge(license.licenseType.tier) : <span className="text-[#666]">-</span>}
                            </td>
                            <td className="py-4 px-6">
                              {getStatusBadge(license.status)}
                              {license.isTrial && (
                                <Badge variant="outline" size="sm" className="ml-1">Trial</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-[#666]">
                              {formatDate(license.endDate)}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                {license.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => suspendLicense(license.id)}
                                    className="p-2 rounded-lg hover:bg-yellow-50 text-[#666] hover:text-yellow-600 transition-colors"
                                    title="Suspend"
                                  >
                                    <Ban size={14} />
                                  </button>
                                )}
                                {license.status === 'SUSPENDED' && (
                                  <button
                                    onClick={() => resumeLicense(license.id)}
                                    className="p-2 rounded-lg hover:bg-green-50 text-[#666] hover:text-green-600 transition-colors"
                                    title="Resume"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => renewLicense(license.id)}
                                  className="p-2 rounded-lg hover:bg-blue-50 text-[#666] hover:text-blue-600 transition-colors"
                                  title="Renew"
                                >
                                  <RefreshCw size={14} />
                                </button>
                                <button
                                  onClick={() => revokeLicense(license.id)}
                                  className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                                  title="Revoke"
                                >
                                  <XCircle size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* License Keys */}
          {billingSubTab === 'keys' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">License Keys</h3>
                  <p className="text-sm text-[#666]">Pre-generated keys for distribution</p>
                </div>
                <button
                  onClick={() => setShowGenerateKeysModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={14} />
                  Generate Keys
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Available</p>
                  <p className="text-2xl font-light text-green-600">
                    {(licenseKeys || []).filter(k => k.status === 'AVAILABLE').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Claimed</p>
                  <p className="text-2xl font-light text-[#EAD07D]">
                    {(licenseKeys || []).filter(k => k.status === 'CLAIMED').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Expired</p>
                  <p className="text-2xl font-light text-[#888]">
                    {(licenseKeys || []).filter(k => k.status === 'EXPIRED').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Revoked</p>
                  <p className="text-2xl font-light text-red-500">
                    {(licenseKeys || []).filter(k => k.status === 'REVOKED').length}
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                      <tr>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Key</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Plan</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Claimed By</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F1EA]">
                      {keysLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5} className="py-4 px-6">
                              <Skeleton className="h-12 rounded-xl" />
                            </td>
                          </tr>
                        ))
                      ) : (licenseKeys || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#666]">
                            No license keys generated yet
                          </td>
                        </tr>
                      ) : (
                        (licenseKeys || []).map((key) => (
                          <tr key={key.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-[#F8F8F6] px-2 py-1 rounded">
                                  {key.licenseKey.slice(0, 8)}...{key.licenseKey.slice(-4)}
                                </code>
                                <button
                                  onClick={() => navigator.clipboard.writeText(key.licenseKey)}
                                  className="p-1 rounded hover:bg-[#F2F1EA] text-[#888] hover:text-[#1A1A1A] transition-colors"
                                  title="Copy"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {key.licenseType ? getTierBadge(key.licenseType.tier) : <span className="text-[#666]">-</span>}
                            </td>
                            <td className="py-4 px-6">
                              {getKeyStatusBadge(key.status)}
                              {key.isTrial && (
                                <Badge variant="outline" size="sm" className="ml-1">Trial</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-[#666]">
                              {key.claimedBy ? key.claimedBy.email : '-'}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                {key.status === 'AVAILABLE' && (
                                  <button
                                    onClick={() => revokeKey(key.id)}
                                    className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                                    title="Revoke"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Coupons Management */}
          {billingSubTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Discount Coupons</h3>
                  <p className="text-sm text-[#666]">Manage promotional codes and discounts</p>
                </div>
                <button
                  onClick={() => {
                    setCouponForm({
                      code: '',
                      name: '',
                      description: '',
                      discountType: 'PERCENTAGE',
                      discountValue: 10,
                      duration: 'ONCE',
                      durationMonths: 3,
                      maxRedemptions: undefined,
                      expiresAt: '',
                      syncToStripe: true,
                    });
                    setEditingCoupon(null);
                    setShowCreateCouponModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={14} />
                  New Coupon
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Active</p>
                  <p className="text-2xl font-light text-green-600">
                    {(coupons || []).filter(c => c.isActive).length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Total Redemptions</p>
                  <p className="text-2xl font-light text-[#EAD07D]">
                    {(coupons || []).reduce((sum, c) => sum + (c.timesRedeemed || 0), 0)}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Expired</p>
                  <p className="text-2xl font-light text-[#888]">
                    {(coupons || []).filter(c => c.expiresAt && new Date(c.expiresAt) < new Date()).length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Total Coupons</p>
                  <p className="text-2xl font-light text-[#1A1A1A]">
                    {(coupons || []).length}
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                      <tr>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Code</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Discount</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Duration</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Redemptions</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F1EA]">
                      {couponsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={6} className="py-4 px-6">
                              <Skeleton className="h-12 rounded-xl" />
                            </td>
                          </tr>
                        ))
                      ) : (coupons || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#666]">
                            No coupons created yet
                          </td>
                        </tr>
                      ) : (
                        (coupons || []).map((coupon) => (
                          <tr key={coupon.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono font-bold bg-[#EAD07D]/20 text-[#1A1A1A] px-2 py-1 rounded">
                                  {coupon.code}
                                </code>
                                <button
                                  onClick={() => navigator.clipboard.writeText(coupon.code)}
                                  className="p-1 rounded hover:bg-[#F2F1EA] text-[#888] hover:text-[#1A1A1A] transition-colors"
                                  title="Copy"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                              {coupon.name && (
                                <p className="text-xs text-[#666] mt-1">{coupon.name}</p>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-[#1A1A1A]">
                                {coupon.discountType === 'PERCENTAGE'
                                  ? `${coupon.discountValue}%`
                                  : formatCurrency(coupon.discountValue)}
                              </span>
                              <span className="text-xs text-[#666] ml-1">off</span>
                            </td>
                            <td className="py-4 px-6">
                              <Badge variant="outline" size="sm">
                                {coupon.duration === 'ONCE' && 'One-time'}
                                {coupon.duration === 'FOREVER' && 'Forever'}
                                {coupon.duration === 'REPEATING' && `${coupon.durationMonths || 0} months`}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-[#666]">
                                {coupon.timesRedeemed || 0}
                                {coupon.maxRedemptions && ` / ${coupon.maxRedemptions}`}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {coupon.isActive ? (
                                coupon.expiresAt && new Date(coupon.expiresAt) < new Date() ? (
                                  <Badge variant="outline" size="sm">Expired</Badge>
                                ) : coupon.maxRedemptions && (coupon.timesRedeemed || 0) >= coupon.maxRedemptions ? (
                                  <Badge variant="yellow" size="sm">Maxed Out</Badge>
                                ) : (
                                  <Badge variant="green" size="sm">Active</Badge>
                                )
                              ) : (
                                <Badge variant="outline" size="sm">Inactive</Badge>
                              )}
                              {coupon.stripeCouponId && (
                                <Badge variant="dark" size="sm" className="ml-1">Stripe</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCoupon(coupon);
                                    setCouponForm({
                                      code: coupon.code,
                                      name: coupon.name || '',
                                      description: coupon.description || '',
                                      discountType: coupon.discountType,
                                      discountValue: coupon.discountValue,
                                      duration: coupon.duration,
                                      durationMonths: coupon.durationMonths || 3,
                                      maxRedemptions: coupon.maxRedemptions,
                                      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
                                      syncToStripe: !!coupon.stripeCouponId,
                                    });
                                    setShowCreateCouponModal(true);
                                  }}
                                  className="p-2 rounded-lg hover:bg-[#F2F1EA] text-[#666] hover:text-[#1A1A1A] transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => setConfirmModal({
                                    isOpen: true,
                                    type: 'deleteCoupon',
                                    itemId: coupon.id,
                                    itemName: coupon.code,
                                  })}
                                  className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Transactions History */}
          {billingSubTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Transaction History</h3>
                  <p className="text-sm text-[#666]">View all payment transactions</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => refetchTransactions()}
                    className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] hover:bg-[#F2F1EA] transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                  <button
                    onClick={handleExportTransactions}
                    className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] hover:bg-[#F2F1EA] transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Download size={14} />
                    Export
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
                  <p className="text-xs font-bold text-green-600/70 uppercase tracking-wider mb-1">Successful</p>
                  <p className="text-2xl font-light text-green-700">
                    {(transactions || []).filter(t => t.status === 'SUCCEEDED').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Pending</p>
                  <p className="text-2xl font-light text-[#EAD07D]">
                    {(transactions || []).filter(t => t.status === 'PENDING').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Failed</p>
                  <p className="text-2xl font-light text-red-500">
                    {(transactions || []).filter(t => t.status === 'FAILED').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Refunded</p>
                  <p className="text-2xl font-light text-[#888]">
                    {(transactions || []).filter(t => t.status === 'REFUNDED').length}
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                      <tr>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Transaction ID</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Customer</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Amount</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Gateway</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Date</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F1EA]">
                      {transactionsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={7} className="py-4 px-6">
                              <Skeleton className="h-12 rounded-xl" />
                            </td>
                          </tr>
                        ))
                      ) : (transactions || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-[#666]">
                            No transactions yet
                          </td>
                        </tr>
                      ) : (
                        (transactions || []).map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-4 px-6">
                              <code className="text-xs font-mono bg-[#F8F8F6] px-2 py-1 rounded">
                                {transaction.id.slice(0, 12)}...
                              </code>
                            </td>
                            <td className="py-4 px-6">
                              <div>
                                <p className="text-sm font-medium text-[#1A1A1A]">
                                  {transaction.customer?.user?.name || transaction.customer?.user?.email || 'Unknown'}
                                </p>
                                <p className="text-xs text-[#666]">{transaction.customer?.user?.email}</p>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-[#1A1A1A]">
                                {formatCurrency(transaction.amount)}
                              </span>
                              <span className="text-xs text-[#666] ml-1 uppercase">{transaction.currency}</span>
                            </td>
                            <td className="py-4 px-6">
                              <Badge
                                variant={transaction.gateway === 'STRIPE' ? 'dark' : 'yellow'}
                                size="sm"
                              >
                                {transaction.gateway}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <Badge
                                variant={
                                  transaction.status === 'SUCCEEDED' ? 'green' :
                                  transaction.status === 'PENDING' ? 'yellow' :
                                  transaction.status === 'REFUNDED' ? 'outline' : 'red'
                                }
                                size="sm"
                              >
                                {transaction.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 text-sm text-[#666]">
                              {formatDate(transaction.createdAt)}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                {transaction.status === 'SUCCEEDED' && (
                                  <button
                                    onClick={() => setConfirmModal({
                                      isOpen: true,
                                      type: 'refundPayment',
                                      itemId: transaction.id,
                                      itemName: `${formatCurrency(transaction.amount)} payment`,
                                    })}
                                    className="p-2 rounded-lg hover:bg-yellow-50 text-[#666] hover:text-yellow-600 transition-colors"
                                    title="Refund"
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                )}
                                <button
                                  className="p-2 rounded-lg hover:bg-[#F2F1EA] text-[#666] transition-colors"
                                  title="View Details"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-[#1A1A1A]">Feature Flags</h3>
                <p className="text-sm text-[#666]">Enable or disable features across the platform</p>
              </div>
            </div>

            {flagsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (flags || []).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-[#999]" />
                </div>
                <p className="text-[#666]">No feature flags configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(flags || []).map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F2F1EA] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        flag.enabled ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Zap size={18} className={flag.enabled ? 'text-green-600' : 'text-gray-400'} />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{flag.name}</p>
                        <p className="text-xs text-[#666]">{flag.description || flag.key}</p>
                        {flag.category && (
                          <Badge variant="outline" size="sm" className="mt-1">{flag.category}</Badge>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFlag(flag.key)}
                      className={`p-2 rounded-lg transition-colors ${
                        flag.enabled
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {flag.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {configsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Group configs by category */}
              {(() => {
                const safeConfigs = configs || [];
                const categories = [...new Set(safeConfigs.map(c => c.category || 'general'))];
                const categoryIcons: Record<string, React.ReactNode> = {
                  general: <Settings size={18} className="text-[#EAD07D]" />,
                  security: <Lock size={18} className="text-[#EAD07D]" />,
                  ai: <Zap size={18} className="text-[#EAD07D]" />,
                  email: <Mail size={18} className="text-[#EAD07D]" />,
                  notifications: <Bell size={18} className="text-[#EAD07D]" />,
                  integrations: <Database size={18} className="text-[#EAD07D]" />,
                };
                const categoryLabels: Record<string, string> = {
                  general: 'General Settings',
                  security: 'Security Settings',
                  ai: 'AI Configuration',
                  email: 'Email Settings',
                  notifications: 'Notification Settings',
                  integrations: 'Integration Settings',
                };

                if (categories.length === 0) {
                  // Show defaults if no configs
                  return (
                    <>
                      <Card className="p-6">
                        <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                          <Settings size={18} className="text-[#EAD07D]" />
                          General Settings
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">Application Name</p>
                              <p className="text-xs text-[#666]">The name displayed across the platform</p>
                            </div>
                            <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">SalesOS</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">Support Email</p>
                              <p className="text-xs text-[#666]">Contact email for support inquiries</p>
                            </div>
                            <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">support@salesos.org</span>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                          <Lock size={18} className="text-[#EAD07D]" />
                          Security Settings
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">Session Timeout</p>
                              <p className="text-xs text-[#666]">Auto logout after inactivity</p>
                            </div>
                            <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">30 min</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">Two-Factor Auth</p>
                              <p className="text-xs text-[#666]">Require 2FA for all users</p>
                            </div>
                            <Badge variant="green" size="sm">Enabled</Badge>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                          <Zap size={18} className="text-[#EAD07D]" />
                          AI Configuration
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">Default Model</p>
                              <p className="text-xs text-[#666]">AI model for conversations</p>
                            </div>
                            <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">claude-sonnet</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">Max Tokens</p>
                              <p className="text-xs text-[#666]">Maximum response length</p>
                            </div>
                            <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">4,096</span>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                          <Mail size={18} className="text-[#EAD07D]" />
                          Email Settings
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">SMTP Provider</p>
                              <p className="text-xs text-[#666]">Email delivery service</p>
                            </div>
                            <Badge variant="green" size="sm">Connected</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">From Address</p>
                              <p className="text-xs text-[#666]">Default sender email</p>
                            </div>
                            <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">noreply@salesos.org</span>
                          </div>
                        </div>
                      </Card>
                    </>
                  );
                }

                return categories.map(category => {
                  const categoryConfigs = safeConfigs.filter(c => (c.category || 'general') === category);
                  return (
                    <Card key={category} className="p-6">
                      <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                        {categoryIcons[category] || <Settings size={18} className="text-[#EAD07D]" />}
                        {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1)}
                      </h3>
                      <div className="space-y-4">
                        {categoryConfigs.map(config => (
                          <div key={config.key} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">
                                {config.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                              </p>
                              {config.description && (
                                <p className="text-xs text-[#666]">{config.description}</p>
                              )}
                            </div>
                            {config.isSecret ? (
                              <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">••••••••</span>
                            ) : config.value === 'true' || config.value === 'false' ? (
                              <Badge variant={config.value === 'true' ? 'green' : 'outline'} size="sm">
                                {config.value === 'true' ? 'Enabled' : 'Disabled'}
                              </Badge>
                            ) : (
                              <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA] max-w-[200px] truncate">
                                {config.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                });
              })()}
            </div>
          )}

          {/* Payment Gateways - Always shown */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-[#EAD07D]" />
              Payment Gateways
            </h3>
            <p className="text-sm text-[#666] mb-6">
              Configure payment gateway credentials for Stripe (US/Global) and Razorpay (India).
            </p>

            {gatewaysLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Stripe Configuration */}
                {(() => {
                  const stripeConfig = gatewayConfigs?.find(c => c.provider === 'STRIPE');
                  return (
                    <div className="border border-[#F2F1EA] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-[#F8F8F6]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#635BFF] flex items-center justify-center p-2">
                            <svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                              <path fillRule="evenodd" clipRule="evenodd" d="M59.64 12.776c0-4.12-1.996-7.372-5.816-7.372-3.836 0-6.156 3.252-6.156 7.34 0 4.844 2.74 7.292 6.672 7.292 1.916 0 3.364-.436 4.46-1.048v-3.22c-1.096.548-2.356.888-3.956.888-1.568 0-2.96-.548-3.14-2.452h7.912c0-.208.024-1.044.024-1.428zm-8-1.54c0-1.82 1.112-2.58 2.128-2.58.984 0 2.032.76 2.032 2.58h-4.16zM41.32 5.404c-1.584 0-2.604.744-3.172 1.26l-.212-.996h-3.54v19.06l4.024-.856.008-4.628c.584.424 1.444 1.024 2.868 1.024 2.9 0 5.54-2.332 5.54-7.468-.016-4.696-2.692-7.396-5.516-7.396zm-.972 11.372c-.956 0-1.52-.34-1.912-.76l-.016-6.004c.424-.468.996-.792 1.928-.792 1.476 0 2.496 1.656 2.496 3.772 0 2.164-1.004 3.784-2.496 3.784zM28.144 4.24l4.04-.868V0l-4.04.856v3.384zM28.144 5.66h4.04v14.048h-4.04V5.66zM23.78 6.9l-.252-1.24h-3.48v14.048h4.024V10.06c.952-1.24 2.56-1.012 3.064-.836V5.66c-.52-.192-2.42-.548-3.356 1.24zM15.884 1.74l-3.928.836-.016 12.864c0 2.376 1.784 4.128 4.16 4.128 1.316 0 2.28-.244 2.812-.532v-3.268c-.516.208-3.06.948-3.06-1.428V8.932h3.06V5.66h-3.06l.032-3.92zM4.04 10.284c0-.632.52-.872 1.38-.872 1.236 0 2.796.372 4.032 1.04V6.596c-1.348-.54-2.68-.752-4.032-.752C2.168 5.844 0 7.532 0 10.476c0 4.56 6.276 3.832 6.276 5.8 0 .748-.652 1.004-1.564 1.004-1.356 0-3.088-.556-4.46-1.308v3.912c1.52.656 3.06.936 4.46.936 3.324 0 5.608-1.64 5.608-4.632-.016-4.924-6.32-4.052-6.32-5.904h.04z" fill="white"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-[#1A1A1A]">Stripe</h4>
                            <p className="text-xs text-[#666]">US & Global payments</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {stripeConfig?.connectionStatus === 'connected' && (
                            <Badge variant="green" size="sm">Connected</Badge>
                          )}
                          {stripeConfig?.connectionStatus === 'error' && (
                            <Badge variant="red" size="sm">Error</Badge>
                          )}
                          {(!stripeConfig?.connectionStatus || stripeConfig?.connectionStatus === 'untested') && (
                            <Badge variant="outline" size="sm">Not Configured</Badge>
                          )}
                          {stripeConfig?.testMode && (
                            <Badge variant="yellow" size="sm">Test Mode</Badge>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <button
                          onClick={() => {
                            setEditingGateway('STRIPE' as PaymentGateway);
                            setGatewayForm({
                              publicKey: stripeConfig?.publicKey || '',
                              secretKey: '',
                              webhookSecret: '',
                              testMode: stripeConfig?.testMode ?? true,
                              isActive: stripeConfig?.isActive ?? false,
                            });
                          }}
                          className="w-full px-4 py-2 text-sm font-medium text-[#1A1A1A] bg-[#F8F8F6] hover:bg-[#F2F1EA] rounded-lg transition-colors"
                        >
                          Configure Stripe
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Razorpay Configuration */}
                {(() => {
                  const razorpayConfig = gatewayConfigs?.find(c => c.provider === 'RAZORPAY');
                  return (
                    <div className="border border-[#F2F1EA] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-[#F8F8F6]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#072654] flex items-center justify-center p-2">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                              <path d="M22.436 0H14.06l-2.5 6.5h6.49L9.472 24h2.972l9.992-24z" fill="#3395FF"/>
                              <path d="M14.06 0H5.62L0 14.5h6.5L1.563 24h2.973L14.06 0z" fill="white"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-[#1A1A1A]">Razorpay</h4>
                            <p className="text-xs text-[#666]">India payments</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {razorpayConfig?.connectionStatus === 'connected' && (
                            <Badge variant="green" size="sm">Connected</Badge>
                          )}
                          {razorpayConfig?.connectionStatus === 'error' && (
                            <Badge variant="red" size="sm">Error</Badge>
                          )}
                          {(!razorpayConfig?.connectionStatus || razorpayConfig?.connectionStatus === 'untested') && (
                            <Badge variant="outline" size="sm">Not Configured</Badge>
                          )}
                          {razorpayConfig?.testMode && (
                            <Badge variant="yellow" size="sm">Test Mode</Badge>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <button
                          onClick={() => {
                            setEditingGateway('RAZORPAY' as PaymentGateway);
                            setGatewayForm({
                              publicKey: razorpayConfig?.publicKey || '',
                              secretKey: '',
                              webhookSecret: '',
                              testMode: razorpayConfig?.testMode ?? true,
                              isActive: razorpayConfig?.isActive ?? false,
                            });
                          }}
                          className="w-full px-4 py-2 text-sm font-medium text-[#1A1A1A] bg-[#F8F8F6] hover:bg-[#F2F1EA] rounded-lg transition-colors"
                        >
                          Configure Razorpay
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </Card>

          {/* OAuth / Social Login Settings */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Key size={18} className="text-[#EAD07D]" />
              Social Login (OAuth)
            </h3>
            <p className="text-sm text-[#666] mb-6">
              Configure Google and Apple Sign-In for your users. Credentials are stored securely in the database.
            </p>

            {oauthLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Google OAuth */}
                <div className="border border-[#F2F1EA] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-[#F8F8F6]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-[#E5E5E5]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M23.52 12.29C23.52 11.43 23.44 10.64 23.3 9.87H12V14.51H18.46C18.18 15.99 17.34 17.25 16.08 18.1V21.09H19.95C22.21 19 23.52 15.92 23.52 12.29Z" fill="#4285F4"/>
                          <path d="M12 24C15.24 24 17.96 22.92 19.95 21.09L16.08 18.1C15 18.82 13.62 19.25 12 19.25C8.87 19.25 6.22 17.14 5.27 14.29H1.27V17.38C3.25 21.32 7.31 24 12 24Z" fill="#34A853"/>
                          <path d="M5.27 14.29C5.03 13.57 4.9 12.8 4.9 12C4.9 11.2 5.03 10.43 5.27 9.71V6.62H1.27C0.46 8.23 0 10.06 0 12C0 13.94 0.46 15.77 1.27 17.38L5.27 14.29Z" fill="#FBBC05"/>
                          <path d="M12 4.75C13.76 4.75 15.34 5.36 16.58 6.55L20.03 3.1C17.96 1.16 15.24 0 12 0C7.31 0 3.25 2.68 1.27 6.62L5.27 9.71C6.22 6.86 8.87 4.75 12 4.75Z" fill="#EA4335"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-[#1A1A1A]">Google Sign-In</h4>
                        <p className="text-xs text-[#666]">OAuth 2.0 authentication</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {oauthConfig.googleClientId && oauthConfig.googleClientSecret ? (
                        oauthConfig.googleEnabled ? (
                          <Badge variant="green" size="sm">Enabled</Badge>
                        ) : (
                          <Badge variant="yellow" size="sm">Configured</Badge>
                        )
                      ) : (
                        <Badge variant="outline" size="sm">Not Configured</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <button
                      onClick={() => openOAuthModal('google')}
                      className="w-full px-4 py-2 text-sm font-medium text-[#1A1A1A] bg-[#F8F8F6] hover:bg-[#F2F1EA] rounded-lg transition-colors"
                    >
                      Configure Google
                    </button>
                  </div>
                </div>

                {/* Apple OAuth */}
                <div className="border border-[#F2F1EA] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-[#F8F8F6]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#000] flex items-center justify-center">
                        <svg width="18" height="22" viewBox="0 0 18 22" fill="white">
                          <path d="M17.0703 7.29C16.9203 7.39 14.5203 8.7 14.5203 11.71C14.5203 15.23 17.6203 16.43 17.7003 16.46C17.6903 16.53 17.2203 18.23 16.0603 19.98C15.0403 21.51 13.9803 23.03 12.3603 23.03C10.7403 23.03 10.2603 22.07 8.39025 22.07C6.56025 22.07 5.84025 23.06 4.35025 23.06C2.86025 23.06 1.83025 21.63 0.650254 19.91C-0.719746 17.88 -0.749746 15.56 0.550254 14.31C1.46025 13.44 2.69025 12.96 3.87025 12.96C5.40025 12.96 6.21025 13.95 7.82025 13.95C9.39025 13.95 9.99025 12.96 11.7303 12.96C12.7703 12.96 13.8803 13.33 14.7603 14.08C12.4903 15.41 12.8603 18.67 15.3303 19.53C14.6103 20.9 13.6603 22.21 12.3603 22.21C11.0803 22.21 10.5403 21.42 8.89025 21.42C7.20025 21.42 6.40025 22.24 5.25025 22.24C3.97025 22.24 2.95025 20.99 2.04025 19.49C0.850254 17.54 0.710254 15.3 1.61025 14.14C2.23025 13.32 3.19025 12.85 4.20025 12.85C5.58025 12.85 6.39025 13.67 7.82025 13.67C9.29025 13.67 9.92025 12.85 11.5703 12.85C12.5803 12.85 13.5703 13.2 14.3803 13.82C15.6303 12.31 16.3503 10.48 16.3803 8.59C14.2803 7.85 17.0703 7.29 17.0703 7.29ZM12.5103 4.62C13.2303 3.72 13.7503 2.48 13.5903 1.22C12.4803 1.28 11.1703 1.97 10.3603 2.89C9.63025 3.71 9.05025 4.96 9.24025 6.17C10.4503 6.21 11.7503 5.54 12.5103 4.62Z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-[#1A1A1A]">Apple Sign-In</h4>
                        <p className="text-xs text-[#666]">Sign in with Apple</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {oauthConfig.appleClientId && oauthConfig.appleTeamId && oauthConfig.appleKeyId && oauthConfig.applePrivateKey ? (
                        oauthConfig.appleEnabled ? (
                          <Badge variant="green" size="sm">Enabled</Badge>
                        ) : (
                          <Badge variant="yellow" size="sm">Configured</Badge>
                        )
                      ) : (
                        <Badge variant="outline" size="sm">Not Configured</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <button
                      onClick={() => openOAuthModal('apple')}
                      className="w-full px-4 py-2 text-sm font-medium text-[#1A1A1A] bg-[#F8F8F6] hover:bg-[#F2F1EA] rounded-lg transition-colors"
                    >
                      Configure Apple
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Data Sync Card */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <RefreshCw size={18} className="text-[#EAD07D]" />
              Data Sync
            </h3>
            <p className="text-sm text-[#666] mb-6">
              Sync subscription and invoice data from Stripe to resolve any discrepancies.
            </p>

            <div className="border border-[#F2F1EA] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#635BFF] flex items-center justify-center p-2">
                    <svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <path fillRule="evenodd" clipRule="evenodd" d="M59.64 12.776c0-4.12-1.996-7.372-5.816-7.372-3.836 0-6.156 3.252-6.156 7.34 0 4.844 2.74 7.292 6.672 7.292 1.916 0 3.364-.436 4.46-1.048v-3.22c-1.096.548-2.356.888-3.956.888-1.568 0-2.96-.548-3.14-2.452h7.912c0-.208.024-1.044.024-1.428zm-8-1.54c0-1.82 1.112-2.58 2.128-2.58.984 0 2.032.76 2.032 2.58h-4.16zM41.32 5.404c-1.584 0-2.604.744-3.172 1.26l-.212-.996h-3.54v19.06l4.024-.856.008-4.628c.584.424 1.444 1.024 2.868 1.024 2.9 0 5.54-2.332 5.54-7.468-.016-4.696-2.692-7.396-5.516-7.396zm-.972 11.372c-.956 0-1.52-.34-1.912-.76l-.016-6.004c.424-.468.996-.792 1.928-.792 1.476 0 2.496 1.656 2.496 3.772 0 2.164-1.004 3.784-2.496 3.784zM28.144 4.24l4.04-.868V0l-4.04.856v3.384zM28.144 5.66h4.04v14.048h-4.04V5.66zM23.78 6.9l-.252-1.24h-3.48v14.048h4.024V10.06c.952-1.24 2.56-1.012 3.064-.836V5.66c-.52-.192-2.42-.548-3.356 1.24zM15.884 1.74l-3.928.836-.016 12.864c0 2.376 1.784 4.128 4.16 4.128 1.316 0 2.28-.244 2.812-.532v-3.268c-.516.208-3.06.948-3.06-1.428V8.932h3.06V5.66h-3.06l.032-3.92zM4.04 10.284c0-.632.52-.872 1.38-.872 1.236 0 2.796.372 4.032 1.04V6.596c-1.348-.54-2.68-.752-4.032-.752C2.168 5.844 0 7.532 0 10.476c0 4.56 6.276 3.832 6.276 5.8 0 .748-.652 1.004-1.564 1.004-1.356 0-3.088-.556-4.46-1.308v3.912c1.52.656 3.06.936 4.46.936 3.324 0 5.608-1.64 5.608-4.632-.016-4.924-6.32-4.052-6.32-5.904h.04z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#1A1A1A]">Sync from Stripe</h4>
                    <p className="text-xs text-[#666]">Import subscriptions, customers & invoices</p>
                  </div>
                </div>
                <button
                  onClick={handleStripeSync}
                  disabled={syncingStripe}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#635BFF] hover:bg-[#5147e6] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {syncingStripe ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Sync Now
                    </>
                  )}
                </button>
              </div>

              {/* Sync Results */}
              {syncResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-green-600" />
                    <span className="font-medium text-green-800">Sync Completed</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-green-600 font-medium">{syncResult.subscriptionsProcessed}</p>
                      <p className="text-green-700 text-xs">Subscriptions Processed</p>
                    </div>
                    <div>
                      <p className="text-green-600 font-medium">{syncResult.subscriptionsCreated}</p>
                      <p className="text-green-700 text-xs">Subscriptions Created</p>
                    </div>
                    <div>
                      <p className="text-green-600 font-medium">{syncResult.invoicesProcessed}</p>
                      <p className="text-green-700 text-xs">Invoices Processed</p>
                    </div>
                    <div>
                      <p className="text-green-600 font-medium">{syncResult.invoicesCreated}</p>
                      <p className="text-green-700 text-xs">Invoices Created</p>
                    </div>
                  </div>
                  {syncResult.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-amber-700 text-xs font-medium mb-1">Warnings ({syncResult.errors.length}):</p>
                      <ul className="text-xs text-amber-600 space-y-1">
                        {syncResult.errors.slice(0, 3).map((err, i) => (
                          <li key={i} className="truncate">{err}</li>
                        ))}
                        {syncResult.errors.length > 3 && (
                          <li className="text-amber-500">...and {syncResult.errors.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Sync Error */}
              {syncError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle size={18} className="text-red-600" />
                    <span className="font-medium text-red-800">Sync Failed</span>
                  </div>
                  <p className="text-sm text-red-600 mt-2">{syncError}</p>
                </div>
              )}

              <p className="text-xs text-[#999] mt-4">
                Use this if subscriptions or invoices are missing from the dashboard. This will fetch all data from Stripe and update local records.
              </p>
            </div>
          </Card>

          {/* Gateway Configuration Modal */}
          {editingGateway && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-[#F2F1EA]">
                  <h3 className="font-bold text-[#1A1A1A] flex items-center gap-3">
                    {editingGateway === 'STRIPE' ? (
                      <div className="w-8 h-8 rounded-lg bg-[#635BFF] flex items-center justify-center p-1.5">
                        <svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                          <path fillRule="evenodd" clipRule="evenodd" d="M59.64 12.776c0-4.12-1.996-7.372-5.816-7.372-3.836 0-6.156 3.252-6.156 7.34 0 4.844 2.74 7.292 6.672 7.292 1.916 0 3.364-.436 4.46-1.048v-3.22c-1.096.548-2.356.888-3.956.888-1.568 0-2.96-.548-3.14-2.452h7.912c0-.208.024-1.044.024-1.428zm-8-1.54c0-1.82 1.112-2.58 2.128-2.58.984 0 2.032.76 2.032 2.58h-4.16zM41.32 5.404c-1.584 0-2.604.744-3.172 1.26l-.212-.996h-3.54v19.06l4.024-.856.008-4.628c.584.424 1.444 1.024 2.868 1.024 2.9 0 5.54-2.332 5.54-7.468-.016-4.696-2.692-7.396-5.516-7.396zm-.972 11.372c-.956 0-1.52-.34-1.912-.76l-.016-6.004c.424-.468.996-.792 1.928-.792 1.476 0 2.496 1.656 2.496 3.772 0 2.164-1.004 3.784-2.496 3.784zM28.144 4.24l4.04-.868V0l-4.04.856v3.384zM28.144 5.66h4.04v14.048h-4.04V5.66zM23.78 6.9l-.252-1.24h-3.48v14.048h4.024V10.06c.952-1.24 2.56-1.012 3.064-.836V5.66c-.52-.192-2.42-.548-3.356 1.24zM15.884 1.74l-3.928.836-.016 12.864c0 2.376 1.784 4.128 4.16 4.128 1.316 0 2.28-.244 2.812-.532v-3.268c-.516.208-3.06.948-3.06-1.428V8.932h3.06V5.66h-3.06l.032-3.92zM4.04 10.284c0-.632.52-.872 1.38-.872 1.236 0 2.796.372 4.032 1.04V6.596c-1.348-.54-2.68-.752-4.032-.752C2.168 5.844 0 7.532 0 10.476c0 4.56 6.276 3.832 6.276 5.8 0 .748-.652 1.004-1.564 1.004-1.356 0-3.088-.556-4.46-1.308v3.912c1.52.656 3.06.936 4.46.936 3.324 0 5.608-1.64 5.608-4.632-.016-4.924-6.32-4.052-6.32-5.904h.04z" fill="white"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#072654] flex items-center justify-center p-1.5">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                          <path d="M22.436 0H14.06l-2.5 6.5h6.49L9.472 24h2.972l9.992-24z" fill="#3395FF"/>
                          <path d="M14.06 0H5.62L0 14.5h6.5L1.563 24h2.973L14.06 0z" fill="white"/>
                        </svg>
                      </div>
                    )}
                    Configure {editingGateway === 'STRIPE' ? 'Stripe' : 'Razorpay'}
                  </h3>
                  <button
                    onClick={() => setEditingGateway(null)}
                    className="p-2 hover:bg-[#F8F8F6] rounded-lg transition-colors"
                  >
                    <X size={18} className="text-[#666]" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                      {editingGateway === 'STRIPE' ? 'Publishable Key' : 'Key ID'}
                    </label>
                    <input
                      type="text"
                      value={gatewayForm.publicKey}
                      onChange={(e) => setGatewayForm(f => ({ ...f, publicKey: e.target.value }))}
                      placeholder={editingGateway === 'STRIPE' ? 'pk_test_...' : 'rzp_test_...'}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                      {editingGateway === 'STRIPE' ? 'Secret Key' : 'Key Secret'}
                      {(() => {
                        const config = gatewayConfigs?.find(c => c.provider === editingGateway);
                        return config?.hasSecretKey ? (
                          <span className="text-[#666] font-normal ml-1">(already set)</span>
                        ) : null;
                      })()}
                    </label>
                    <input
                      type="password"
                      value={gatewayForm.secretKey}
                      onChange={(e) => setGatewayForm(f => ({ ...f, secretKey: e.target.value }))}
                      placeholder={(() => {
                        const config = gatewayConfigs?.find(c => c.provider === editingGateway);
                        if (config?.hasSecretKey) return '••••••••';
                        return editingGateway === 'STRIPE' ? 'sk_test_...' : 'Enter key secret';
                      })()}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                      Webhook Secret
                      {(() => {
                        const config = gatewayConfigs?.find(c => c.provider === editingGateway);
                        return config?.hasWebhookSecret ? (
                          <span className="text-[#666] font-normal ml-1">(already set)</span>
                        ) : null;
                      })()}
                    </label>
                    <input
                      type="password"
                      value={gatewayForm.webhookSecret}
                      onChange={(e) => setGatewayForm(f => ({ ...f, webhookSecret: e.target.value }))}
                      placeholder={(() => {
                        const config = gatewayConfigs?.find(c => c.provider === editingGateway);
                        if (config?.hasWebhookSecret) return '••••••••';
                        return editingGateway === 'STRIPE' ? 'whsec_...' : 'Enter webhook secret';
                      })()}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gatewayForm.testMode}
                        onChange={(e) => setGatewayForm(f => ({ ...f, testMode: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                      />
                      <span className="text-sm text-[#666]">Test Mode</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gatewayForm.isActive}
                        onChange={(e) => setGatewayForm(f => ({ ...f, isActive: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                      />
                      <span className="text-sm text-[#666]">Enable Gateway</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 border-t border-[#F2F1EA] bg-[#FAFAF8]">
                  <button
                    onClick={async () => {
                      if (!editingGateway) return;
                      const result = await testGatewayConnection(editingGateway);
                      alert(result.message);
                    }}
                    disabled={testingGateway === editingGateway}
                    className="px-4 py-2 bg-[#F8F8F6] text-[#666] rounded-lg text-sm font-medium hover:bg-[#F2F1EA] transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {testingGateway === editingGateway ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Test Connection
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingGateway(null)}
                      className="px-4 py-2 text-[#666] text-sm font-medium hover:text-[#1A1A1A] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!editingGateway) return;
                        try {
                          await updateGatewayConfig(editingGateway, {
                            publicKey: gatewayForm.publicKey || undefined,
                            secretKey: gatewayForm.secretKey || undefined,
                            webhookSecret: gatewayForm.webhookSecret || undefined,
                            testMode: gatewayForm.testMode,
                            isActive: gatewayForm.isActive,
                          });
                          setEditingGateway(null);
                          refetchGateways();
                        } catch (err) {
                          alert('Failed to save configuration');
                        }
                      }}
                      className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OAuth Configuration Modal */}
          {showOAuthModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-[#F2F1EA]">
                  <h3 className="font-bold text-[#1A1A1A] flex items-center gap-3">
                    {showOAuthModal === 'google' ? (
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M23.52 12.29C23.52 11.43 23.44 10.64 23.3 9.87H12V14.51H18.46C18.18 15.99 17.34 17.25 16.08 18.1V21.09H19.95C22.21 19 23.52 15.92 23.52 12.29Z" fill="#4285F4"/>
                          <path d="M12 24C15.24 24 17.96 22.92 19.95 21.09L16.08 18.1C15 18.82 13.62 19.25 12 19.25C8.87 19.25 6.22 17.14 5.27 14.29H1.27V17.38C3.25 21.32 7.31 24 12 24Z" fill="#34A853"/>
                          <path d="M5.27 14.29C5.03 13.57 4.9 12.8 4.9 12C4.9 11.2 5.03 10.43 5.27 9.71V6.62H1.27C0.46 8.23 0 10.06 0 12C0 13.94 0.46 15.77 1.27 17.38L5.27 14.29Z" fill="#FBBC05"/>
                          <path d="M12 4.75C13.76 4.75 15.34 5.36 16.58 6.55L20.03 3.1C17.96 1.16 15.24 0 12 0C7.31 0 3.25 2.68 1.27 6.62L5.27 9.71C6.22 6.86 8.87 4.75 12 4.75Z" fill="#EA4335"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#000] flex items-center justify-center">
                        <svg width="16" height="20" viewBox="0 0 18 22" fill="white">
                          <path d="M17.0703 7.29C16.9203 7.39 14.5203 8.7 14.5203 11.71C14.5203 15.23 17.6203 16.43 17.7003 16.46C17.6903 16.53 17.2203 18.23 16.0603 19.98C15.0403 21.51 13.9803 23.03 12.3603 23.03C10.7403 23.03 10.2603 22.07 8.39025 22.07C6.56025 22.07 5.84025 23.06 4.35025 23.06C2.86025 23.06 1.83025 21.63 0.650254 19.91C-0.719746 17.88 -0.749746 15.56 0.550254 14.31C1.46025 13.44 2.69025 12.96 3.87025 12.96C5.40025 12.96 6.21025 13.95 7.82025 13.95C9.39025 13.95 9.99025 12.96 11.7303 12.96C12.7703 12.96 13.8803 13.33 14.7603 14.08C12.4903 15.41 12.8603 18.67 15.3303 19.53C14.6103 20.9 13.6603 22.21 12.3603 22.21C11.0803 22.21 10.5403 21.42 8.89025 21.42C7.20025 21.42 6.40025 22.24 5.25025 22.24C3.97025 22.24 2.95025 20.99 2.04025 19.49C0.850254 17.54 0.710254 15.3 1.61025 14.14C2.23025 13.32 3.19025 12.85 4.20025 12.85C5.58025 12.85 6.39025 13.67 7.82025 13.67C9.29025 13.67 9.92025 12.85 11.5703 12.85C12.5803 12.85 13.5703 13.2 14.3803 13.82C15.6303 12.31 16.3503 10.48 16.3803 8.59C14.2803 7.85 17.0703 7.29 17.0703 7.29ZM12.5103 4.62C13.2303 3.72 13.7503 2.48 13.5903 1.22C12.4803 1.28 11.1703 1.97 10.3603 2.89C9.63025 3.71 9.05025 4.96 9.24025 6.17C10.4503 6.21 11.7503 5.54 12.5103 4.62Z"/>
                        </svg>
                      </div>
                    )}
                    Configure {showOAuthModal === 'google' ? 'Google' : 'Apple'} Sign-In
                  </h3>
                  <button
                    onClick={() => setShowOAuthModal(null)}
                    className="p-2 hover:bg-[#F8F8F6] rounded-lg transition-colors"
                  >
                    <X size={18} className="text-[#666]" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {showOAuthModal === 'google' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={oauthFormData.clientId}
                          onChange={(e) => setOauthFormData(f => ({ ...f, clientId: e.target.value }))}
                          placeholder="xxxxx.apps.googleusercontent.com"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-[#999]">From Google Cloud Console → Credentials</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                          Client Secret
                          {oauthConfig.googleClientSecret && (
                            <span className="text-[#666] font-normal ml-1">(already set)</span>
                          )}
                        </label>
                        <input
                          type="password"
                          value={oauthFormData.clientSecret}
                          onChange={(e) => setOauthFormData(f => ({ ...f, clientSecret: e.target.value }))}
                          placeholder={oauthConfig.googleClientSecret ? '••••••••' : 'GOCSPX-...'}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                          Services ID (Client ID)
                        </label>
                        <input
                          type="text"
                          value={oauthFormData.clientId}
                          onChange={(e) => setOauthFormData(f => ({ ...f, clientId: e.target.value }))}
                          placeholder="com.example.signin"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-[#999]">From Apple Developer → Identifiers → Services IDs</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                          Team ID
                        </label>
                        <input
                          type="text"
                          value={oauthFormData.teamId}
                          onChange={(e) => setOauthFormData(f => ({ ...f, teamId: e.target.value }))}
                          placeholder="XXXXXXXXXX"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-[#999]">From Apple Developer → Membership</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                          Key ID
                        </label>
                        <input
                          type="text"
                          value={oauthFormData.keyId}
                          onChange={(e) => setOauthFormData(f => ({ ...f, keyId: e.target.value }))}
                          placeholder="XXXXXXXXXX"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-[#999]">From Apple Developer → Keys</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                          Private Key (.p8)
                          {oauthConfig.applePrivateKey && (
                            <span className="text-[#666] font-normal ml-1">(already set)</span>
                          )}
                        </label>
                        <textarea
                          value={oauthFormData.privateKey}
                          onChange={(e) => setOauthFormData(f => ({ ...f, privateKey: e.target.value }))}
                          placeholder={oauthConfig.applePrivateKey ? '••••••••' : '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#F2F1EA] focus:border-[#EAD07D] outline-none text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-[#999]">Paste the entire contents of your .p8 file</p>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={oauthFormData.enabled}
                        onChange={(e) => setOauthFormData(f => ({ ...f, enabled: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                      />
                      <span className="text-sm text-[#666]">Enable {showOAuthModal === 'google' ? 'Google' : 'Apple'} Sign-In</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-6 border-t border-[#F2F1EA] bg-[#FAFAF8]">
                  <button
                    onClick={() => setShowOAuthModal(null)}
                    className="px-4 py-2 text-[#666] text-sm font-medium hover:text-[#1A1A1A] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveOAuthConfig(showOAuthModal)}
                    disabled={oauthSaving}
                    className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {oauthSaving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-[#1A1A1A]">Audit Logs</h3>
                <p className="text-sm text-[#666]">Track all administrative actions</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowAuditFilterMenu(!showAuditFilterMenu)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                      auditActionFilter !== 'all' ? 'bg-[#EAD07D] text-[#1A1A1A]' : 'bg-[#F8F8F6] hover:bg-[#F2F1EA]'
                    }`}
                  >
                    <Filter size={14} />
                    Filter
                  </button>
                  {showAuditFilterMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAuditFilterMenu(false)} />
                      <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        {['all', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'].map(action => (
                          <button
                            key={action}
                            onClick={() => { setAuditActionFilter(action); setShowAuditFilterMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm ${auditActionFilter === action ? 'bg-[#EAD07D]/20 font-medium' : 'hover:bg-[#F8F8F6]'}`}
                          >
                            {action === 'all' ? 'All Actions' : action}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleExportAuditLogs}
                  className="px-4 py-2 rounded-xl bg-[#F8F8F6] text-sm font-medium hover:bg-[#F2F1EA] transition-colors flex items-center gap-2"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>

            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (filteredLogs || []).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-[#999]" />
                </div>
                <p className="text-[#666]">No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(filteredLogs || []).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F2F1EA] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mt-0.5">
                        <Clock size={16} className="text-[#666]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{log.action}</p>
                        <p className="text-xs text-[#666] mt-0.5">
                          {log.user?.name || log.user?.email || 'System'}
                          {log.entityType && ` • ${log.entityType}`}
                          {log.entityId && ` #${log.entityId.slice(0, 8)}`}
                        </p>
                        {log.ipAddress && (
                          <p className="text-xs text-[#999] mt-1">IP: {log.ipAddress}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#999]">{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-[#999]">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Create/Edit Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCreatePlanModal(false); setEditingPlan(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 pb-0 shrink-0">
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h3>
              <button onClick={() => { setShowCreatePlanModal(false); setEditingPlan(null); }} className="p-2 rounded-lg hover:bg-[#F8F8F6]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name & Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Plan Name *</label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Professional"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Slug *</label>
                  <input
                    type="text"
                    value={planForm.slug}
                    onChange={(e) => setPlanForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    placeholder="e.g., professional"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Description</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this plan"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm resize-none"
                />
              </div>

              {/* Tier */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Tier *</label>
                <select
                  value={planForm.tier}
                  onChange={(e) => setPlanForm(f => ({ ...f, tier: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                >
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Monthly (cents)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm(f => ({ ...f, priceMonthly: parseInt(e.target.value) || 0 }))}
                    placeholder="2900"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                  <p className="text-xs text-[#999] mt-1">${(planForm.priceMonthly / 100).toFixed(2)}/mo</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Yearly (cents)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.priceYearly}
                    onChange={(e) => setPlanForm(f => ({ ...f, priceYearly: parseInt(e.target.value) || 0 }))}
                    placeholder="29000"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                  <p className="text-xs text-[#999] mt-1">${(planForm.priceYearly / 100).toFixed(2)}/yr</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Currency</label>
                  <select
                    value={planForm.currency}
                    onChange={(e) => setPlanForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Max Users</label>
                  <input
                    type="number"
                    min="-1"
                    value={planForm.maxUsers}
                    onChange={(e) => setPlanForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                  <p className="text-xs text-[#999] mt-1">-1 for unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Max AI Conversations</label>
                  <input
                    type="number"
                    min="-1"
                    value={planForm.maxConversations}
                    onChange={(e) => setPlanForm(f => ({ ...f, maxConversations: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                  <p className="text-xs text-[#999] mt-1">-1 for unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Max Leads</label>
                  <input
                    type="number"
                    min="-1"
                    value={planForm.maxLeads}
                    onChange={(e) => setPlanForm(f => ({ ...f, maxLeads: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Max Documents</label>
                  <input
                    type="number"
                    min="-1"
                    value={planForm.maxDocuments}
                    onChange={(e) => setPlanForm(f => ({ ...f, maxDocuments: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#666]">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isPublic}
                    onChange={(e) => setPlanForm(f => ({ ...f, isPublic: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#666]">Public (show on pricing page)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreatePlanModal(false); setEditingPlan(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2F1EA] text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!planForm.name || !planForm.slug) {
                    alert('Please fill in name and slug');
                    return;
                  }
                  try {
                    setFormSubmitting(true);
                    if (editingPlan) {
                      await updateType(editingPlan.id, planForm);
                    } else {
                      await createType(planForm);
                    }
                    setShowCreatePlanModal(false);
                    setEditingPlan(null);
                    setPlanForm({
                      name: '', slug: '', description: '', tier: 'STARTER',
                      priceMonthly: 0, priceYearly: 0, currency: 'USD',
                      maxUsers: 5, maxConversations: 1000, maxLeads: 500, maxDocuments: 100,
                      isActive: true, isPublic: true,
                    });
                  } catch (err) {
                    alert('Failed to save plan');
                  } finally {
                    setFormSubmitting(false);
                  }
                }}
                disabled={formSubmitting || !planForm.name || !planForm.slug}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formSubmitting && <Loader2 size={14} className="animate-spin" />}
                {editingPlan ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign License Modal */}
      {showAssignLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAssignLicenseModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Assign License</h3>
              <button onClick={() => setShowAssignLicenseModal(false)} className="p-2 rounded-lg hover:bg-[#F8F8F6]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">User (select from list) *</label>
                <select
                  value={assignLicenseForm.userEmail}
                  onChange={(e) => setAssignLicenseForm(f => ({ ...f, userEmail: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                >
                  <option value="">Select a user...</option>
                  {(users || []).map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">License Type *</label>
                <select
                  value={assignLicenseForm.licenseTypeId}
                  onChange={(e) => setAssignLicenseForm(f => ({ ...f, licenseTypeId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                >
                  <option value="">Select a plan...</option>
                  {(licenseTypes || []).map((type) => (
                    <option key={type.id} value={type.id}>{type.name} ({type.tier})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  value={assignLicenseForm.durationDays}
                  onChange={(e) => setAssignLicenseForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 365 }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignLicenseForm.isTrial}
                    onChange={(e) => setAssignLicenseForm(f => ({ ...f, isTrial: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#666]">Trial License</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignLicenseModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2F1EA] text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!assignLicenseForm.userEmail || !assignLicenseForm.licenseTypeId) {
                    alert('Please select a user and license type');
                    return;
                  }
                  try {
                    setFormSubmitting(true);
                    const startDate = new Date().toISOString();
                    const endDate = new Date(Date.now() + assignLicenseForm.durationDays * 24 * 60 * 60 * 1000).toISOString();
                    await assignLicense({
                      userId: assignLicenseForm.userEmail,
                      licenseTypeId: assignLicenseForm.licenseTypeId,
                      startDate,
                      endDate,
                      isTrial: assignLicenseForm.isTrial,
                      autoRenew: !assignLicenseForm.isTrial,
                    });
                    setShowAssignLicenseModal(false);
                    setAssignLicenseForm({ userEmail: '', licenseTypeId: '', isTrial: false, durationDays: 365 });
                    refetchLicenses();
                  } catch (err) {
                    alert('Failed to assign license');
                  } finally {
                    setFormSubmitting(false);
                  }
                }}
                disabled={formSubmitting || !assignLicenseForm.userEmail || !assignLicenseForm.licenseTypeId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formSubmitting && <Loader2 size={14} className="animate-spin" />}
                Assign License
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Keys Modal */}
      {showGenerateKeysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGenerateKeysModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Generate License Keys</h3>
              <button onClick={() => setShowGenerateKeysModal(false)} className="p-2 rounded-lg hover:bg-[#F8F8F6]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">License Type *</label>
                <select
                  value={generateKeysForm.licenseTypeId}
                  onChange={(e) => setGenerateKeysForm(f => ({ ...f, licenseTypeId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                >
                  <option value="">Select a plan...</option>
                  {(licenseTypes || []).map((type) => (
                    <option key={type.id} value={type.id}>{type.name} ({type.tier})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Number of Keys *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={generateKeysForm.count}
                    onChange={(e) => setGenerateKeysForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Duration (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={generateKeysForm.durationDays}
                    onChange={(e) => setGenerateKeysForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 365 }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateKeysForm.isTrial}
                    onChange={(e) => setGenerateKeysForm(f => ({ ...f, isTrial: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#666]">Trial Keys</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={generateKeysForm.notes}
                  onChange={(e) => setGenerateKeysForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g., For marketing campaign"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGenerateKeysModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2F1EA] text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!generateKeysForm.licenseTypeId) {
                    alert('Please select a license type');
                    return;
                  }
                  try {
                    setFormSubmitting(true);
                    await generateKeys({
                      licenseTypeId: generateKeysForm.licenseTypeId,
                      count: generateKeysForm.count,
                      durationDays: generateKeysForm.durationDays,
                      isTrial: generateKeysForm.isTrial,
                      notes: generateKeysForm.notes || undefined,
                    });
                    setShowGenerateKeysModal(false);
                    setGenerateKeysForm({ licenseTypeId: '', count: 5, durationDays: 365, isTrial: false, notes: '' });
                    refetchKeys();
                  } catch (err) {
                    alert('Failed to generate keys');
                  } finally {
                    setFormSubmitting(false);
                  }
                }}
                disabled={formSubmitting || !generateKeysForm.licenseTypeId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formSubmitting && <Loader2 size={14} className="animate-spin" />}
                Generate {generateKeysForm.count} Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Coupon Modal */}
      {showCreateCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateCouponModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#F2F1EA] shrink-0">
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              <button onClick={() => setShowCreateCouponModal(false)} className="p-2 rounded-lg hover:bg-[#F8F8F6]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SAVE20"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm font-mono"
                  disabled={!!editingCoupon}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Display Name</label>
                <input
                  type="text"
                  value={couponForm.name}
                  onChange={(e) => setCouponForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., 20% Off First Month"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Description</label>
                <textarea
                  value={couponForm.description}
                  onChange={(e) => setCouponForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Internal description..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm resize-none"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Discount Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm(f => ({ ...f, discountType: e.target.value as DiscountType }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                    {couponForm.discountType === 'PERCENTAGE' ? 'Percentage' : 'Amount (cents)'}
                  </label>
                  <input
                    type="number"
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm(f => ({ ...f, discountValue: parseInt(e.target.value) || 0 }))}
                    min={0}
                    max={couponForm.discountType === 'PERCENTAGE' ? 100 : undefined}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Duration</label>
                  <select
                    value={couponForm.duration}
                    onChange={(e) => setCouponForm(f => ({ ...f, duration: e.target.value as CouponDuration }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
                  >
                    <option value="ONCE">One-time</option>
                    <option value="FOREVER">Forever</option>
                    <option value="REPEATING">Repeating (months)</option>
                  </select>
                </div>
                {couponForm.duration === 'REPEATING' && (
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Months</label>
                    <input
                      type="number"
                      value={couponForm.durationMonths}
                      onChange={(e) => setCouponForm(f => ({ ...f, durationMonths: parseInt(e.target.value) || 1 }))}
                      min={1}
                      max={36}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    value={couponForm.maxRedemptions || ''}
                    onChange={(e) => setCouponForm(f => ({
                      ...f,
                      maxRedemptions: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                    placeholder="Unlimited"
                    min={1}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Expires On</label>
                  <input
                    type="date"
                    value={couponForm.expiresAt}
                    onChange={(e) => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Sync to Stripe */}
              {!editingCoupon && (
                <div className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl">
                  <input
                    type="checkbox"
                    id="syncToStripe"
                    checked={couponForm.syncToStripe}
                    onChange={(e) => setCouponForm(f => ({ ...f, syncToStripe: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <label htmlFor="syncToStripe" className="text-sm text-[#666]">
                    Sync this coupon to Stripe for online payments
                  </label>
                </div>
              )}
            </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-[#F2F1EA] shrink-0">
              <button
                onClick={() => setShowCreateCouponModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2F1EA] text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!couponForm.code) {
                    alert('Please enter a coupon code');
                    return;
                  }
                  try {
                    if (editingCoupon) {
                      await updateCoupon(editingCoupon.id, {
                        name: couponForm.name || undefined,
                        description: couponForm.description || undefined,
                        maxRedemptions: couponForm.maxRedemptions,
                        expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : undefined,
                      });
                    } else {
                      await createCoupon({
                        code: couponForm.code,
                        name: couponForm.name || undefined,
                        description: couponForm.description || undefined,
                        discountType: couponForm.discountType,
                        discountValue: couponForm.discountValue,
                        duration: couponForm.duration,
                        durationMonths: couponForm.duration === 'REPEATING' ? couponForm.durationMonths : undefined,
                        maxRedemptions: couponForm.maxRedemptions,
                        expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : undefined,
                        syncToStripe: couponForm.syncToStripe,
                      });
                    }
                    setShowCreateCouponModal(false);
                    refetchCoupons();
                  } catch (err) {
                    alert('Failed to save coupon. Please try again.');
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors"
              >
                {editingCoupon ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, itemId: null, itemName: '' })}
        onConfirm={async () => {
          if (!confirmModal.itemId) return;
          setConfirmLoading(true);
          try {
            if (confirmModal.type === 'deletePlan') {
              await deleteType(confirmModal.itemId);
            } else if (confirmModal.type === 'deleteCoupon') {
              await deleteCoupon(confirmModal.itemId);
            } else if (confirmModal.type === 'refundPayment') {
              await refundPayment(confirmModal.itemId);
            }
          } catch (err) {
            console.error('Failed to complete action:', err);
          } finally {
            setConfirmLoading(false);
            setConfirmModal({ isOpen: false, type: null, itemId: null, itemName: '' });
          }
        }}
        title={
          confirmModal.type === 'deletePlan' ? 'Delete Plan' :
          confirmModal.type === 'deleteCoupon' ? 'Delete Coupon' :
          'Refund Payment'
        }
        message={
          confirmModal.type === 'deletePlan' ? `Are you sure you want to delete "${confirmModal.itemName}"? This cannot be undone.` :
          confirmModal.type === 'deleteCoupon' ? `Are you sure you want to delete coupon "${confirmModal.itemName}"?` :
          `Are you sure you want to refund this ${confirmModal.itemName}?`
        }
        confirmLabel={
          confirmModal.type === 'refundPayment' ? 'Refund' : 'Delete'
        }
        variant={confirmModal.type === 'refundPayment' ? 'warning' : 'danger'}
        loading={confirmLoading}
      />
    </div>
  );
};
