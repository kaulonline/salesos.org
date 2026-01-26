import React, { useState } from 'react';
import {
  Search,
  Plus,
  Percent,
  Tag,
  X,
  Loader2,
  Trash2,
  Edit2,
  DollarSign,
  AlertCircle,
  Check,
  Calendar,
  Copy,
  Users,
  Layers,
  Clock,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useDiscountRules } from '../../src/hooks/useDiscountRules';
import type {
  DiscountRule,
  CreateDiscountRuleDto,
  UpdateDiscountRuleDto,
  DiscountRuleType,
  DiscountType,
  DISCOUNT_RULE_TYPES,
  DISCOUNT_TYPES,
} from '../../src/types/discountRule';

const RULE_TYPE_CONFIG: Record<DiscountRuleType, { icon: React.ElementType; color: string; bg: string }> = {
  VOLUME: { icon: Layers, color: 'text-blue-600', bg: 'bg-blue-100' },
  PROMO_CODE: { icon: Tag, color: 'text-purple-600', bg: 'bg-purple-100' },
  CUSTOMER_SEGMENT: { icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
  TIME_LIMITED: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
  BUNDLE: { icon: Layers, color: 'text-pink-600', bg: 'bg-pink-100' },
};

const RULE_TYPE_LABELS: Record<DiscountRuleType, string> = {
  VOLUME: 'Volume',
  PROMO_CODE: 'Promo Code',
  CUSTOMER_SEGMENT: 'Segment',
  TIME_LIMITED: 'Time Limited',
  BUNDLE: 'Bundle',
};

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDiscount(discount: number, type: DiscountType): string {
  if (type === 'PERCENTAGE') {
    return `${discount}%`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(discount);
}

function getRuleStatus(rule: DiscountRule): 'active' | 'inactive' | 'expired' | 'scheduled' {
  if (!rule.isActive) return 'inactive';
  const now = new Date();
  if (rule.validFrom && new Date(rule.validFrom) > now) return 'scheduled';
  if (rule.validTo && new Date(rule.validTo) < now) return 'expired';
  return 'active';
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-700' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
};

export const DiscountRules: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DiscountRuleType | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    rules,
    stats,
    loading,
    create,
    update,
    remove,
    clone,
    toggleActive,
    isCreating,
    isUpdating,
    isDeleting,
  } = useDiscountRules({ type: typeFilter || undefined });

  const filteredRules = rules.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRule = async (data: CreateDiscountRuleDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleUpdateRule = async (id: string, data: UpdateDiscountRuleDto) => {
    try {
      await update(id, data);
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleActive(id);
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleCloneRule = async (rule: DiscountRule) => {
    try {
      await clone(rule.id, `${rule.name} (Copy)`);
    } catch (error) {
      console.error('Failed to clone rule:', error);
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
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Discount Rules</h1>
          <p className="text-[#666]">Configure volume discounts, promo codes, and segment pricing.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search rules or codes..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DiscountRuleType | '')}
            className="px-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
          >
            <option value="">All Types</option>
            {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            <Plus size={16} /> New Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Percent size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</div>
              <div className="text-xs text-[#666]">Total Rules</div>
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
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Tag size={18} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">
                {stats.byType.find(t => t.type === 'PROMO_CODE')?.count || 0}
              </div>
              <div className="text-xs text-[#666]">Promo Codes</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <TrendingUp size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(stats.totalSavings)}
              </div>
              <div className="text-xs text-[#666]">Total Savings</div>
            </div>
          </Card>
        </div>
      )}

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <Card className="p-12 text-center">
          <Percent size={48} className="mx-auto text-[#999] mb-4" />
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
            {searchQuery || typeFilter ? 'No rules found' : 'No discount rules yet'}
          </h3>
          <p className="text-[#666] mb-6">
            {searchQuery || typeFilter
              ? 'Try different search terms or filters'
              : 'Create your first discount rule to offer promotions.'}
          </p>
          {!searchQuery && !typeFilter && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
            >
              <Plus size={18} />
              Create Discount Rule
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRules.map((rule) => {
            const status = getRuleStatus(rule);
            const statusConfig = STATUS_BADGES[status];
            const typeConfig = RULE_TYPE_CONFIG[rule.type];
            const TypeIcon = typeConfig.icon;

            return (
              <Card
                key={rule.id}
                className={`p-5 hover:shadow-md transition-all duration-300 ${
                  !rule.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${typeConfig.bg} flex items-center justify-center`}>
                      <TypeIcon size={20} className={typeConfig.color} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#1A1A1A]">{rule.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                        {rule.stackable && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#EAD07D]/20 text-[#1A1A1A]">
                            Stackable
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#666]">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{RULE_TYPE_LABELS[rule.type]}</span>
                        </span>
                        {rule.code && (
                          <span className="flex items-center gap-1 font-mono bg-[#F8F8F6] px-2 py-0.5 rounded">
                            <Tag size={12} /> {rule.code}
                          </span>
                        )}
                        {(rule.validFrom || rule.validTo) && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(rule.validFrom)} - {formatDate(rule.validTo)}
                          </span>
                        )}
                        {rule.maxUses && (
                          <span className="flex items-center gap-1">
                            <Zap size={12} />
                            {rule.currentUses}/{rule.maxUses} uses
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#1A1A1A]">
                        {formatDiscount(rule.discount, rule.discountType)}
                      </div>
                      <div className="text-xs text-[#666]">
                        {rule.discountType === 'PERCENTAGE' ? 'off' : 'fixed discount'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
                      <button
                        onClick={() => handleToggleActive(rule.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={rule.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {rule.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="p-2 rounded-lg text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleCloneRule(rule)}
                        className="p-2 rounded-lg text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(rule.id)}
                        className="p-2 rounded-lg text-[#666] hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingRule) && (
        <DiscountRuleModal
          rule={editingRule}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRule(null);
          }}
          onSave={
            editingRule
              ? (data) => handleUpdateRule(editingRule.id, data)
              : handleCreateRule
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
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Discount Rule</h3>
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
                onClick={() => handleDeleteRule(deleteConfirm)}
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

// Discount Rule Modal Component
interface DiscountRuleModalProps {
  rule: DiscountRule | null;
  onClose: () => void;
  onSave: (data: CreateDiscountRuleDto | UpdateDiscountRuleDto) => Promise<void>;
  saving: boolean;
}

const DiscountRuleModal: React.FC<DiscountRuleModalProps> = ({ rule, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<CreateDiscountRuleDto>({
    name: rule?.name || '',
    description: rule?.description || '',
    type: rule?.type || 'PROMO_CODE',
    code: rule?.code || '',
    discount: rule?.discount || 0,
    discountType: rule?.discountType || 'PERCENTAGE',
    validFrom: rule?.validFrom?.split('T')[0] || '',
    validTo: rule?.validTo?.split('T')[0] || '',
    isActive: rule?.isActive ?? true,
    priority: rule?.priority || 1,
    stackable: rule?.stackable ?? false,
    maxUses: rule?.maxUses || undefined,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (formData.discount <= 0) {
      setError('Discount must be greater than 0');
      return;
    }
    if (formData.type === 'PROMO_CODE' && !formData.code?.trim()) {
      setError('Promo code is required for this rule type');
      return;
    }

    try {
      const data = {
        ...formData,
        code: formData.type === 'PROMO_CODE' ? formData.code : undefined,
        validFrom: formData.validFrom || undefined,
        validTo: formData.validTo || undefined,
        maxUses: formData.maxUses || undefined,
      };
      await onSave(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save rule');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {rule ? 'Edit Discount Rule' : 'Create Discount Rule'}
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
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Summer Sale 20% Off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                rows={2}
                placeholder="Describe when this discount applies..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Rule Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as DiscountRuleType })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {formData.type === 'PROMO_CODE' && (
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Promo Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-mono"
                    placeholder="SUMMER20"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Discount *</label>
                <div className="relative">
                  {formData.discountType === 'FIXED_AMOUNT' && (
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
                  )}
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    className={`w-full py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm ${
                      formData.discountType === 'FIXED_AMOUNT' ? 'pl-10 pr-4' : 'px-4'
                    }`}
                    min="0"
                    step={formData.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                    max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                  />
                  {formData.discountType === 'PERCENTAGE' && (
                    <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999]" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Valid From</label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Valid To</label>
                <input
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  min="1"
                />
                <p className="text-xs text-[#999] mt-1">Higher priority rules apply first</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Max Uses</label>
                <input
                  type="number"
                  value={formData.maxUses || ''}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  min="1"
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm font-medium text-[#1A1A1A]">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.stackable}
                  onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm font-medium text-[#1A1A1A]">Stackable</span>
                <span className="text-xs text-[#666]">(can combine with other discounts)</span>
              </label>
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
                  {rule ? 'Update Rule' : 'Create Rule'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default DiscountRules;
