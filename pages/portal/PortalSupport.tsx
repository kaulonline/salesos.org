import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  Zap,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { usePortalProfile } from '../../src/hooks/usePortal';
import { useAuth } from '../../src/context/AuthContext';

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'general' | 'deal_registration' | 'commission' | 'technical' | 'account';

interface SupportFormData {
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
}

export const PortalSupport: React.FC = () => {
  const { data: profile } = usePortalProfile();
  const { user } = useAuth();
  const [formData, setFormData] = useState<SupportFormData>({
    category: 'general',
    priority: 'medium',
    subject: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'deal_registration', label: 'Deal Registration' },
    { value: 'commission', label: 'Commissions & Payments' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'account', label: 'Account & Access' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', description: 'General questions, no urgency' },
    { value: 'medium', label: 'Medium', description: 'Standard request' },
    { value: 'high', label: 'High', description: 'Affecting active deals' },
    { value: 'urgent', label: 'Urgent', description: 'Critical business impact' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Simulate API call - in production this would call the backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit support request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-[#93C01F]" />
            </div>
            <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Request Submitted</h2>
            <p className="text-[#666] mb-6">
              Thank you for contacting us. We've received your support request and will respond
              within 24-48 hours based on your priority level.
            </p>
            <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-[#666]">
                <strong className="text-[#1A1A1A]">Reference:</strong> SR-{Date.now().toString(36).toUpperCase()}
              </p>
              <p className="text-sm text-[#666] mt-1">
                <strong className="text-[#1A1A1A]">Subject:</strong> {formData.subject}
              </p>
              <p className="text-sm text-[#666] mt-1">
                <strong className="text-[#1A1A1A]">Priority:</strong> {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link
                to="/portal"
                className="px-6 py-2.5 rounded-full border border-black/10 text-[#666] font-medium text-sm hover:bg-[#F8F8F6] transition-colors"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    category: 'general',
                    priority: 'medium',
                    subject: '',
                    description: '',
                  });
                }}
                className="px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/portal"
            className="inline-flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Contact Support</h1>
          <p className="text-[#666] mt-1">Get help from our partner support team</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Options */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center">
                  <Mail size={20} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1A1A]">Email Support</h3>
                  <p className="text-sm text-[#666] mt-0.5">partners@salesos.org</p>
                  <p className="text-xs text-[#888] mt-1">Response within 24 hours</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center">
                  <Phone size={20} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1A1A]">Phone Support</h3>
                  <p className="text-sm text-[#666] mt-0.5">+1 (888) 555-0123</p>
                  <p className="text-xs text-[#888] mt-1">Mon-Fri, 9AM-6PM EST</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center">
                  <Clock size={20} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1A1A]">Response Times</h3>
                  <div className="text-sm text-[#666] mt-1 space-y-1">
                    <p>Urgent: 4 hours</p>
                    <p>High: 8 hours</p>
                    <p>Medium: 24 hours</p>
                    <p>Low: 48 hours</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Links */}
            <Card className="p-5 bg-[#F8F8F6]">
              <h3 className="font-medium text-[#1A1A1A] mb-3">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  to="/portal/help"
                  className="flex items-center gap-2 text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
                >
                  <HelpCircle size={16} />
                  Help Center & FAQs
                </Link>
                <Link
                  to="/portal/agreement"
                  className="flex items-center gap-2 text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
                >
                  <FileText size={16} />
                  Partner Agreement
                </Link>
                <Link
                  to="/portal/registrations"
                  className="flex items-center gap-2 text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
                >
                  <Zap size={16} />
                  Deal Registrations
                </Link>
              </div>
            </Card>
          </div>

          {/* Support Form */}
          <Card className="lg:col-span-2 p-6">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-6">Submit a Support Request</h2>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2 mb-6">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Pre-filled Info */}
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-xs text-[#888] mb-2">Submitting as:</p>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {user?.firstName} {user?.lastName} ({user?.email})
                </p>
                {profile?.partner && (
                  <p className="text-sm text-[#666]">{profile.partner.companyName}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {priorities.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: p.value as TicketPriority }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.priority === p.value
                          ? 'bg-[#1A1A1A] text-white'
                          : 'bg-[#F8F8F6] text-[#666] hover:bg-[#F0EBD8]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#888] mt-1.5">
                  {priorities.find(p => p.value === formData.priority)?.description}
                </p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Brief summary of your request"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Please provide as much detail as possible..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                  required
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || !formData.subject || !formData.description}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PortalSupport;
