import React, { useState } from 'react';
import { Search, Plus, HardDrive, Calendar, AlertTriangle, RefreshCw, X, Loader2, Trash2, Edit2, Check, AlertCircle, Building2, FileText, Sparkles, TrendingUp, TrendingDown, Mail, Copy, BarChart3, Lightbulb, Activity } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../src/components/ui/Toast';
import { useAssets, useExpiringAssets, useRenewalPipeline } from '../../src/hooks/useAssets';
import { assetsApi } from '../../src/api/assets';
import type {
  Asset,
  CreateAssetDto,
  UpdateAssetDto,
  AssetStatus,
} from '../../src/types/asset';
import { STATUS_LABELS, STATUS_COLORS } from '../../src/types/asset';

function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDaysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const Assets: React.FC = () => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'expiring' | 'pipeline' | 'ai'>('all');
  const [renewalRisks, setRenewalRisks] = useState<any[]>([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<any>(null);

  const loadRenewalRisks = async () => {
    setLoadingRisks(true);
    try {
      const risks = await assetsApi.calculateRenewalRisk({ daysAhead: 90 });
      setRenewalRisks(risks);
    } catch (error) {
      console.error('Failed to load renewal risks:', error);
      showToast({ type: 'error', title: 'Failed to Load Renewal Risks', message: (error as Error).message || 'Please try again' });
    } finally {
      setLoadingRisks(false);
    }
  };

  const handleGenerateRenewalMessage = async (assetId: string, style: 'formal' | 'friendly' | 'urgent' = 'friendly') => {
    setGeneratingMessage(assetId);
    try {
      const message = await assetsApi.generateRenewalMessage(assetId, style);
      setGeneratedMessage({ assetId, ...message });
    } catch (error) {
      console.error('Failed to generate message:', error);
      showToast({ type: 'error', title: 'Failed to Generate Renewal Message', message: (error as Error).message || 'Please try again' });
    } finally {
      setGeneratingMessage(null);
    }
  };

  const {
    assets,
    stats,
    loading,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAssets({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
  });

  const { data: expiringData, loading: expiringLoading } = useExpiringAssets(90);
  const { data: pipelineData, loading: pipelineLoading } = useRenewalPipeline('quarter');

  const handleCreateAsset = async (data: CreateAssetDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
      showToast({ type: 'success', title: 'Asset Created' });
    } catch (error) {
      console.error('Failed to create asset:', error);
      showToast({ type: 'error', title: 'Failed to Create Asset', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleUpdateAsset = async (id: string, data: UpdateAssetDto) => {
    try {
      await update(id, data);
      setEditingAsset(null);
      showToast({ type: 'success', title: 'Asset Updated' });
    } catch (error) {
      console.error('Failed to update asset:', error);
      showToast({ type: 'error', title: 'Failed to Update Asset', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
      showToast({ type: 'success', title: 'Asset Deleted' });
    } catch (error) {
      console.error('Failed to delete asset:', error);
      showToast({ type: 'error', title: 'Failed to Delete Asset', message: (error as Error).message || 'Please try again' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-64 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Installed Base</h1>
          <p className="text-[#666]">Track customer assets, renewals, and support contracts.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AssetStatus | '')}
            className="px-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <HardDrive size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</div>
              <div className="text-xs text-[#666]">Total Assets</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Check size={18} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.active}</div>
              <div className="text-xs text-[#666]">Active</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.expiringIn30Days}</div>
              <div className="text-xs text-[#666]">Expiring Soon</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <RefreshCw size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(stats.totalRenewalValue)}</div>
              <div className="text-xs text-[#666]">Renewal Pipeline</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-white text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          All Assets
        </button>
        <button
          onClick={() => setActiveTab('expiring')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'expiring'
              ? 'bg-orange-500 text-white'
              : 'bg-white text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          <AlertTriangle size={14} />
          Expiring (90 days)
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'pipeline'
              ? 'bg-[#EAD07D] text-[#1A1A1A]'
              : 'bg-white text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          <RefreshCw size={14} />
          Renewal Pipeline
        </button>
        <button
          onClick={() => {
            setActiveTab('ai');
            if (renewalRisks.length === 0) loadRenewalRisks();
          }}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-gradient-to-r from-[#EAD07D] to-[#D4B85C] text-[#1A1A1A]'
              : 'bg-white text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          <Sparkles size={14} />
          AI Insights
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'all' && (
        <>
          {assets.length === 0 ? (
            <Card className="p-12 text-center">
              <HardDrive size={48} className="mx-auto text-[#999] mb-4" />
              <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
                {searchQuery || statusFilter ? 'No assets found' : 'No assets yet'}
              </h3>
              <p className="text-[#666] mb-6">
                {searchQuery || statusFilter
                  ? 'Try different search criteria'
                  : 'Start tracking customer-owned products and renewals.'}
              </p>
              {!searchQuery && !statusFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
                >
                  <Plus size={18} />
                  Add Asset
                </button>
              )}
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-black/5 bg-[#F8F8F6]">
                    <th className="px-4 py-3 text-left font-medium text-[#666]">Asset</th>
                    <th className="px-4 py-3 text-left font-medium text-[#666]">Account</th>
                    <th className="px-4 py-3 text-left font-medium text-[#666]">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-[#666]">Renewal Date</th>
                    <th className="px-4 py-3 text-left font-medium text-[#666]">Value</th>
                    <th className="px-4 py-3 text-right font-medium text-[#666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const daysUntilRenewal = getDaysUntil(asset.renewalDate);
                    const isExpiringSoon = daysUntilRenewal !== null && daysUntilRenewal <= 30 && daysUntilRenewal > 0;
                    const isExpired = daysUntilRenewal !== null && daysUntilRenewal <= 0;

                    return (
                      <tr key={asset.id} className="border-b border-black/5 hover:bg-[#F8F8F6]">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                              <HardDrive size={16} className="text-[#1A1A1A]" />
                            </div>
                            <div>
                              <div className="font-medium text-[#1A1A1A]">{asset.name}</div>
                              {asset.serialNumber && (
                                <div className="text-xs text-[#999] font-mono">{asset.serialNumber}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[#999]" />
                            <span className="text-[#666]">{asset.account?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={STATUS_COLORS[asset.status]}>
                            {STATUS_LABELS[asset.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`flex items-center gap-2 ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-[#666]'}`}>
                            <Calendar size={14} />
                            {formatDate(asset.renewalDate)}
                            {isExpiringSoon && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                {daysUntilRenewal}d
                              </span>
                            )}
                            {isExpired && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                Expired
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium text-[#1A1A1A]">
                          {formatCurrency(asset.renewalValue)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingAsset(asset)}
                              className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(asset.id)}
                              className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[#999] hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'expiring' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-600" />
            Assets Expiring in Next 90 Days
          </h3>
          {expiringLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-[#EAD07D]" />
            </div>
          ) : expiringData?.assets && expiringData.assets.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{expiringData.summary.expiring0to30}</div>
                  <div className="text-sm text-red-700">0-30 Days</div>
                  <div className="text-xs text-red-600 mt-1">{formatCurrency(expiringData.summary.value0to30)}</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{expiringData.summary.expiring31to60}</div>
                  <div className="text-sm text-orange-700">31-60 Days</div>
                  <div className="text-xs text-orange-600 mt-1">{formatCurrency(expiringData.summary.value31to60)}</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{expiringData.summary.expiring61to90}</div>
                  <div className="text-sm text-yellow-700">61-90 Days</div>
                  <div className="text-xs text-yellow-600 mt-1">{formatCurrency(expiringData.summary.value61to90)}</div>
                </div>
              </div>
              <div className="space-y-3">
                {expiringData.assets.map((asset) => {
                  const days = getDaysUntil(asset.renewalDate) || 0;
                  return (
                    <div key={asset.id} className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          days <= 30 ? 'bg-red-100' : days <= 60 ? 'bg-orange-100' : 'bg-yellow-100'
                        }`}>
                          <HardDrive size={16} className={
                            days <= 30 ? 'text-red-600' : days <= 60 ? 'text-orange-600' : 'text-yellow-600'
                          } />
                        </div>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{asset.name}</div>
                          <div className="text-xs text-[#666]">{asset.account?.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-[#1A1A1A]">{formatCurrency(asset.renewalValue)}</div>
                        <div className={`text-xs ${days <= 30 ? 'text-red-600' : days <= 60 ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {days} days left
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Check size={48} className="mx-auto text-green-500 mb-4" />
              <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">All Clear!</h4>
              <p className="text-[#666]">No assets expiring in the next 90 days.</p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'pipeline' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <RefreshCw size={18} className="text-[#EAD07D]" />
            Renewal Pipeline
          </h3>
          {pipelineLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-[#EAD07D]" />
            </div>
          ) : pipelineData ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#EAD07D]/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-[#1A1A1A]">{pipelineData.totalAssets}</div>
                  <div className="text-sm text-[#666]">Assets Up for Renewal</div>
                </div>
                <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-[#EAD07D]">{formatCurrency(pipelineData.totalValue)}</div>
                  <div className="text-sm text-white/60">Total Renewal Value</div>
                </div>
              </div>
              {pipelineData.byMonth && pipelineData.byMonth.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-[#666]">By Month</h4>
                  {pipelineData.byMonth.map((month, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-[#999]" />
                        <span className="font-medium text-[#1A1A1A]">{month.month}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-[#666]">{month.count} assets</span>
                        <span className="font-medium text-[#1A1A1A]">{formatCurrency(month.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <RefreshCw size={48} className="mx-auto text-[#999] mb-4" />
              <p className="text-[#666]">No renewal pipeline data available.</p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Renewal Risk Scores */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Activity size={18} className="text-[#EAD07D]" />
                AI Renewal Risk Analysis
              </h3>
              <button
                onClick={loadRenewalRisks}
                disabled={loadingRisks}
                className="flex items-center gap-2 px-4 py-2 bg-[#F8F8F6] text-[#666] rounded-xl text-sm font-medium hover:bg-[#EAD07D]/20 transition-all"
              >
                {loadingRisks ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh
              </button>
            </div>

            {loadingRisks ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#EAD07D]" />
              </div>
            ) : renewalRisks.length > 0 ? (
              <div className="space-y-3">
                {renewalRisks.map((risk) => (
                  <div key={risk.assetId} className={`p-4 rounded-xl border ${
                    risk.riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                    risk.riskLevel === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                    risk.riskLevel === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          risk.riskLevel === 'CRITICAL' ? 'bg-red-100' :
                          risk.riskLevel === 'HIGH' ? 'bg-orange-100' :
                          risk.riskLevel === 'MEDIUM' ? 'bg-yellow-100' :
                          'bg-green-100'
                        }`}>
                          <span className={`text-xl font-bold ${
                            risk.riskLevel === 'CRITICAL' ? 'text-red-600' :
                            risk.riskLevel === 'HIGH' ? 'text-orange-600' :
                            risk.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>{risk.riskScore}</span>
                        </div>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{risk.assetName}</div>
                          <div className={`text-xs font-semibold ${
                            risk.riskLevel === 'CRITICAL' ? 'text-red-600' :
                            risk.riskLevel === 'HIGH' ? 'text-orange-600' :
                            risk.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>{risk.riskLevel} RISK</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#666]">Renewal Probability</div>
                        <div className="text-lg font-bold text-[#1A1A1A]">{(risk.predictedRenewalProbability * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    {risk.riskFactors && risk.riskFactors.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-[#999] mb-1">RISK FACTORS</div>
                        <div className="flex flex-wrap gap-1">
                          {risk.riskFactors.map((factor: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-white/50 rounded text-xs text-[#666]">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {risk.recommendations && risk.recommendations.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-[#999] mb-1">RECOMMENDATIONS</div>
                        <ul className="space-y-1">
                          {risk.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-[#666] flex items-start gap-2">
                              <Lightbulb size={12} className="text-[#EAD07D] mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t border-black/5">
                      <button
                        onClick={() => handleGenerateRenewalMessage(risk.assetId, 'friendly')}
                        disabled={generatingMessage === risk.assetId}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#1A1A1A] text-white rounded-lg text-xs font-medium hover:bg-black disabled:opacity-50"
                      >
                        {generatingMessage === risk.assetId ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                        Generate Renewal Email
                      </button>
                      <button
                        onClick={() => handleGenerateRenewalMessage(risk.assetId, 'urgent')}
                        disabled={generatingMessage === risk.assetId}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Urgent Tone
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity size={48} className="mx-auto text-[#999] mb-4" />
                <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">No At-Risk Renewals</h4>
                <p className="text-[#666]">AI analysis found no assets with upcoming renewals at risk.</p>
              </div>
            )}
          </Card>

          {/* Generated Message Modal */}
          {generatedMessage && (
            <Card className="p-6 border-2 border-[#EAD07D]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#EAD07D]" />
                  <span className="font-semibold text-[#1A1A1A]">AI Generated Renewal Email</span>
                </div>
                <button
                  onClick={() => setGeneratedMessage(null)}
                  className="text-[#666] hover:text-[#1A1A1A]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#999] block mb-1">SUBJECT</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-[#F8F8F6] rounded-lg text-sm">{generatedMessage.subject}</div>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedMessage.subject)}
                      className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#999] block mb-1">BODY</label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-[#F8F8F6] rounded-lg text-sm whitespace-pre-wrap">{generatedMessage.body}</div>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedMessage.body)}
                      className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg h-fit"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#999] block mb-1">CALL TO ACTION</label>
                  <div className="px-3 py-2 bg-[#EAD07D]/20 rounded-lg text-sm font-medium text-[#1A1A1A]">
                    {generatedMessage.callToAction}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAsset) && (
        <AssetModal
          asset={editingAsset}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAsset(null);
          }}
          onSave={editingAsset
            ? (data) => handleUpdateAsset(editingAsset.id, data)
            : handleCreateAsset
          }
          saving={isCreating || isUpdating}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Asset</h3>
                <p className="text-sm text-[#666]">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAsset(deleteConfirm)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Asset Modal Component
interface AssetModalProps {
  asset: Asset | null;
  onClose: () => void;
  onSave: (data: CreateAssetDto | UpdateAssetDto) => Promise<void>;
  saving: boolean;
}

const AssetModal: React.FC<AssetModalProps> = ({ asset, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<CreateAssetDto>({
    accountId: asset?.accountId || '',
    name: asset?.name || '',
    serialNumber: asset?.serialNumber || '',
    status: asset?.status || 'ACTIVE',
    purchaseDate: asset?.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
    warrantyEndDate: asset?.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
    renewalDate: asset?.renewalDate ? new Date(asset.renewalDate).toISOString().split('T')[0] : '',
    renewalValue: asset?.renewalValue || undefined,
    seatCount: asset?.seatCount || undefined,
    seatsUsed: asset?.seatsUsed || undefined,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Asset name is required');
      return;
    }
    if (!formData.accountId.trim()) {
      setError('Account is required');
      return;
    }

    try {
      await onSave({
        ...formData,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : undefined,
        warrantyEndDate: formData.warrantyEndDate ? new Date(formData.warrantyEndDate) : undefined,
        renewalDate: formData.renewalDate ? new Date(formData.renewalDate) : undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save asset');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {asset ? 'Edit Asset' : 'Add Asset'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#666] mb-1">Asset Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Enterprise License - 100 seats"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Account ID *</label>
              <input
                type="text"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Account ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-mono"
                placeholder="SN-001-2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as AssetStatus })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Renewal Value</label>
              <input
                type="number"
                value={formData.renewalValue || ''}
                onChange={(e) => setFormData({ ...formData, renewalValue: parseFloat(e.target.value) || undefined })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate || ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Renewal Date</label>
              <input
                type="date"
                value={formData.renewalDate || ''}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Seat Count</label>
              <input
                type="number"
                value={formData.seatCount || ''}
                onChange={(e) => setFormData({ ...formData, seatCount: parseInt(e.target.value) || undefined })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="100"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Seats Used</label>
              <input
                type="number"
                value={formData.seatsUsed || ''}
                onChange={(e) => setFormData({ ...formData, seatsUsed: parseInt(e.target.value) || undefined })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="75"
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {asset ? 'Update Asset' : 'Add Asset'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
