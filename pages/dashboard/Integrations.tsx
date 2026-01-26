import React, { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  Clock,
  Zap,
  Mail,
  Calendar,
  MessageSquare,
  CreditCard,
  FileText,
  Database,
  Globe,
  Shield,
  ArrowRight,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import {
  emailIntegrationsApi,
  calendarIntegrationsApi,
  EmailConnection,
  CalendarConnection,
  EmailProvider,
  CalendarProvider,
  ConnectionStatus,
} from '../../src/api/integrations';

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: 'email' | 'calendar' | 'communication' | 'payment' | 'storage' | 'analytics' | 'security';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  dataPoints?: number;
  popular: boolean;
  provider?: EmailProvider | CalendarProvider;
  connectionId?: string;
  configured?: boolean;
}

// Static integrations that aren't yet implemented
const STATIC_INTEGRATIONS: Integration[] = [
  { id: 'slack', name: 'Slack', description: 'Get deal alerts, team notifications, and AI summaries in Slack.', logo: '💬', category: 'communication', status: 'disconnected', popular: true },
  { id: 'stripe', name: 'Stripe', description: 'Sync payments, invoices, and revenue data automatically.', logo: '💳', category: 'payment', status: 'disconnected', popular: true },
  { id: 'hubspot', name: 'HubSpot', description: 'Two-way sync contacts, deals, and marketing data.', logo: '🔶', category: 'analytics', status: 'disconnected', popular: true },
  { id: 'salesforce', name: 'Salesforce', description: 'Import existing CRM data and sync bidirectionally.', logo: '☁️', category: 'analytics', status: 'disconnected', popular: true },
  { id: 'zoom', name: 'Zoom', description: 'Auto-log meetings, record calls, and generate AI transcripts.', logo: '📹', category: 'communication', status: 'disconnected', popular: true },
  { id: 'docusign', name: 'DocuSign', description: 'Send contracts and track e-signatures from within deals.', logo: '✍️', category: 'storage', status: 'disconnected', popular: false },
  { id: 'dropbox', name: 'Dropbox', description: 'Attach and share files directly from Dropbox.', logo: '📦', category: 'storage', status: 'disconnected', popular: false },
  { id: 'linkedin', name: 'LinkedIn Sales Nav', description: 'Enrich contacts and track prospect activity.', logo: '💼', category: 'analytics', status: 'disconnected', popular: true },
  { id: 'zapier', name: 'Zapier', description: 'Connect 5000+ apps with custom automations.', logo: '⚡', category: 'analytics', status: 'disconnected', popular: true },
  { id: 'intercom', name: 'Intercom', description: 'Sync customer conversations and support tickets.', logo: '💭', category: 'communication', status: 'disconnected', popular: false },
  { id: 'okta', name: 'Okta SSO', description: 'Enterprise single sign-on and user provisioning.', logo: '🔐', category: 'security', status: 'disconnected', popular: false },
  { id: 'quickbooks', name: 'QuickBooks', description: 'Sync invoices, payments, and financial data.', logo: '📊', category: 'payment', status: 'disconnected', popular: false },
  { id: 'segment', name: 'Segment', description: 'Customer data platform integration.', logo: '🎯', category: 'analytics', status: 'disconnected', popular: false },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'storage', label: 'Storage', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
];

function formatLastSync(date: string | null): string {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function mapConnectionStatus(status: ConnectionStatus): 'connected' | 'disconnected' | 'error' {
  switch (status) {
    case ConnectionStatus.ACTIVE:
      return 'connected';
    case ConnectionStatus.ERROR:
    case ConnectionStatus.EXPIRED:
      return 'error';
    default:
      return 'disconnected';
  }
}

export const IntegrationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'disconnected'>('all');

  // Real data from API
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [availableEmailIntegrations, setAvailableEmailIntegrations] = useState<Integration[]>([]);
  const [availableCalendarIntegrations, setAvailableCalendarIntegrations] = useState<Integration[]>([]);

  // Action states
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Confirmation modal state
  const [disconnectModal, setDisconnectModal] = useState<{
    isOpen: boolean;
    integration: Integration | null;
  }>({ isOpen: false, integration: null });

  // Handle OAuth redirect result
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const provider = searchParams.get('provider');
    const email = searchParams.get('email');

    if (success === 'true' && provider) {
      setNotification({
        type: 'success',
        message: `Successfully connected ${provider}${email ? ` (${email})` : ''}`,
      });
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/integrations');
      // Refresh data
      loadData();
    } else if (error) {
      setNotification({
        type: 'error',
        message: `Connection failed: ${error}`,
      });
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, [searchParams]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [emailConns, calendarConns, emailAvailable, calendarAvailable] = await Promise.all([
        emailIntegrationsApi.getConnections().catch(() => ({ connections: [] })),
        calendarIntegrationsApi.getConnections().catch(() => ({ connections: [] })),
        emailIntegrationsApi.getAvailable().catch(() => ({ integrations: [] })),
        calendarIntegrationsApi.getAvailable().catch(() => ({ integrations: [] })),
      ]);

      setEmailConnections(emailConns.connections || []);
      setCalendarConnections(calendarConns.connections || []);

      // Map available email integrations
      const emailIntegrations: Integration[] = (emailAvailable.integrations || []).map(int => ({
        id: `email-${int.provider.toLowerCase()}`,
        name: int.name,
        description: int.description,
        logo: int.provider === 'GMAIL' ? '📧' : '📬',
        category: 'email' as const,
        status: 'disconnected' as const,
        popular: true,
        provider: int.provider as EmailProvider,
        configured: int.configured,
      }));

      // Map available calendar integrations
      const calendarIntegrations: Integration[] = (calendarAvailable.integrations || []).map(int => ({
        id: `calendar-${int.provider.toLowerCase()}`,
        name: int.name,
        description: int.description,
        logo: int.provider === 'GOOGLE' ? '📅' : '📆',
        category: 'calendar' as const,
        status: 'disconnected' as const,
        popular: true,
        provider: int.provider as CalendarProvider,
        configured: int.configured,
      }));

      setAvailableEmailIntegrations(emailIntegrations);
      setAvailableCalendarIntegrations(calendarIntegrations);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build integrations list with connected status
  const integrations: Integration[] = [
    // Connected email integrations
    ...emailConnections.map(conn => ({
      id: `email-conn-${conn.id}`,
      name: conn.provider === EmailProvider.GMAIL ? 'Gmail' : 'Microsoft Outlook',
      description: conn.email,
      logo: conn.provider === EmailProvider.GMAIL ? '📧' : '📬',
      category: 'email' as const,
      status: mapConnectionStatus(conn.status),
      lastSync: formatLastSync(conn.lastSyncAt),
      dataPoints: conn.emailsSynced,
      popular: true,
      provider: conn.provider,
      connectionId: conn.id,
    })),
    // Connected calendar integrations
    ...calendarConnections.map(conn => ({
      id: `calendar-conn-${conn.id}`,
      name: conn.provider === CalendarProvider.GOOGLE ? 'Google Calendar' : 'Outlook Calendar',
      description: conn.email,
      logo: conn.provider === CalendarProvider.GOOGLE ? '📅' : '📆',
      category: 'calendar' as const,
      status: mapConnectionStatus(conn.status),
      lastSync: formatLastSync(conn.lastSyncAt),
      dataPoints: conn.eventsSynced,
      popular: true,
      provider: conn.provider,
      connectionId: conn.id,
    })),
    // Available (disconnected) email integrations
    ...availableEmailIntegrations.filter(int =>
      !emailConnections.some(conn => conn.provider === int.provider)
    ),
    // Available (disconnected) calendar integrations
    ...availableCalendarIntegrations.filter(int =>
      !calendarConnections.some(conn => conn.provider === int.provider)
    ),
    // Static integrations
    ...STATIC_INTEGRATIONS,
  ];

  const filteredIntegrations = integrations.filter(int => {
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          int.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || int.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'connected' && int.status === 'connected') ||
      (statusFilter === 'disconnected' && (int.status === 'disconnected' || int.status === 'error'));
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const totalDataPoints = integrations.reduce((sum, i) => sum + (i.dataPoints || 0), 0);

  const handleConnect = async (integration: Integration) => {
    if (!integration.provider || !integration.configured) {
      setNotification({
        type: 'error',
        message: integration.configured === false
          ? `${integration.name} is not configured. Please configure OAuth credentials in the backend.`
          : 'This integration is not yet available.',
      });
      return;
    }

    setConnecting(integration.id);
    try {
      let result;
      if (integration.category === 'email') {
        result = await emailIntegrationsApi.initiateOAuth(integration.provider as EmailProvider);
      } else if (integration.category === 'calendar') {
        result = await calendarIntegrationsApi.initiateOAuth(integration.provider as CalendarProvider);
      }

      if (result?.authUrl) {
        // Redirect to OAuth provider
        window.location.href = result.authUrl;
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to initiate connection',
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleSync = async (integration: Integration) => {
    if (!integration.connectionId) return;

    setSyncing(integration.id);
    try {
      if (integration.category === 'email') {
        await emailIntegrationsApi.triggerSync(integration.connectionId);
      } else if (integration.category === 'calendar') {
        await calendarIntegrationsApi.triggerSync(integration.connectionId);
      }
      setNotification({ type: 'success', message: 'Sync triggered successfully' });
      loadData();
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to trigger sync',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = (integration: Integration) => {
    if (!integration.connectionId) return;
    setDisconnectModal({ isOpen: true, integration });
  };

  const confirmDisconnect = async () => {
    const integration = disconnectModal.integration;
    if (!integration?.connectionId) return;

    setDisconnecting(integration.id);
    setDisconnectModal({ isOpen: false, integration: null });

    try {
      if (integration.category === 'email') {
        await emailIntegrationsApi.deleteConnection(integration.connectionId);
      } else if (integration.category === 'calendar') {
        await calendarIntegrationsApi.deleteConnection(integration.connectionId);
      }
      setNotification({ type: 'success', message: `${integration.name} disconnected successfully` });
      loadData();
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to disconnect',
      });
    } finally {
      setDisconnecting(null);
    }
  };

  // Show page immediately with static integrations, load dynamic data in background
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 ${
          notification.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-green-600" />
          ) : (
            <AlertCircle size={18} className="text-red-600" />
          )}
          <span className="font-medium text-sm">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D]">
              <Plug size={20} />
            </div>
            <h1 className="text-3xl font-medium text-[#1A1A1A]">Integrations</h1>
          </div>
          <p className="text-[#666]">Connect your tools and supercharge your workflow</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg">
          <Plus size={18} />
          Request Integration
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            {isLoading ? (
              <Skeleton className="h-7 w-8 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-[#1A1A1A]">{connectedCount}</div>
            )}
            <div className="text-xs text-[#666]">Connected</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <Zap size={18} className="text-[#EAD07D]" />
          </div>
          <div>
            {isLoading ? (
              <Skeleton className="h-7 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-[#1A1A1A]">{totalDataPoints > 1000 ? `${(totalDataPoints / 1000).toFixed(1)}K` : totalDataPoints}</div>
            )}
            <div className="text-xs text-[#666]">Data Points Synced</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <RefreshCw size={18} className="text-[#666]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">Real-time</div>
            <div className="text-xs text-[#666]">Sync Status</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D] flex items-center justify-center">
            <Globe size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{integrations.length}</div>
            <div className="text-xs text-[#666]">Available</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
          {CATEGORIES.slice(0, 5).map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                categoryFilter === cat.id
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
              }`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'connected', 'disconnected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                statusFilter === status
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Connected Integrations */}
      {statusFilter !== 'disconnected' && isLoading && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#999] uppercase tracking-wider mb-4">Connected</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        </div>
      )}
      {statusFilter !== 'disconnected' && !isLoading && filteredIntegrations.filter(i => i.status === 'connected').length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#999] uppercase tracking-wider mb-4">Connected</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIntegrations.filter(i => i.status === 'connected').map((integration, index) => (
              <Card
                key={integration.id}
                className="p-5 hover:shadow-lg transition-all duration-300 border-[#EAD07D]/30 bg-[#EAD07D]/5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
                    {integration.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#1A1A1A]">{integration.name}</h3>
                      <Badge variant="green" size="sm" dot>Connected</Badge>
                    </div>
                    <p className="text-sm text-[#666] mb-3 line-clamp-1">{integration.description}</p>
                    <div className="flex items-center gap-4 text-xs text-[#999]">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        Last sync: {integration.lastSync}
                      </div>
                      {integration.dataPoints !== undefined && (
                        <div className="flex items-center gap-1">
                          <Database size={12} />
                          {integration.dataPoints.toLocaleString()} records
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(integration)}
                      disabled={syncing === integration.id}
                      className="p-2 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                      title="Sync now"
                    >
                      {syncing === integration.id ? (
                        <Loader2 size={16} className="text-[#666] animate-spin" />
                      ) : (
                        <RefreshCw size={16} className="text-[#666]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration)}
                      disabled={disconnecting === integration.id}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Disconnect"
                    >
                      {disconnecting === integration.id ? (
                        <Loader2 size={16} className="text-red-500 animate-spin" />
                      ) : (
                        <Trash2 size={16} className="text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error Integrations */}
      {filteredIntegrations.filter(i => i.status === 'error').length > 0 && statusFilter !== 'connected' && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#999] uppercase tracking-wider mb-4">Needs Attention</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIntegrations.filter(i => i.status === 'error').map((integration) => (
              <Card
                key={integration.id}
                className="p-5 border-amber-200 bg-amber-50/30"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
                    {integration.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#1A1A1A]">{integration.name}</h3>
                      <Badge variant="neutral" size="sm" dot>Needs Attention</Badge>
                    </div>
                    <p className="text-sm text-amber-600 mb-2">{integration.description}</p>
                  </div>
                  <button
                    onClick={() => handleConnect(integration)}
                    disabled={connecting === integration.id}
                    className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {connecting === integration.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Reconnect'
                    )}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      {statusFilter !== 'connected' && (
        <div>
          <h2 className="text-sm font-bold text-[#999] uppercase tracking-wider mb-4">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.filter(i => i.status === 'disconnected').map((integration, index) => (
              <Card
                key={integration.id}
                className="p-5 hover:shadow-lg hover:border-[#EAD07D] transition-all duration-300 cursor-pointer group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-2xl group-hover:bg-[#EAD07D]/20 transition-colors">
                    {integration.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#EAD07D] transition-colors">{integration.name}</h3>
                      {integration.popular && <Badge variant="yellow" size="sm">Popular</Badge>}
                      {integration.configured === false && <Badge variant="neutral" size="sm">Not Configured</Badge>}
                    </div>
                    <p className="text-sm text-[#666] line-clamp-2">{integration.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(integration)}
                  disabled={connecting === integration.id || integration.configured === false}
                  className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-[#1A1A1A] group-hover:text-white group-hover:border-[#1A1A1A]"
                >
                  {connecting === integration.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>Connect <ArrowRight size={14} /></>
                  )}
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* API Section */}
      <Card variant="dark" className="mt-8 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D]/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Build Custom Integrations</h3>
            <p className="text-white/60">Use our REST API and webhooks to connect any tool.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white text-[#1A1A1A] rounded-xl font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
              API Docs <ExternalLink size={14} />
            </button>
            <button className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-colors">
              Manage API Keys
            </button>
          </div>
        </div>
      </Card>

      <ConfirmationModal
        isOpen={disconnectModal.isOpen}
        onClose={() => setDisconnectModal({ isOpen: false, integration: null })}
        onConfirm={confirmDisconnect}
        title="Disconnect Integration"
        message={`Are you sure you want to disconnect ${disconnectModal.integration?.name}? You can reconnect it later.`}
        confirmLabel="Disconnect"
        variant="warning"
      />
    </div>
  );
};
