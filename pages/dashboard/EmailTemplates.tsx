import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Mail,
  FileText,
  Copy,
  Trash2,
  Edit3,
  Eye,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { useEmailTemplates, useMergeFields } from '../../src/hooks/useEmailTemplates';
import type { EmailTemplate, CreateEmailTemplateDto, TemplateCategory } from '../../src/types';
import { TEMPLATE_CATEGORY_LABELS } from '../../src/types/emailTemplate';
import { AIBuilderModal, AIBuilderTrigger } from '../../src/components/AIBuilder';
import { AIBuilderEntityType, EmailTemplateConfig } from '../../src/types/aiBuilder';

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  SALES: 'blue',
  FOLLOW_UP: 'green',
  QUOTE: 'yellow',
  MEETING: 'purple',
  ONBOARDING: 'neutral',
  NURTURING: 'green',
  ANNOUNCEMENT: 'red',
  CUSTOM: 'neutral',
};

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateEmailTemplateDto) => Promise<void>;
}

// Edit Template Modal
interface EditTemplateModalProps {
  isOpen: boolean;
  template: EmailTemplate | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<CreateEmailTemplateDto>) => Promise<void>;
}

const EditTemplateModal: React.FC<EditTemplateModalProps> = ({ isOpen, template, onClose, onUpdate }) => {
  const { mergeFields } = useMergeFields();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [formData, setFormData] = useState<CreateEmailTemplateDto>({
    name: '',
    subject: '',
    body: '',
    category: 'CUSTOM',
    isShared: false,
  });

  // Sample data for preview
  const sampleData: Record<string, string> = {
    '{{contact.firstName}}': 'John',
    '{{contact.lastName}}': 'Smith',
    '{{contact.email}}': 'john.smith@example.com',
    '{{contact.phone}}': '+1 (555) 123-4567',
    '{{contact.company}}': 'Acme Corporation',
    '{{account.name}}': 'Acme Corporation',
    '{{account.website}}': 'www.acme.com',
    '{{opportunity.name}}': 'Enterprise Deal Q1',
    '{{opportunity.amount}}': '$50,000',
    '{{user.name}}': 'Sarah Johnson',
    '{{user.email}}': 'sarah@company.com',
    '{{user.phone}}': '+1 (555) 987-6543',
  };

  // Replace merge fields with sample data for preview
  const getPreviewContent = (content: string) => {
    let preview = content;
    Object.entries(sampleData).forEach(([field, value]) => {
      preview = preview.replace(new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    // Also handle variations without spaces
    Object.entries(sampleData).forEach(([field, value]) => {
      const noSpaceField = field.replace(/\s/g, '');
      preview = preview.replace(new RegExp(noSpaceField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    return preview;
  };

  // Update form when template changes
  React.useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        subject: template.subject || '',
        body: template.bodyHtml || template.body || '',
        category: template.category || 'CUSTOM',
        isShared: template.isShared || false,
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    if (!formData.name || !formData.subject || !formData.body) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onUpdate(template.id, formData);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const insertMergeField = (field: string) => {
    const textarea = document.getElementById('edit-template-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = formData.body.substring(0, start) + field + formData.body.substring(end);
      setFormData({ ...formData, body: newBody });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + field.length, start + field.length);
      }, 0);
    } else {
      setFormData({ ...formData, body: formData.body + field });
    }
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-8 pb-4 shrink-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">Edit Email Template</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-8 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'edit'
                ? 'bg-[#F8F8F6] text-[#1A1A1A] border-b-2 border-[#EAD07D]'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            <Edit3 size={14} className="inline mr-1.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'preview'
                ? 'bg-[#F8F8F6] text-[#1A1A1A] border-b-2 border-[#EAD07D]'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            <Eye size={14} className="inline mr-1.5" />
            Preview
          </button>
        </div>

        {activeTab === 'edit' ? (
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
                  <label className="text-xs font-medium text-[#666] mb-1 block">Template Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Welcome Email"
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#666] mb-1 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  >
                    {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Subject Line *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Hello {{contact.firstName}}!"
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#666]">Email Body *</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#888]">Insert:</span>
                    <div className="relative group">
                      <button
                        type="button"
                        className="text-xs text-[#EAD07D] hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={12} />
                        Merge Field
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-2 hidden group-hover:block z-10 max-h-48 overflow-y-auto">
                        {mergeFields.slice(0, 10).map(field => (
                          <button
                            key={field.key}
                            type="button"
                            onClick={() => insertMergeField(field.key)}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded-lg"
                          >
                            <span className="font-medium">{field.label}</span>
                            <span className="text-[#888] ml-2 text-xs">{field.key}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <textarea
                  id="edit-template-body"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Hi {{contact.firstName}},&#10;&#10;Thank you for your interest in..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none font-mono text-sm"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isShared}
                  onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm text-[#666]">Share with team</span>
              </label>
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
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 pt-6 overflow-y-auto flex-1">
            {/* Preview Header */}
            <div className="mb-4 p-4 bg-[#F8F8F6] rounded-xl">
              <div className="flex items-center gap-2 text-xs text-[#888] mb-2">
                <Mail size={14} />
                Email Preview
              </div>
              <div className="text-sm">
                <span className="text-[#666]">Subject: </span>
                <span className="font-medium text-[#1A1A1A]">{getPreviewContent(formData.subject) || '(No subject)'}</span>
              </div>
            </div>

            {/* Preview Body */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs text-[#888]">Email Body Preview</span>
                <span className="text-xs text-[#888]">Merge fields replaced with sample data</span>
              </div>
              <div className="p-6 bg-white min-h-[300px]">
                {formData.body ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: getPreviewContent(formData.body) }}
                  />
                ) : (
                  <p className="text-[#888] text-center py-12">No content to preview</p>
                )}
              </div>
            </div>

            {/* Sample Data Reference */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-xs font-medium text-blue-700 mb-2">Sample Data Used for Preview:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(sampleData).slice(0, 8).map(([field, value]) => (
                  <div key={field} className="flex items-center gap-2">
                    <code className="text-blue-600">{field}</code>
                    <span className="text-blue-500">=</span>
                    <span className="text-blue-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any)}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const { mergeFields } = useMergeFields();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateEmailTemplateDto>({
    name: '',
    subject: '',
    body: '',
    category: 'CUSTOM',
    isShared: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.body) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreate(formData);
      onClose();
      setFormData({ name: '', subject: '', body: '', category: 'CUSTOM', isShared: false });
    } catch (err) {
      setError((err as Error).message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const insertMergeField = (field: string) => {
    const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = formData.body.substring(0, start) + field + formData.body.substring(end);
      setFormData({ ...formData, body: newBody });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + field.length, start + field.length);
      }, 0);
    } else {
      setFormData({ ...formData, body: formData.body + field });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-8 pb-0 shrink-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Email Template</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
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
                <label className="text-xs font-medium text-[#666] mb-1 block">Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Welcome Email"
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                >
                  {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Subject Line *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Hello {{contact.firstName}}!"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#666]">Email Body *</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#888]">Insert:</span>
                  <div className="relative group">
                    <button
                      type="button"
                      className="text-xs text-[#EAD07D] hover:underline flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      Merge Field
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-2 hidden group-hover:block z-10 max-h-48 overflow-y-auto">
                      {mergeFields.slice(0, 10).map(field => (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => insertMergeField(field.key)}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium">{field.label}</span>
                          <span className="text-[#888] ml-2 text-xs">{field.key}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <textarea
                id="template-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Hi {{contact.firstName}},&#10;&#10;Thank you for your interest in..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none font-mono text-sm"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isShared}
                onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
              />
              <span className="text-sm text-[#666]">Share with team</span>
            </label>
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
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function EmailTemplatesPage() {
  const { templates, stats, loading, error, create, update, remove, clone } = useEmailTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<{ isOpen: boolean; template: EmailTemplate | null }>({
    isOpen: false,
    template: null,
  });

  // Confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; template: EmailTemplate | null }>({
    isOpen: false,
    template: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handle AI-generated template
  const handleAITemplateApply = async (config: Record<string, any>) => {
    try {
      const aiConfig = config as EmailTemplateConfig;

      // Transform AI config to CreateEmailTemplateDto format
      const templateData: CreateEmailTemplateDto = {
        name: aiConfig.name,
        subject: aiConfig.subject,
        body: aiConfig.bodyHtml || aiConfig.bodyText || '',
        category: (aiConfig.category as TemplateCategory) || 'CUSTOM',
        isShared: false,
      };

      await create(templateData);
      // Template created successfully
    } catch (err) {
      console.error('Failed to create template:', err);
      alert((err as Error).message || 'Failed to create template');
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, categoryFilter]);

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      await update(template.id, { isActive: !template.isActive });
    } catch (err) {
      console.error('Failed to toggle template:', err);
    }
  };

  const handleClone = async (template: EmailTemplate) => {
    try {
      await clone(template.id, `${template.name} (Copy)`);
    } catch (err) {
      console.error('Failed to clone template:', err);
    }
  };

  const handleDelete = (template: EmailTemplate) => {
    setDeleteModal({ isOpen: true, template });
  };

  const confirmDelete = async () => {
    if (!deleteModal.template) return;
    setDeleteLoading(true);
    try {
      await remove(deleteModal.template.id);
    } catch (err) {
      console.error('Failed to delete template:', err);
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ isOpen: false, template: null });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Email Templates</h1>
        <p className="text-[#666] mt-1">Create reusable email templates with merge fields</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{stats.total}</p>
            <p className="text-sm text-[#666]">Total Templates</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
            <p className="text-sm text-[#666]">Active</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-blue-600">{stats.shared}</p>
            <p className="text-sm text-[#666]">Shared</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">
              {stats.topTemplates?.[0]?.usageCount || 0}
            </p>
            <p className="text-sm text-[#666]">Most Used</p>
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
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | 'all')}
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] outline-none text-sm"
          >
            <option value="all">All Categories</option>
            {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
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
            New Template
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Templates Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card
              key={template.id}
              className="p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={CATEGORY_COLORS[template.category] as any} size="sm">
                    {TEMPLATE_CATEGORY_LABELS[template.category]}
                  </Badge>
                  {template.isShared && (
                    <span className="text-[#888]" title="Shared with team">
                      <Users size={14} />
                    </span>
                  )}
                </div>
                {!template.isActive && (
                  <Badge variant="neutral" size="sm">Inactive</Badge>
                )}
              </div>

              <h3 className="font-medium text-[#1A1A1A] mb-1">{template.name}</h3>
              <p className="text-sm text-[#666] mb-2 line-clamp-1">{template.subject}</p>
              <p className="text-xs text-[#888] line-clamp-2 mb-4">{template.body}</p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-[#888]">
                  Used {template.usageCount} times
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditModal({ isOpen: true, template })}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-[#666] transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(template)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title={template.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {template.isActive ? (
                      <ToggleRight size={18} className="text-green-600" />
                    ) : (
                      <ToggleLeft size={18} className="text-[#888]" />
                    )}
                  </button>
                  <button
                    onClick={() => handleClone(template)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-[#666] transition-colors"
                    title="Clone"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTemplates.length === 0 && (
        <Card className="p-12 text-center">
          <Mail className="w-12 h-12 text-[#888] mx-auto mb-4" />
          <p className="text-[#666]">No email templates found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-[#1A1A1A] hover:underline"
          >
            Create your first template
          </button>
        </Card>
      )}

      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={create}
      />

      <EditTemplateModal
        isOpen={editModal.isOpen}
        template={editModal.template}
        onClose={() => setEditModal({ isOpen: false, template: null })}
        onUpdate={update}
      />

      <AIBuilderModal
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        entityType={AIBuilderEntityType.EMAIL_TEMPLATE}
        entityLabel="Email Template"
        onApply={handleAITemplateApply}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, template: null })}
        onConfirm={confirmDelete}
        title="Delete Template"
        message={`Are you sure you want to delete "${deleteModal.template?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
