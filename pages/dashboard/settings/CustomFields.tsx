import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Settings2,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  List,
  Link,
  Mail,
  Phone,
  FileText,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  AlertCircle,
  X,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmationModal } from '../../../src/components/ui/ConfirmationModal';
import { useCustomFields } from '../../../src/hooks/useCustomFields';
import type {
  CustomField,
  CustomFieldType,
  CustomFieldEntity,
  CreateCustomFieldDto,
} from '../../../src/types';
import { AIBuilderModal, AIBuilderTrigger } from '../../../src/components/AIBuilder';
import { AIBuilderEntityType, CustomFieldsConfig } from '../../../src/types/aiBuilder';
import { useToast } from '../../../src/components/ui/Toast';

const ENTITY_OPTIONS: { value: CustomFieldEntity; label: string }[] = [
  { value: 'LEAD', label: 'Leads' },
  { value: 'CONTACT', label: 'Contacts' },
  { value: 'ACCOUNT', label: 'Accounts' },
  { value: 'OPPORTUNITY', label: 'Opportunities' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'QUOTE', label: 'Quotes' },
];

const FIELD_TYPE_OPTIONS: { value: CustomFieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'TEXT', label: 'Text', icon: <Type size={16} /> },
  { value: 'NUMBER', label: 'Number', icon: <Hash size={16} /> },
  { value: 'CURRENCY', label: 'Currency', icon: <span className="text-sm font-medium">$</span> },
  { value: 'DATE', label: 'Date', icon: <Calendar size={16} /> },
  { value: 'DATETIME', label: 'Date & Time', icon: <Calendar size={16} /> },
  { value: 'CHECKBOX', label: 'Checkbox', icon: <CheckSquare size={16} /> },
  { value: 'PICKLIST', label: 'Picklist', icon: <List size={16} /> },
  { value: 'MULTI_PICKLIST', label: 'Multi-Select', icon: <List size={16} /> },
  { value: 'URL', label: 'URL', icon: <Link size={16} /> },
  { value: 'EMAIL', label: 'Email', icon: <Mail size={16} /> },
  { value: 'PHONE', label: 'Phone', icon: <Phone size={16} /> },
  { value: 'TEXTAREA', label: 'Text Area', icon: <FileText size={16} /> },
];

const ENTITY_COLORS: Record<CustomFieldEntity, string> = {
  LEAD: 'blue',
  CONTACT: 'green',
  ACCOUNT: 'purple',
  OPPORTUNITY: 'yellow',
  PRODUCT: 'neutral',
  QUOTE: 'red',
};

interface CreateFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateCustomFieldDto) => Promise<void>;
}

const CreateFieldModal: React.FC<CreateFieldModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCustomFieldDto>({
    name: '',
    label: '',
    entity: 'LEAD',
    type: 'TEXT',
    description: '',
    isRequired: false,
    isUnique: false,
  });
  const [picklistValues, setPicklistValues] = useState<string[]>(['']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.label) {
      setError('Name and label are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = { ...formData };
      if (formData.type === 'PICKLIST' || formData.type === 'MULTI_PICKLIST') {
        data.picklistValues = picklistValues
          .filter(v => v.trim())
          .map((v, i) => ({ value: v, label: v, isDefault: i === 0 }));
      }
      await onCreate(data);
      onClose();
      setFormData({
        name: '',
        label: '',
        entity: 'LEAD',
        type: 'TEXT',
        description: '',
        isRequired: false,
        isUnique: false,
      });
      setPicklistValues(['']);
    } catch (err) {
      setError((err as Error).message || 'Failed to create field');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-8 pb-0 shrink-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Custom Field</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A] transition-colors">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Entity *</label>
                <select
                  value={formData.entity}
                  onChange={(e) => setFormData({ ...formData, entity: e.target.value as CustomFieldEntity })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                >
                  {ENTITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Field Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomFieldType })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                >
                  {FIELD_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Field Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                placeholder="field_name"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
              <p className="text-xs text-[#888] mt-1">API name (no spaces, lowercase)</p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Display Label *</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Field Label"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Help text for this field"
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
              />
            </div>

            {(formData.type === 'PICKLIST' || formData.type === 'MULTI_PICKLIST') && (
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Picklist Values</label>
                {picklistValues.map((value, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        const newValues = [...picklistValues];
                        newValues[index] = e.target.value;
                        setPicklistValues(newValues);
                      }}
                      placeholder={`Value ${index + 1}`}
                      className="flex-1 px-4 py-2 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                    />
                    {picklistValues.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPicklistValues(picklistValues.filter((_, i) => i !== index))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPicklistValues([...picklistValues, ''])}
                  className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
                >
                  <Plus size={14} /> Add value
                </button>
              </div>
            )}

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm text-[#666]">Required field</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isUnique}
                  onChange={(e) => setFormData({ ...formData, isUnique: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm text-[#666]">Unique values only</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CustomFieldsPage() {
  const { fields, stats, loading, error, create, update, remove } = useCustomFields();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<CustomFieldEntity | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; field: CustomField | null }>({
    isOpen: false,
    field: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handle AI-generated custom fields
  const handleAIFieldsApply = async (config: Record<string, any>) => {
    try {
      const aiConfig = config as CustomFieldsConfig;

      // Create each field from the AI config
      for (const field of aiConfig.fields) {
        // Map AI fieldType to our CustomFieldType
        const typeMap: Record<string, CustomFieldType> = {
          text: 'TEXT',
          number: 'NUMBER',
          currency: 'CURRENCY',
          date: 'DATE',
          datetime: 'DATETIME',
          checkbox: 'CHECKBOX',
          picklist: 'PICKLIST',
          multipicklist: 'MULTI_PICKLIST',
          multi_picklist: 'MULTI_PICKLIST',
          url: 'URL',
          email: 'EMAIL',
          phone: 'PHONE',
          textarea: 'TEXTAREA',
        };

        const fieldData: CreateCustomFieldDto = {
          name: field.name.toLowerCase().replace(/\s+/g, '_'),
          label: field.label,
          entity: field.entity as CustomFieldEntity,
          type: typeMap[field.fieldType?.toLowerCase()] || 'TEXT',
          description: field.description,
          isRequired: field.isRequired || false,
          isUnique: field.isUnique || false,
          defaultValue: field.defaultValue,
          picklistValues: field.picklistValues?.map((pv, i) => ({
            value: pv.value,
            label: pv.label,
            isDefault: i === 0,
          })),
        };

        await create(fieldData);
      }
    } catch (err) {
      console.error('Failed to create custom fields:', err);
      showToast({ type: 'error', title: 'Failed to Create Custom Fields', message: (err as Error).message || 'Please try again' });
    }
  };

  const filteredFields = useMemo(() => {
    return fields.filter(field => {
      const matchesSearch =
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEntity = entityFilter === 'all' || field.entity === entityFilter;
      return matchesSearch && matchesEntity;
    });
  }, [fields, searchQuery, entityFilter]);

  const groupedFields = useMemo(() => {
    const groups: Record<CustomFieldEntity, CustomField[]> = {
      LEAD: [],
      CONTACT: [],
      ACCOUNT: [],
      OPPORTUNITY: [],
      PRODUCT: [],
      QUOTE: [],
    };
    filteredFields.forEach(field => {
      groups[field.entity].push(field);
    });
    return groups;
  }, [filteredFields]);

  const handleToggleActive = async (field: CustomField) => {
    try {
      await update(field.id, { isActive: !field.isActive });
      showToast({ type: 'success', title: field.isActive ? 'Field Deactivated' : 'Field Activated' });
    } catch (err) {
      console.error('Failed to toggle field:', err);
      showToast({ type: 'error', title: 'Failed to Toggle Field', message: (err as Error).message || 'Please try again' });
    }
  };

  const handleDelete = (field: CustomField) => {
    setDeleteModal({ isOpen: true, field });
  };

  const confirmDelete = async () => {
    if (!deleteModal.field) return;
    setDeleteLoading(true);
    try {
      await remove(deleteModal.field.id);
      showToast({ type: 'success', title: 'Custom Field Deleted' });
    } catch (err) {
      console.error('Failed to delete field:', err);
      showToast({ type: 'error', title: 'Failed to Delete Field', message: (err as Error).message || 'Please try again' });
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ isOpen: false, field: null });
    }
  };

  const getFieldTypeIcon = (type: CustomFieldType) => {
    const option = FIELD_TYPE_OPTIONS.find(o => o.value === type);
    return option?.icon || <Type size={16} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Custom Fields</h1>
        <p className="text-[#666] mt-1">Add custom fields to extend your CRM data</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{stats.total}</p>
            <p className="text-sm text-[#666]">Total Fields</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-green-600">{stats.activeCount}</p>
            <p className="text-sm text-[#666]">Active</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{Object.keys(stats.byEntity).length}</p>
            <p className="text-sm text-[#666]">Entities</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{Object.keys(stats.byType).length}</p>
            <p className="text-sm text-[#666]">Field Types</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
            <input
              type="text"
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
            />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as CustomFieldEntity | 'all')}
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] outline-none text-sm"
          >
            <option value="all">All Entities</option>
            {ENTITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <AIBuilderTrigger
            onClick={() => setShowAIBuilder(true)}
            label="Create with AI"
            variant="secondary"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
          >
            <Plus size={18} />
            New Field
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Fields List */}
      {!loading && entityFilter === 'all' ? (
        <div className="space-y-6">
          {ENTITY_OPTIONS.map(entity => {
            const entityFields = groupedFields[entity.value];
            if (entityFields.length === 0) return null;

            return (
              <div key={entity.value}>
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-3 flex items-center gap-2">
                  <Badge variant={ENTITY_COLORS[entity.value] as any}>{entity.label}</Badge>
                  <span className="text-sm text-[#888]">({entityFields.length})</span>
                </h3>
                <div className="space-y-2">
                  {entityFields.map(field => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      onToggle={() => handleToggleActive(field)}
                      onDelete={() => handleDelete(field)}
                      getTypeIcon={getFieldTypeIcon}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFields.map(field => (
            <FieldRow
              key={field.id}
              field={field}
              onToggle={() => handleToggleActive(field)}
              onDelete={() => handleDelete(field)}
              getTypeIcon={getFieldTypeIcon}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredFields.length === 0 && (
        <Card className="p-12 text-center">
          <Settings2 className="w-12 h-12 text-[#888] mx-auto mb-4" />
          <p className="text-[#666]">No custom fields found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-[#1A1A1A] hover:underline"
          >
            Create your first custom field
          </button>
        </Card>
      )}

      <CreateFieldModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={async (data: CreateCustomFieldDto) => { await create(data); }}
      />

      <AIBuilderModal
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        entityType={AIBuilderEntityType.CUSTOM_FIELDS}
        entityLabel="Custom Fields"
        onApply={handleAIFieldsApply}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, field: null })}
        onConfirm={confirmDelete}
        title="Delete Custom Field"
        message={`Are you sure you want to delete "${deleteModal.field?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}

interface FieldRowProps {
  field: CustomField;
  onToggle: () => void;
  onDelete: () => void;
  getTypeIcon: (type: CustomFieldType) => React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, onToggle, onDelete, getTypeIcon }) => {
  return (
    <Card className="p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-[#666]">
          {getTypeIcon(field.type)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-[#1A1A1A]">{field.label}</p>
            {field.isRequired && (
              <span className="text-xs text-red-500">Required</span>
            )}
            {!field.isActive && (
              <Badge variant="neutral" size="sm">Inactive</Badge>
            )}
          </div>
          <p className="text-sm text-[#888]">
            {field.name} · {field.type.toLowerCase().replace('_', ' ')}
            {field.description && ` · ${field.description}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={field.isActive ? 'Deactivate' : 'Activate'}
        >
          {field.isActive ? (
            <ToggleRight size={20} className="text-green-600" />
          ) : (
            <ToggleLeft size={20} className="text-[#888]" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </Card>
  );
};
