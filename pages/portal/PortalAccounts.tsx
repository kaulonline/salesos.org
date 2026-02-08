import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  Globe,
  Briefcase,
  Shield,
  Calendar,
  ExternalLink,
  ChevronRight,
  Plus,
  Info,
  X,
  Mail,
  Phone,
  User,
  Send,
  CheckCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { usePortalAccounts, usePortalProfile } from '../../src/hooks/usePortal';

const ACCOUNT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PROSPECT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  CUSTOMER: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]' },
  PARTNER: { bg: 'bg-purple-100', text: 'text-purple-700' },
  COMPETITOR: { bg: 'bg-red-100', text: 'text-red-600' },
  OTHER: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export function PortalAccounts() {
  const [search, setSearch] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubject, setContactSubject] = useState('Account Access Request');
  const [isSending, setIsSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const { data: accounts, isLoading } = usePortalAccounts(search || undefined);
  const { data: profile } = usePortalProfile();

  const filteredAccounts = accounts?.filter((pa) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      pa.account.name.toLowerCase().includes(searchLower) ||
      pa.account.industry?.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Assigned Accounts</h1>
            <p className="text-[#666] mt-1">Accounts you're authorized to work with</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#EAD07D]/10 rounded-[24px] p-5 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <p className="font-medium text-[#1A1A1A]">About Assigned Accounts</p>
            <p className="text-sm text-[#666] mt-1">
              These accounts have been assigned to your partner organization. You can register deals
              for these accounts with faster approval times. Exclusive assignments give you protected
              territory rights.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
            <input
              type="text"
              placeholder="Search accounts by name or industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
            />
          </div>
        </div>

        {/* Accounts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-[24px] animate-pulse" />
            ))}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-[32px] shadow-sm border border-black/5 p-12">
            <div className="text-center">
              <Building2 size={48} className="text-[#999] mx-auto mb-4 opacity-40" />
              <p className="text-[#666] text-lg">No assigned accounts</p>
              <p className="text-sm text-[#999] mt-1">
                {search
                  ? 'No accounts match your search'
                  : (
                    <>
                      <button
                        onClick={() => setShowContactModal(true)}
                        className="text-[#1A1A1A] underline hover:text-[#EAD07D] transition-colors"
                      >
                        Contact your partner manager
                      </button>
                      {' '}to get accounts assigned
                    </>
                  )}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((pa) => {
              const typeColor = ACCOUNT_TYPE_COLORS[pa.account.type || 'OTHER'] || ACCOUNT_TYPE_COLORS.OTHER;
              return (
                <div
                  key={pa.id}
                  className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5 hover:border-[#EAD07D] transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-[#1A1A1A] font-semibold text-lg">
                      {pa.account.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      {pa.isExclusive && (
                        <span className="px-2.5 py-1 rounded-full bg-[#EAD07D]/20 text-xs font-medium text-[#1A1A1A] flex items-center gap-1">
                          <Shield size={12} />
                          Exclusive
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColor.bg} ${typeColor.text}`}>
                        {pa.account.type || 'Account'}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-medium text-[#1A1A1A] text-lg mb-1">{pa.account.name}</h3>

                  <div className="space-y-2 mb-4">
                    {pa.account.industry && (
                      <p className="text-sm text-[#666] flex items-center gap-2">
                        <Briefcase size={14} className="text-[#999]" />
                        {pa.account.industry}
                      </p>
                    )}
                    {pa.account.website && (
                      <a
                        href={pa.account.website.startsWith('http') ? pa.account.website : `https://${pa.account.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-2"
                      >
                        <Globe size={14} className="text-[#999]" />
                        {pa.account.website.replace(/^https?:\/\//, '')}
                        <ExternalLink size={12} />
                      </a>
                    )}
                    <p className="text-sm text-[#666] flex items-center gap-2">
                      <Calendar size={14} className="text-[#999]" />
                      Assigned {new Date(pa.assignedAt).toLocaleDateString()}
                    </p>
                    {pa.expiresAt && (
                      <p className="text-sm text-orange-600 flex items-center gap-2">
                        <Calendar size={14} />
                        Expires {new Date(pa.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {pa.notes && (
                    <p className="text-xs text-[#999] bg-[#F8F8F6] rounded-lg p-2 mb-4">
                      {pa.notes}
                    </p>
                  )}

                  <Link
                    to={`/portal/registrations/new?accountId=${pa.accountId}&accountName=${encodeURIComponent(pa.account.name)}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#F8F8F6] text-[#1A1A1A] hover:bg-[#EAD07D]/20 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    Register Deal
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#666]">
            Need access to more accounts?{' '}
            <button
              onClick={() => setShowContactModal(true)}
              className="text-[#1A1A1A] underline hover:text-[#EAD07D] transition-colors"
            >
              Contact your partner manager
            </button>
          </p>
        </div>

        {/* Contact Partner Manager Modal */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-8 pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <MessageSquare size={22} className="text-[#1A1A1A]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-[#1A1A1A]">Contact Partner Manager</h2>
                    <p className="text-sm text-[#666] mt-0.5">Request account access or ask questions</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    setContactMessage('');
                    setContactSubject('Account Access Request');
                    setMessageSent(false);
                  }}
                  className="w-10 h-10 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:text-[#1A1A1A] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 pt-6">
                {messageSent ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-[#93C01F]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Message Sent!</h3>
                    <p className="text-sm text-[#666] mb-6">
                      Your partner manager will get back to you within 1-2 business days.
                    </p>
                    <button
                      onClick={() => {
                        setShowContactModal(false);
                        setContactMessage('');
                        setContactSubject('Account Access Request');
                        setMessageSent(false);
                      }}
                      className="px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Partner Manager Info */}
                    {profile?.partner?.partnerManager ? (
                      <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6">
                        <p className="text-xs text-[#888] mb-2">Your Partner Manager</p>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-semibold text-lg">
                            {profile.partner.partnerManager.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-[#1A1A1A]">{profile.partner.partnerManager.name}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <a
                                href={`mailto:${profile.partner.partnerManager.email}`}
                                className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
                              >
                                <Mail size={14} />
                                {profile.partner.partnerManager.email}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6">
                        <p className="text-xs text-[#888] mb-2">Partner Support</p>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A]">
                            <User size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-[#1A1A1A]">Partner Support Team</p>
                            <a
                              href="mailto:partners@salesos.org"
                              className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1 mt-1"
                            >
                              <Mail size={14} />
                              partners@salesos.org
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-6">
                      <a
                        href={`mailto:${profile?.partner?.partnerManager?.email || 'partners@salesos.org'}?subject=${encodeURIComponent(contactSubject)}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8F8F6] text-[#1A1A1A] hover:bg-[#EAD07D]/20 transition-colors text-sm font-medium"
                      >
                        <Mail size={16} />
                        Send Email
                      </a>
                      <a
                        href="tel:+18885550123"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8F8F6] text-[#1A1A1A] hover:bg-[#EAD07D]/20 transition-colors text-sm font-medium"
                      >
                        <Phone size={16} />
                        Call Support
                      </a>
                    </div>

                    {/* Message Form */}
                    <div className="border-t border-black/5 pt-6">
                      <p className="text-sm font-medium text-[#1A1A1A] mb-4">Or send a message directly</p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#666] mb-1.5">Subject</label>
                          <select
                            value={contactSubject}
                            onChange={(e) => setContactSubject(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                          >
                            <option value="Account Access Request">Account Access Request</option>
                            <option value="New Account Assignment">New Account Assignment</option>
                            <option value="Territory Question">Territory Question</option>
                            <option value="Deal Registration Help">Deal Registration Help</option>
                            <option value="Commission Inquiry">Commission Inquiry</option>
                            <option value="General Question">General Question</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#666] mb-1.5">Message</label>
                          <textarea
                            value={contactMessage}
                            onChange={(e) => setContactMessage(e.target.value)}
                            placeholder="Describe the accounts you need access to or your question..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6">
                      <button
                        onClick={() => {
                          setShowContactModal(false);
                          setContactMessage('');
                          setContactSubject('Account Access Request');
                        }}
                        className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] font-medium text-sm hover:bg-[#F8F8F6] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          setIsSending(true);
                          // Simulate sending message - in production this would call an API
                          await new Promise(resolve => setTimeout(resolve, 1500));
                          setIsSending(false);
                          setMessageSent(true);
                        }}
                        disabled={isSending || !contactMessage.trim()}
                        className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSending ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Send Message
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PortalAccounts;
