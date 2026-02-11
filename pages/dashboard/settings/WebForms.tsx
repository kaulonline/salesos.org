import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  FileInput,
  Code,
  Eye,
  ToggleLeft,
  ToggleRight,
  Copy,
  Trash2,
  ExternalLink,
  BarChart3,
  Users,
  X,
  AlertCircle,
  Edit3,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings,
  Palette,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmationModal } from '../../../src/components/ui/ConfirmationModal';
import { useWebForms, useWebFormSubmissions } from '../../../src/hooks/useWebForms';
import type { WebForm, CreateWebFormDto, UpdateWebFormDto } from '../../../src/types';
import { AIBuilderModal, AIBuilderTrigger } from '../../../src/components/AIBuilder';
import { AIBuilderEntityType, WebFormConfig } from '../../../src/types/aiBuilder';
import { useToast } from '../../../src/components/ui/Toast';

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateWebFormDto) => Promise<void>;
}

const CreateFormModal: React.FC<CreateFormModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Form name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CreateWebFormDto = {
        name: formData.name,
        description: formData.description,
        fields: [
          { name: 'firstName', label: 'First Name', type: 'TEXT', isRequired: true, mapToField: 'firstName', sortOrder: 1 },
          { name: 'lastName', label: 'Last Name', type: 'TEXT', isRequired: true, mapToField: 'lastName', sortOrder: 2 },
          { name: 'email', label: 'Email', type: 'EMAIL', isRequired: true, mapToField: 'email', sortOrder: 3 },
          { name: 'company', label: 'Company', type: 'TEXT', isRequired: false, mapToField: 'company', sortOrder: 4 },
        ],
        settings: {
          targetEntity: 'LEAD',
          duplicateHandling: 'CREATE_NEW',
          duplicateCheckField: 'email',
          notifyOwner: true,
          autoResponderEnabled: false,
          captchaEnabled: true,
          honeypotEnabled: true,
          successMessage: 'Thank you for your submission!',
          triggerAssignmentRules: true,
          triggerWorkflows: true,
        },
      };
      await onCreate(data);
      onClose();
      setFormData({ name: '', description: '' });
    } catch (err) {
      setError((err as Error).message || 'Failed to create form');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Web Form</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Form Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contact Us Form"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Website contact form for lead capture"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
              />
            </div>

            <p className="text-sm text-[#888]">
              A basic lead capture form will be created with name, email, and company fields.
              You can customize fields and settings after creation.
            </p>
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
              {loading ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EmbedCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: WebForm | null;
}

const EmbedCodeModal: React.FC<EmbedCodeModalProps> = ({ isOpen, onClose, form }) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen || !form) return null;

  const iframeCode = `<iframe src="${window.location.origin}/forms/${form.slug}" width="100%" height="500" frameborder="0"></iframe>`;
  const scriptCode = `<div id="salesos-form-${form.slug}"></div>
<script src="${window.location.origin}/embed/form-widget.js" data-form="${form.slug}"></script>`;
  const directLink = `${window.location.origin}/forms/${form.slug}`;

  const handleCopy = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-8 pb-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">Embed Code</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 pt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#1A1A1A]">iframe Embed</label>
              <button
                onClick={() => handleCopy(iframeCode, 'iframe')}
                className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
              >
                <Copy size={14} />
                {copied === 'iframe' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 bg-[#F8F8F6] rounded-xl text-xs overflow-x-auto">
              {iframeCode}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#1A1A1A]">JavaScript Embed</label>
              <button
                onClick={() => handleCopy(scriptCode, 'script')}
                className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
              >
                <Copy size={14} />
                {copied === 'script' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 bg-[#F8F8F6] rounded-xl text-xs overflow-x-auto whitespace-pre-wrap">
              {scriptCode}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#1A1A1A]">Direct Link</label>
              <button
                onClick={() => handleCopy(directLink, 'link')}
                className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
              >
                <Copy size={14} />
                {copied === 'link' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-3 bg-[#F8F8F6] rounded-xl text-sm flex items-center justify-between">
              <span className="truncate">{directLink}</span>
              <a
                href={directLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[#666] hover:text-[#1A1A1A]"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Field types supported
const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
];

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

interface EditFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: WebForm | null;
  onSave: (id: string, data: UpdateWebFormDto) => Promise<void>;
}

const EditFormModal: React.FC<EditFormModalProps> = ({ isOpen, onClose, form, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'settings' | 'styling'>('fields');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState({
    submitButtonText: 'Submit',
    showLabels: true,
    enableCaptcha: true,
  });
  const [styling, setStyling] = useState({
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    buttonColor: '#EAD07D',
    buttonTextColor: '#1a1a1a',
  });
  const [thankYouMessage, setThankYouMessage] = useState('Thank you for your submission!');

  // Reset form when modal opens with new form data
  useEffect(() => {
    if (form && isOpen) {
      setFormData({
        name: form.name || '',
        description: form.description || '',
      });

      // Parse fields from form
      const formFields = Array.isArray(form.fields)
        ? form.fields.map((f: any) => ({
            name: f.name || '',
            label: f.label || f.name || '',
            type: f.type || 'text',
            required: f.required || false,
            placeholder: f.placeholder || '',
            options: f.options || [],
          }))
        : [];
      setFields(formFields);

      // Parse settings
      const formSettings = form.settings as any || {};
      setSettings({
        submitButtonText: formSettings.submitButtonText || 'Submit',
        showLabels: formSettings.showLabels !== false,
        enableCaptcha: formSettings.enableCaptcha !== false,
      });

      // Parse styling
      const formStyling = form.styling as any || {};
      setStyling({
        backgroundColor: formStyling.backgroundColor || '#ffffff',
        textColor: formStyling.textColor || '#1a1a1a',
        buttonColor: formStyling.buttonColor || '#EAD07D',
        buttonTextColor: formStyling.buttonTextColor || '#1a1a1a',
      });

      setThankYouMessage(formSettings.successMessage || 'Thank you for your submission!');
      setActiveTab('fields');
      setError(null);
    }
  }, [form, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!formData.name) {
      setError('Form name is required');
      return;
    }

    if (fields.length === 0) {
      setError('At least one field is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: UpdateWebFormDto = {
        name: formData.name,
        description: formData.description,
        fields: fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type.toLowerCase(),
          required: f.required,
          placeholder: f.placeholder,
          options: f.options,
        })),
        settings: {
          ...settings,
          successMessage: thankYouMessage,
        },
        styling,
      };

      await onSave(form.id, data);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to update form');
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      name: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type: 'text',
      required: false,
      placeholder: '',
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    // Auto-generate name from label if not manually set
    if (updates.label && !updates.name) {
      newFields[index].name = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    }
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const addOption = (fieldIndex: number) => {
    const newFields = [...fields];
    const options = newFields[fieldIndex].options || [];
    options.push({ label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` });
    newFields[fieldIndex].options = options;
    setFields(newFields);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const newFields = [...fields];
    if (newFields[fieldIndex].options) {
      newFields[fieldIndex].options![optionIndex] = {
        label: value,
        value: value.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      };
    }
    setFields(newFields);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...fields];
    newFields[fieldIndex].options = newFields[fieldIndex].options?.filter((_, i) => i !== optionIndex);
    setFields(newFields);
  };

  if (!isOpen || !form) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">Edit Form</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {[
            { id: 'fields', label: 'Fields', icon: FileInput },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'styling', label: 'Styling', icon: Palette },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#666] hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Basic Info - Always visible */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Form Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>
          </div>

          {/* Fields Tab */}
          {activeTab === 'fields' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#1A1A1A]">Form Fields</h3>
                <button
                  type="button"
                  onClick={addField}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#EAD07D] text-[#1A1A1A] rounded-full hover:bg-[#d4bc6c] transition-colors"
                >
                  <Plus size={14} />
                  Add Field
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 text-[#888]">
                  <FileInput className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No fields yet. Add your first field.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="flex items-start gap-3">
                        {/* Drag handle & reorder */}
                        <div className="flex flex-col gap-1 pt-2">
                          <button
                            type="button"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-[#888] hover:text-[#1A1A1A] disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === fields.length - 1}
                            className="p-1 text-[#888] hover:text-[#1A1A1A] disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        {/* Field config */}
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-[#888] mb-1 block">Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#888] mb-1 block">Type</label>
                              <select
                                value={field.type}
                                onChange={(e) => updateField(index, { type: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] outline-none"
                              >
                                {FIELD_TYPES.map(t => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-[#888] mb-1 block">Placeholder</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] outline-none"
                              />
                            </div>
                            <div className="flex items-end pb-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required || false}
                                  onChange={(e) => updateField(index, { required: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                                />
                                <span className="text-sm text-[#666]">Required</span>
                              </label>
                            </div>
                          </div>

                          {/* Options for select/radio fields */}
                          {(field.type === 'select' || field.type === 'radio') && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-[#888]">Options</label>
                                <button
                                  type="button"
                                  onClick={() => addOption(index)}
                                  className="text-xs text-[#EAD07D] hover:underline"
                                >
                                  + Add Option
                                </button>
                              </div>
                              <div className="space-y-2">
                                {(field.options || []).map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={opt.label}
                                      onChange={(e) => updateOption(index, optIdx, e.target.value)}
                                      className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-gray-50 border border-gray-200 focus:border-[#EAD07D] outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeOption(index, optIdx)}
                                      className="p-1 text-[#888] hover:text-red-500"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="p-2 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Submit Button Text</label>
                <input
                  type="text"
                  value={settings.submitButtonText}
                  onChange={(e) => setSettings({ ...settings, submitButtonText: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Thank You Message</label>
                <textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showLabels}
                    onChange={(e) => setSettings({ ...settings, showLabels: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#1A1A1A]">Show field labels</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableCaptcha}
                    onChange={(e) => setSettings({ ...settings, enableCaptcha: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#1A1A1A]">Enable CAPTCHA protection</span>
                </label>
              </div>
            </div>
          )}

          {/* Styling Tab */}
          {activeTab === 'styling' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#666] mb-1 block">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={styling.backgroundColor}
                      onChange={(e) => setStyling({ ...styling, backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styling.backgroundColor}
                      onChange={(e) => setStyling({ ...styling, backgroundColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#666] mb-1 block">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={styling.textColor}
                      onChange={(e) => setStyling({ ...styling, textColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styling.textColor}
                      onChange={(e) => setStyling({ ...styling, textColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#666] mb-1 block">Button Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={styling.buttonColor}
                      onChange={(e) => setStyling({ ...styling, buttonColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styling.buttonColor}
                      onChange={(e) => setStyling({ ...styling, buttonColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#666] mb-1 block">Button Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={styling.buttonTextColor}
                      onChange={(e) => setStyling({ ...styling, buttonTextColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styling.buttonTextColor}
                      onChange={(e) => setStyling({ ...styling, buttonTextColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 border border-gray-200 rounded-xl">
                <p className="text-xs text-[#888] mb-3">Preview</p>
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: styling.backgroundColor }}
                >
                  <p className="text-sm mb-2" style={{ color: styling.textColor }}>
                    Sample field label
                  </p>
                  <div className="h-10 bg-gray-100 rounded-lg mb-3" />
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: styling.buttonColor,
                      color: styling.buttonTextColor
                    }}
                  >
                    {settings.submitButtonText}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0 border-t border-gray-100 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function WebFormsPage() {
  const { forms, stats, loading, error, create, update, activate, deactivate, clone, remove } = useWebForms();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [embedForm, setEmbedForm] = useState<WebForm | null>(null);
  const [editForm, setEditForm] = useState<WebForm | null>(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; form: WebForm | null }>({
    isOpen: false,
    form: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handle AI-generated form
  const handleAIFormApply = async (config: Record<string, any>) => {
    try {
      const aiConfig = config as WebFormConfig;

      // Transform AI config to CreateWebFormDto format
      // Backend expects: name, label, type (lowercase), required, placeholder, options: [{label, value}]
      const formData: CreateWebFormDto = {
        name: aiConfig.name,
        description: aiConfig.description,
        fields: aiConfig.fields?.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type.toLowerCase() as any, // Backend expects lowercase type
          required: field.required || false,     // Use 'required' not 'isRequired'
          placeholder: field.placeholder,
          options: field.options, // Pass through as-is: [{label, value}]
        })) || [],
        settings: {
          submitButtonText: aiConfig.settings?.submitButtonText || 'Submit',
          showLabels: aiConfig.settings?.showLabels !== false,
          showPlaceholders: aiConfig.settings?.showPlaceholders !== false,
          enableCaptcha: aiConfig.settings?.enableCaptcha ?? true,
          doubleOptIn: aiConfig.settings?.doubleOptIn || false,
        },
        styling: {
          backgroundColor: aiConfig.styling?.backgroundColor,
          textColor: aiConfig.styling?.textColor,
          buttonColor: aiConfig.styling?.buttonColor,
          buttonTextColor: aiConfig.styling?.buttonTextColor,
          borderRadius: aiConfig.styling?.borderRadius,
        },
        thankYouMessage: aiConfig.thankYouMessage || 'Thank you for your submission!',
        redirectUrl: aiConfig.redirectUrl,
      };

      await create(formData);
      // Form created successfully, list will refresh automatically
      showToast({ type: 'success', title: 'Web Form Created from AI' });
    } catch (err) {
      console.error('Failed to create form:', err);
      showToast({ type: 'error', title: 'Failed to Create Form', message: (err as Error).message || 'Please try again' });
    }
  };

  const filteredForms = useMemo(() => {
    return forms.filter(form =>
      form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [forms, searchQuery]);

  const handleToggle = async (form: WebForm) => {
    try {
      if (form.isActive) {
        await deactivate(form.id);
      } else {
        await activate(form.id);
      }
      showToast({ type: 'success', title: form.isActive ? 'Form Deactivated' : 'Form Activated' });
    } catch (err) {
      console.error('Failed to toggle form:', err);
      showToast({ type: 'error', title: 'Failed to Toggle Form', message: (err as Error).message || 'Please try again' });
    }
  };

  const handleClone = async (form: WebForm) => {
    try {
      await clone(form.id, `${form.name} (Copy)`);
      showToast({ type: 'success', title: 'Form Cloned' });
    } catch (err) {
      console.error('Failed to clone form:', err);
      showToast({ type: 'error', title: 'Failed to Clone Form', message: (err as Error).message || 'Please try again' });
    }
  };

  const handleDelete = (form: WebForm) => {
    setDeleteModal({ isOpen: true, form });
  };

  const confirmDelete = async () => {
    if (!deleteModal.form) return;
    setDeleteLoading(true);
    try {
      await remove(deleteModal.form.id);
      showToast({ type: 'success', title: 'Form Deleted' });
    } catch (err) {
      console.error('Failed to delete form:', err);
      showToast({ type: 'error', title: 'Failed to Delete Form', message: (err as Error).message || 'Please try again' });
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ isOpen: false, form: null });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Web Forms</h1>
        <p className="text-[#666] mt-1">Create embeddable forms to capture leads from your website</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{stats.total || 0}</p>
            <p className="text-sm text-[#666]">Total Forms</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-green-600">{stats.active || 0}</p>
            <p className="text-sm text-[#666]">Active</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-blue-600">{stats.totalSubmissions || 0}</p>
            <p className="text-sm text-[#666]">Total Submissions</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#EAD07D]">
              {((stats.averageConversionRate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-[#666]">Avg Conversion</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
          <input
            type="text"
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
          />
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
            New Form
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
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

      {/* Forms Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map(form => (
            <Card key={form.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <FileInput size={20} className="text-[#1A1A1A]" />
                </div>
                <Badge variant={form.isActive ? 'green' : 'neutral'} size="sm">
                  {form.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <h3 className="font-medium text-[#1A1A1A] mb-1">{form.name}</h3>
              {form.description && (
                <p className="text-sm text-[#666] mb-3 line-clamp-2">{form.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-[#888] mb-4">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {form.submissions} submissions
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 size={14} />
                  {(form.conversionRate * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => setEmbedForm(form)}
                  className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
                >
                  <Code size={14} />
                  Get Code
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditForm(form)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-[#666] transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleToggle(form)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title={form.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {form.isActive ? (
                      <ToggleRight size={18} className="text-green-600" />
                    ) : (
                      <ToggleLeft size={18} className="text-[#888]" />
                    )}
                  </button>
                  <button
                    onClick={() => handleClone(form)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-[#666] transition-colors"
                    title="Clone"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(form)}
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
      {!loading && filteredForms.length === 0 && (
        <Card className="p-12 text-center">
          <FileInput className="w-12 h-12 text-[#888] mx-auto mb-4" />
          <p className="text-[#666]">No web forms found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-[#1A1A1A] hover:underline"
          >
            Create your first form
          </button>
        </Card>
      )}

      <CreateFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={create}
      />

      <EmbedCodeModal
        isOpen={!!embedForm}
        onClose={() => setEmbedForm(null)}
        form={embedForm}
      />

      <AIBuilderModal
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        entityType={AIBuilderEntityType.WEB_FORM}
        entityLabel="Web Form"
        onApply={handleAIFormApply}
      />

      <EditFormModal
        isOpen={!!editForm}
        onClose={() => setEditForm(null)}
        form={editForm}
        onSave={update}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, form: null })}
        onConfirm={confirmDelete}
        title="Delete Form"
        message={`Are you sure you want to delete "${deleteModal.form?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
