import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Calendar,
  Package,
  FileText,
  AlertCircle,
  CheckCircle,
  Send,
  Save,
} from 'lucide-react';
import { useCreateRegistration, useSubmitRegistration } from '../../src/hooks/usePortal';
import type { CreateDealRegistrationDto } from '../../src/types/portal';

const PRODUCT_OPTIONS = [
  'Enterprise Platform',
  'Professional Services',
  'Analytics Suite',
  'Integration Package',
  'Support & Maintenance',
  'Custom Development',
];

export function NewRegistration() {
  const navigate = useNavigate();
  const createMutation = useCreateRegistration();
  const submitMutation = useSubmitRegistration();

  const [formData, setFormData] = useState<CreateDealRegistrationDto>({
    accountName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactTitle: '',
    estimatedValue: undefined,
    estimatedCloseDate: '',
    productInterest: [],
    useCase: '',
    competitorInfo: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitType, setSubmitType] = useState<'draft' | 'submit'>('draft');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (type: 'draft' | 'submit') => {
    if (!validateForm()) return;

    setSubmitType(type);

    try {
      // First create the registration
      const registration = await createMutation.mutateAsync(formData);

      // If submitting, also submit it for approval
      if (type === 'submit') {
        await submitMutation.mutateAsync(registration.id);
      }

      navigate('/portal/registrations');
    } catch (error) {
      console.error('Failed to create registration:', error);
    }
  };

  const handleProductToggle = (product: string) => {
    setFormData((prev) => ({
      ...prev,
      productInterest: prev.productInterest?.includes(product)
        ? prev.productInterest.filter((p) => p !== product)
        : [...(prev.productInterest || []), product],
    }));
  };

  const isSubmitting = createMutation.isPending || submitMutation.isPending;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/portal/registrations')}
            className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Registrations
          </button>
          <h1 className="text-3xl font-light text-[#1A1A1A]">Register a New Deal</h1>
          <p className="text-[#666] mt-1">
            Submit a deal registration to protect your opportunity
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5">
          {/* Account Information */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-[#EAD07D]" />
              Account Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="Enter the company name"
                  className={`w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 ${
                    errors.accountName ? 'border-red-300' : 'border-transparent'
                  } focus:bg-white focus:border-[#EAD07D] outline-none text-sm`}
                />
                {errors.accountName && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.accountName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
              <User size={20} className="text-[#EAD07D]" />
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Full name"
                  className={`w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 ${
                    errors.contactName ? 'border-red-300' : 'border-transparent'
                  } focus:bg-white focus:border-[#EAD07D] outline-none text-sm`}
                />
                {errors.contactName && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.contactName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Job Title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                  <input
                    type="text"
                    value={formData.contactTitle || ''}
                    onChange={(e) => setFormData({ ...formData, contactTitle: e.target.value })}
                    placeholder="e.g., VP of Sales"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="email@company.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8F8F6] border-2 ${
                      errors.contactEmail ? 'border-red-300' : 'border-transparent'
                    } focus:bg-white focus:border-[#EAD07D] outline-none text-sm`}
                  />
                </div>
                {errors.contactEmail && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.contactEmail}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                  <input
                    type="tel"
                    value={formData.contactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Deal Information */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-[#EAD07D]" />
              Deal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Estimated Deal Value
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                  <input
                    type="number"
                    value={formData.estimatedValue || ''}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Expected Close Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                  <input
                    type="date"
                    value={formData.estimatedCloseDate || ''}
                    onChange={(e) => setFormData({ ...formData, estimatedCloseDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Interest */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Package size={20} className="text-[#EAD07D]" />
              Product Interest
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_OPTIONS.map((product) => (
                <button
                  key={product}
                  type="button"
                  onClick={() => handleProductToggle(product)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.productInterest?.includes(product)
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-[#F8F8F6] text-[#666] hover:bg-[#EAD07D]/20'
                  }`}
                >
                  {formData.productInterest?.includes(product) && (
                    <CheckCircle size={14} className="inline mr-1.5" />
                  )}
                  {product}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
              <FileText size={20} className="text-[#EAD07D]" />
              Additional Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Use Case / Business Need
                </label>
                <textarea
                  value={formData.useCase || ''}
                  onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                  placeholder="Describe the customer's business need or use case..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Competitor Information
                </label>
                <textarea
                  value={formData.competitorInfo || ''}
                  onChange={(e) => setFormData({ ...formData, competitorInfo: e.target.value })}
                  placeholder="Any known competitors in the deal?"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any other relevant information..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] outline-none text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-black/5">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-black/10 text-[#666] hover:bg-[#F8F8F6] transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting && submitType === 'draft' ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('submit')}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Send size={18} />
              {isSubmitting && submitType === 'submit' ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-[#999] text-center mt-4">
            Drafts can be edited later. Submitted registrations are reviewed within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NewRegistration;
