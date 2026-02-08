import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Command, X, AlertCircle, CheckCircle2, Loader2, Building2, User, Mail, Phone, Briefcase, Globe, MessageSquare } from 'lucide-react';
import { accessRequestsApi } from '../src/api/access-requests';
import {
  COMPANY_SIZES,
  INDUSTRIES,
  INTERESTS,
  REQUEST_TYPES,
  HOW_HEARD_OPTIONS,
  isBusinessEmail,
  type CreateAccessRequestDto,
  type AccessRequestType,
} from '../src/types/access-request';

export const RequestAccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form state
  const [formData, setFormData] = useState<CreateAccessRequestDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    jobTitle: '',
    companySize: '',
    industry: '',
    website: '',
    requestType: 'FREE_TRIAL',
    interests: [],
    message: '',
    howHeard: '',
    utmSource: searchParams.get('utm_source') || undefined,
    utmMedium: searchParams.get('utm_medium') || undefined,
    utmCampaign: searchParams.get('utm_campaign') || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Clear field error when value changes
  const handleChange = (field: keyof CreateAccessRequestDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (submitError) setSubmitError('');
  };

  // Handle interest checkbox toggle
  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests?.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...(prev.interests || []), interest],
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!isBusinessEmail(formData.email)) {
      newErrors.email = 'Please use your work email address';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.companySize) {
      newErrors.companySize = 'Please select company size';
    }

    if (!formData.interests || formData.interests.length === 0) {
      newErrors.interests = 'Please select at least one area of interest';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await accessRequestsApi.submit(formData);
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-[#93C01F]" />
          </div>
          <h1 className="text-3xl font-medium text-[#1A1A1A] mb-3">Request Submitted!</h1>
          <p className="text-[#666] mb-8">
            Thank you for your interest in SalesOS. Our team will review your request and get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="px-6 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
            >
              Back to Home
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium"
            >
              Already have a code? Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex p-4 md:p-6 relative overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Close Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-[#1A1A1A] hover:bg-white transition-colors shadow-sm"
      >
        <X size={20} />
      </button>

      {/* Form Column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-start py-8 px-4 md:px-12 lg:px-16 relative z-10 overflow-y-auto max-h-screen">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 w-fit">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS
          </span>
        </Link>

        <div className="max-w-lg w-full mx-auto lg:mx-0">
          <h1 className="text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-3">Request Access</h1>
          <p className="text-[#666] mb-8">
            Tell us about yourself and we'll get you set up with SalesOS
          </p>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span className="text-sm">{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Contact Information */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <User size={16} className="text-[#EAD07D]" />
                Contact Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="John"
                    className={`w-full px-4 py-3 rounded-xl bg-white border ${errors.firstName ? 'border-red-300' : 'border-transparent'} focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm`}
                    disabled={isSubmitting}
                  />
                  {errors.firstName && <p className="text-xs text-red-500 ml-1">{errors.firstName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Doe"
                    className={`w-full px-4 py-3 rounded-xl bg-white border ${errors.lastName ? 'border-red-300' : 'border-transparent'} focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm`}
                    disabled={isSubmitting}
                  />
                  {errors.lastName && <p className="text-xs text-red-500 ml-1">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#666] ml-1">Work Email *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john@company.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white border ${errors.email ? 'border-red-300' : 'border-transparent'} focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#666] ml-1">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Section: Company Information */}
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <Building2 size={16} className="text-[#EAD07D]" />
                Company Information
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#666] ml-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Acme Inc."
                  className={`w-full px-4 py-3 rounded-xl bg-white border ${errors.companyName ? 'border-red-300' : 'border-transparent'} focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm`}
                  disabled={isSubmitting}
                />
                {errors.companyName && <p className="text-xs text-red-500 ml-1">{errors.companyName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => handleChange('jobTitle', e.target.value)}
                      placeholder="Sales Director"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Company Size *</label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => handleChange('companySize', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white border ${errors.companySize ? 'border-red-300' : 'border-transparent'} focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] text-sm appearance-none cursor-pointer`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map(size => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                  {errors.companySize && <p className="text-xs text-red-500 ml-1">{errors.companySize}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Industry</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] text-sm appearance-none cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Website</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder="https://company.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Interest & Request Type */}
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={16} className="text-[#EAD07D]" />
                Interest
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#666] ml-1">I'm interested in... *</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(interest => (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => toggleInterest(interest.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.interests?.includes(interest.value)
                          ? 'bg-[#EAD07D] text-[#1A1A1A]'
                          : 'bg-white text-[#666] hover:bg-[#F8F8F6]'
                      }`}
                      disabled={isSubmitting}
                    >
                      {interest.label}
                    </button>
                  ))}
                </div>
                {errors.interests && <p className="text-xs text-red-500 ml-1">{errors.interests}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Request Type</label>
                  <select
                    value={formData.requestType}
                    onChange={(e) => handleChange('requestType', e.target.value as AccessRequestType)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] text-sm appearance-none cursor-pointer"
                    disabled={isSubmitting}
                  >
                    {REQUEST_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">How did you hear about us?</label>
                  <select
                    value={formData.howHeard}
                    onChange={(e) => handleChange('howHeard', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] text-sm appearance-none cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <option value="">Select option</option>
                    {HOW_HEARD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#666] ml-1">Message (Optional)</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Tell us about your needs or any questions you have..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 text-sm resize-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Request Access'
              )}
            </button>

            {/* Footer Links */}
            <div className="flex justify-between items-center text-sm pt-2">
              <div className="text-[#666]">
                Already have a code?{' '}
                <Link to="/signup" className="text-[#1A1A1A] underline font-medium hover:text-[#EAD07D] transition-colors">
                  Sign up
                </Link>
              </div>
              <Link to="/login" className="text-[#666] underline hover:text-[#1A1A1A] transition-colors">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column - Image & Social Proof */}
      <div className="hidden lg:block w-1/2 relative">
        <div className="absolute inset-0 bg-[#1A1A1A] rounded-[2.5rem] overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-64 h-64 border border-[#EAD07D] rounded-full"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 border border-[#EAD07D] rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#EAD07D]/50 rounded-full"></div>
          </div>

          {/* Content */}
          <div className="relative h-full flex flex-col justify-center px-12 py-16">
            <div className="mb-8">
              <span className="inline-block px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] mb-6">
                Join 1,000+ Sales Teams
              </span>
              <h2 className="text-4xl font-light text-white mb-4">
                Transform Your Sales Process with AI
              </h2>
              <p className="text-white/60 text-lg">
                SalesOS helps teams close more deals faster with AI-powered insights, coaching, and automation.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div>
                <div className="text-3xl font-light text-[#EAD07D]">40%</div>
                <div className="text-white/60 text-sm">Increase in Win Rate</div>
              </div>
              <div>
                <div className="text-3xl font-light text-[#EAD07D]">2.5x</div>
                <div className="text-white/60 text-sm">Pipeline Growth</div>
              </div>
              <div>
                <div className="text-3xl font-light text-[#EAD07D]">30%</div>
                <div className="text-white/60 text-sm">Time Saved</div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <p className="text-white/80 italic mb-4">
                "SalesOS has completely transformed how our team operates. The AI insights alone have helped us close 40% more deals this quarter."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#EAD07D] font-bold">
                  JD
                </div>
                <div>
                  <div className="text-white font-medium">James Davidson</div>
                  <div className="text-white/60 text-sm">VP Sales, TechCorp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestAccess;
