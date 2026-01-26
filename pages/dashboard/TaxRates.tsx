import React, { useState } from 'react';
import {
  Search,
  Plus,
  Globe,
  MapPin,
  X,
  Loader2,
  Trash2,
  Edit2,
  AlertCircle,
  Check,
  Star,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Percent,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useTaxRates } from '../../src/hooks/useTaxRates';
import type {
  TaxRate,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  TaxType,
  TAX_TYPES,
  TAX_COUNTRIES,
  US_STATES,
  CA_PROVINCES,
} from '../../src/types/taxRate';

const TAX_TYPE_LABELS: Record<TaxType, { label: string; color: string; bg: string }> = {
  SALES: { label: 'Sales Tax', color: 'text-[#1A1A1A]', bg: 'bg-[#1A1A1A]/10' },
  VAT: { label: 'VAT', color: 'text-[#1A1A1A]', bg: 'bg-[#EAD07D]/30' },
  GST: { label: 'GST', color: 'text-[#1A1A1A]', bg: 'bg-[#93C01F]/20' },
  HST: { label: 'HST', color: 'text-[#1A1A1A]', bg: 'bg-[#EAD07D]/20' },
  PST: { label: 'PST', color: 'text-[#1A1A1A]', bg: 'bg-[#F8F8F6]' },
  CUSTOM: { label: 'Custom', color: 'text-[#666]', bg: 'bg-[#F8F8F6]' },
};

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', hasRegions: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', hasRegions: true },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', hasRegions: false },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', hasRegions: false },
  { code: 'FR', name: 'France', flag: '🇫🇷', hasRegions: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', hasRegions: true },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', hasRegions: false },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', hasRegions: false },
  { code: 'IN', name: 'India', flag: '🇮🇳', hasRegions: true },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', hasRegions: true },
];

const US_STATES_LIST = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

const CA_PROVINCES_LIST = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

function getRegionsForCountry(countryCode: string) {
  if (countryCode === 'US') return US_STATES_LIST;
  if (countryCode === 'CA') return CA_PROVINCES_LIST;
  return [];
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

export const TaxRates: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    rates,
    stats,
    loading,
    create,
    update,
    remove,
    setAsDefault,
    toggleActive,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTaxRates({ country: countryFilter || undefined });

  const filteredRates = rates.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.region?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRate = async (data: CreateTaxRateDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create rate:', error);
    }
  };

  const handleUpdateRate = async (id: string, data: UpdateTaxRateDto) => {
    try {
      await update(id, data);
      setEditingRate(null);
    } catch (error) {
      console.error('Failed to update rate:', error);
    }
  };

  const handleDeleteRate = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete rate:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setAsDefault(id);
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleActive(id);
    } catch (error) {
      console.error('Failed to toggle rate:', error);
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
            <Skeleton key={i} className="h-20 rounded-2xl" />
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
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Tax Rates</h1>
          <p className="text-[#666]">Configure regional tax rates for accurate quote calculations.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search rates..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            <Plus size={16} /> New Rate
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Calculator size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</div>
              <div className="text-xs text-[#666]">Total Rates</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
              <Check size={18} className="text-[#93C01F]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.active}</div>
              <div className="text-xs text-[#666]">Active</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Globe size={18} className="text-[#666]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.byCountry.length}</div>
              <div className="text-xs text-[#666]">Countries</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Percent size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">
                {stats.byCountry.length > 0
                  ? `${(stats.byCountry.reduce((sum, c) => sum + c.avgRate, 0) / stats.byCountry.length).toFixed(1)}%`
                  : '0%'}
              </div>
              <div className="text-xs text-[#666]">Avg Rate</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tax Rates List */}
      {filteredRates.length === 0 ? (
        <Card className="p-12 text-center">
          <Calculator size={48} className="mx-auto text-[#999] mb-4" />
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
            {searchQuery || countryFilter ? 'No tax rates found' : 'No tax rates yet'}
          </h3>
          <p className="text-[#666] mb-6">
            {searchQuery || countryFilter
              ? 'Try different search terms or filters'
              : 'Create tax rates for automatic quote calculations.'}
          </p>
          {!searchQuery && !countryFilter && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
            >
              <Plus size={18} />
              Create Tax Rate
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRates.map((rate) => {
            const typeConfig = TAX_TYPE_LABELS[rate.taxType];
            const country = COUNTRIES.find((c) => c.code === rate.country);

            return (
              <Card
                key={rate.id}
                className={`p-4 hover:shadow-md transition-all duration-300 ${
                  !rate.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-2xl">
                      {country?.flag || '🌍'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#1A1A1A]">{rate.name}</h3>
                        {rate.isDefault && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#EAD07D]/20 text-[#1A1A1A]">
                            <Star size={10} /> Default
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        {rate.isCompound && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Compound
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#666]">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {country?.name || rate.country}
                          {rate.region && ` · ${rate.region}`}
                          {rate.city && ` · ${rate.city}`}
                        </span>
                        {rate.description && (
                          <span className="text-[#999]">· {rate.description}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#1A1A1A]">{formatRate(rate.rate)}</div>
                      <div className="text-xs text-[#666]">tax rate</div>
                    </div>
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
                      <button
                        onClick={() => handleToggleActive(rate.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          rate.isActive ? 'text-[#93C01F] hover:bg-[#93C01F]/10' : 'text-[#999] hover:bg-[#F8F8F6]'
                        }`}
                        title={rate.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {rate.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      {!rate.isDefault && (
                        <button
                          onClick={() => handleSetDefault(rate.id)}
                          className="p-2 rounded-lg text-[#666] hover:bg-[#EAD07D]/20 hover:text-[#1A1A1A]"
                          title="Set as default for this location"
                        >
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingRate(rate)}
                        className="p-2 rounded-lg text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(rate.id)}
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
      {(showCreateModal || editingRate) && (
        <TaxRateModal
          rate={editingRate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRate(null);
          }}
          onSave={
            editingRate
              ? (data) => handleUpdateRate(editingRate.id, data)
              : handleCreateRate
          }
          saving={isCreating || isUpdating}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-[#1A1A1A]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Tax Rate</h3>
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
                onClick={() => handleDeleteRate(deleteConfirm)}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#666] text-white rounded-xl text-sm font-medium hover:bg-[#555] transition-colors disabled:opacity-50 flex items-center gap-2"
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

// Tax Rate Modal Component
interface TaxRateModalProps {
  rate: TaxRate | null;
  onClose: () => void;
  onSave: (data: CreateTaxRateDto | UpdateTaxRateDto) => Promise<void>;
  saving: boolean;
}

const TaxRateModal: React.FC<TaxRateModalProps> = ({ rate, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<CreateTaxRateDto>({
    name: rate?.name || '',
    description: rate?.description || '',
    taxType: rate?.taxType || 'SALES',
    rate: rate?.rate || 0,
    country: rate?.country || 'US',
    region: rate?.region || '',
    city: rate?.city || '',
    isDefault: rate?.isDefault ?? false,
    isCompound: rate?.isCompound ?? false,
    isActive: rate?.isActive ?? true,
  });
  const [error, setError] = useState('');

  const selectedCountry = COUNTRIES.find((c) => c.code === formData.country);
  const regions = getRegionsForCountry(formData.country);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Tax rate name is required');
      return;
    }
    if (formData.rate < 0 || formData.rate > 100) {
      setError('Rate must be between 0 and 100');
      return;
    }

    try {
      const data = {
        ...formData,
        region: formData.region || undefined,
        city: formData.city || undefined,
      };
      await onSave(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save tax rate');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {rate ? 'Edit Tax Rate' : 'Create Tax Rate'}
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
                placeholder="California Sales Tax"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="State sales tax for California"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Tax Type</label>
                <select
                  value={formData.taxType}
                  onChange={(e) => setFormData({ ...formData, taxType: e.target.value as TaxType })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  {Object.entries(TAX_TYPE_LABELS).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Rate (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm pr-8"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999]" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Country *</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value, region: '' })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            {selectedCountry?.hasRegions && regions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">
                  {formData.country === 'US' ? 'State' : formData.country === 'CA' ? 'Province' : 'Region'}
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  <option value="">All {formData.country === 'US' ? 'States' : 'Provinces'}</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">City (Optional)</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Leave empty for all cities"
              />
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
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm font-medium text-[#1A1A1A]">Default</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isCompound}
                  onChange={(e) => setFormData({ ...formData, isCompound: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm font-medium text-[#1A1A1A]">Compound</span>
              </label>
            </div>
            <p className="text-xs text-[#999]">
              Compound taxes are calculated on top of other taxes
            </p>
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
                  {rate ? 'Update Rate' : 'Create Rate'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TaxRates;
