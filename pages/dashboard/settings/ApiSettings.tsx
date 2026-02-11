import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Key,
  Webhook,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Activity,
  Clock,
  Shield,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmationModal } from '../../../src/components/ui/ConfirmationModal';
import { useApiKeys } from '../../../src/hooks/useApiKeys';
import { useWebhooks } from '../../../src/hooks/useWebhooks';
import type { ApiKey, Webhook as WebhookType, CreateApiKeyDto, CreateWebhookDto, ApiKeyScope, WebhookEvent } from '../../../src/types';
import { API_SCOPE_DEFINITIONS, WEBHOOK_EVENT_LABELS } from '../../../src/types/apiKey';
import { useToast } from '../../../src/components/ui/Toast';

type TabType = 'api-keys' | 'webhooks';

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateApiKeyDto) => Promise<{ apiKey: ApiKey; secretKey: string }>;
}

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{ apiKey: ApiKey; secretKey: string } | null>(null);
  const [formData, setFormData] = useState<CreateApiKeyDto>({
    name: '',
    description: '',
    scopes: [],
    rateLimitPerMinute: 60,
    rateLimitPerDay: 10000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.scopes.length === 0) {
      setError('Name and at least one scope are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onCreate(formData);
      setCreatedKey(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedKey(null);
    setFormData({ name: '', description: '', scopes: [], rateLimitPerMinute: 60, rateLimitPerDay: 10000 });
    onClose();
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  if (!isOpen) return null;

  if (createdKey) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-medium text-[#1A1A1A]">API Key Created</h2>
              <p className="text-[#666] mt-2">
                Copy your secret key now. You won't be able to see it again.
              </p>
            </div>

            <div className="p-4 bg-[#F8F8F6] rounded-xl mb-6">
              <label className="text-xs font-medium text-[#666] mb-1 block">Secret Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono break-all">{createdKey.secretKey}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdKey.secretKey)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm mb-6">
              <strong>Important:</strong> Store this key securely. It will only be shown once.
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-8 pb-0 shrink-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New API Key</h2>
          <button onClick={handleClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production API Key"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Used for website integration"
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-2 block">Scopes *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-[#F8F8F6] rounded-xl">
                {Object.entries(API_SCOPE_DEFINITIONS).map(([scope, def]) => (
                  <label key={scope} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope as ApiKeyScope)}
                      onChange={() => toggleScope(scope as ApiKeyScope)}
                      className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                    />
                    <span className="text-sm">
                      <span className="font-medium">{def.label}</span>
                      <span className="text-[#888] ml-2">{def.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Rate Limit / Min</label>
                <input
                  type="number"
                  value={formData.rateLimitPerMinute}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Rate Limit / Day</label>
                <input
                  type="number"
                  value={formData.rateLimitPerDay}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerDay: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function ApiSettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('api-keys');
  const { keys, usage, loading: keysLoading, create, remove, revoke } = useApiKeys();
  const { webhooks, stats: webhookStats, loading: webhooksLoading, remove: removeWebhook, activate, deactivate } = useWebhooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'danger',
    onConfirm: async () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const filteredKeys = useMemo(() => {
    return keys.filter(key =>
      key?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [keys, searchQuery]);

  const filteredWebhooks = useMemo(() => {
    return webhooks.filter(wh =>
      wh?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh?.url?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [webhooks, searchQuery]);

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setConfirmLoading(false);
  };

  const handleConfirm = async () => {
    setConfirmLoading(true);
    try {
      await confirmModal.onConfirm();
    } finally {
      closeConfirmModal();
    }
  };

  const handleDeleteKey = (key: ApiKey) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete API Key',
      message: `Are you sure you want to delete "${key.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await remove(key.id);
          showToast({ type: 'success', title: 'API Key Deleted' });
        } catch (err) {
          console.error('Failed to delete key:', err);
          showToast({ type: 'error', title: 'Failed to Delete API Key', message: (err as Error).message || 'Please try again' });
        }
      },
    });
  };

  const handleRevokeKey = (key: ApiKey) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke API Key',
      message: `Are you sure you want to revoke "${key.name}"? This cannot be undone and the key will stop working immediately.`,
      confirmLabel: 'Revoke',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await revoke(key.id);
          showToast({ type: 'success', title: 'API Key Revoked' });
        } catch (err) {
          console.error('Failed to revoke key:', err);
          showToast({ type: 'error', title: 'Failed to Revoke API Key', message: (err as Error).message || 'Please try again' });
        }
      },
    });
  };

  const handleToggleWebhook = async (webhook: WebhookType) => {
    try {
      if (webhook.status === 'ACTIVE') {
        await deactivate(webhook.id);
      } else {
        await activate(webhook.id);
      }
      showToast({ type: 'success', title: webhook.status === 'ACTIVE' ? 'Webhook Deactivated' : 'Webhook Activated' });
    } catch (err) {
      console.error('Failed to toggle webhook:', err);
      showToast({ type: 'error', title: 'Failed to Toggle Webhook', message: (err as Error).message || 'Please try again' });
    }
  };

  const handleDeleteWebhook = (webhook: WebhookType) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Webhook',
      message: `Are you sure you want to delete "${webhook.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await removeWebhook(webhook.id);
          showToast({ type: 'success', title: 'Webhook Deleted' });
        } catch (err) {
          console.error('Failed to delete webhook:', err);
          showToast({ type: 'error', title: 'Failed to Delete Webhook', message: (err as Error).message || 'Please try again' });
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">API & Webhooks</h1>
        <p className="text-[#666] mt-1">Manage API keys and webhook integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-[#F8F8F6] rounded-full w-fit">
        <button
          onClick={() => setActiveTab('api-keys')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'api-keys'
              ? 'bg-white text-[#1A1A1A] shadow-sm'
              : 'text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          <Key size={16} />
          API Keys
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'webhooks'
              ? 'bg-white text-[#1A1A1A] shadow-sm'
              : 'text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          <Webhook size={16} />
          Webhooks
        </button>
      </div>

      {/* Stats */}
      {activeTab === 'api-keys' && usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{keys.length}</p>
            <p className="text-sm text-[#666]">API Keys</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-blue-600">{usage.requestsToday}</p>
            <p className="text-sm text-[#666]">Requests Today</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{usage.totalRequests}</p>
            <p className="text-sm text-[#666]">Total Requests</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#EAD07D]">{usage.avgResponseTime}ms</p>
            <p className="text-sm text-[#666]">Avg Response</p>
          </Card>
        </div>
      )}

      {activeTab === 'webhooks' && webhookStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{webhookStats.total}</p>
            <p className="text-sm text-[#666]">Webhooks</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-green-600">{webhookStats.active}</p>
            <p className="text-sm text-[#666]">Active</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-blue-600">{webhookStats.totalDeliveries}</p>
            <p className="text-sm text-[#666]">Deliveries</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#EAD07D]">
              {(webhookStats.deliveryRate * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-[#666]">Success Rate</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
          <input
            type="text"
            placeholder={activeTab === 'api-keys' ? 'Search API keys...' : 'Search webhooks...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
          />
        </div>
        {activeTab === 'api-keys' && (
          <button
            onClick={() => setShowCreateKeyModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
          >
            <Plus size={18} />
            New API Key
          </button>
        )}
      </div>

      {/* API Keys List */}
      {activeTab === 'api-keys' && (
        <>
          {keysLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : filteredKeys.length === 0 ? (
            <Card className="p-12 text-center">
              <Key className="w-12 h-12 text-[#888] mx-auto mb-4" />
              <p className="text-[#666]">No API keys found</p>
              <button
                onClick={() => setShowCreateKeyModal(true)}
                className="mt-4 text-sm text-[#1A1A1A] hover:underline"
              >
                Create your first API key
              </button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredKeys.map(key => (
                <Card key={key.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                        <Key size={20} className="text-[#666]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#1A1A1A]">{key.name}</p>
                          <Badge
                            variant={key.status === 'ACTIVE' ? 'green' : key.status === 'REVOKED' ? 'red' : 'neutral'}
                            size="sm"
                          >
                            {key.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#888]">
                          {key.keyPrefix}... · {key.scopes.length} scopes · {key.usageCount} requests
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevokeKey(key)}
                          className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                          title="Revoke"
                        >
                          <Shield size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteKey(key)}
                        className="p-2 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Webhooks List */}
      {activeTab === 'webhooks' && (
        <>
          {webhooksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : filteredWebhooks.length === 0 ? (
            <Card className="p-12 text-center">
              <Webhook className="w-12 h-12 text-[#888] mx-auto mb-4" />
              <p className="text-[#666]">No webhooks configured</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredWebhooks.map(webhook => (
                <Card key={webhook.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                        <Webhook size={20} className="text-[#666]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#1A1A1A]">{webhook.name}</p>
                          <Badge
                            variant={webhook.status === 'ACTIVE' ? 'green' : webhook.status === 'FAILING' ? 'red' : 'neutral'}
                            size="sm"
                          >
                            {webhook.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#888] truncate max-w-md">
                          {webhook.url} · {webhook.events.length} events
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleWebhook(webhook)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={webhook.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {webhook.status === 'ACTIVE' ? (
                          <ToggleRight size={20} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={20} className="text-[#888]" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook)}
                        className="p-2 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <CreateApiKeyModal
        isOpen={showCreateKeyModal}
        onClose={() => setShowCreateKeyModal(false)}
        onCreate={create}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        loading={confirmLoading}
      />
    </div>
  );
}
