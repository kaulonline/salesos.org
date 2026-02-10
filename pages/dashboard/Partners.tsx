import React, { useState } from 'react';
import { Search, Plus, Handshake, Users, DollarSign, FileText, X, Loader2, Trash2, Edit2, Check, AlertCircle, Building2, Clock, CheckCircle, XCircle, ArrowRight, Sparkles, BarChart3, Lightbulb, TrendingUp, Target, Zap, Mail, UserPlus } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { usePartners, useDealRegistrations, usePartner } from '../../src/hooks/usePartners';
import { useAuth } from '../../src/context/AuthContext';
import { partnersApi, partnersAIApi } from '../../src/api/partners';
import type {
  Partner,
  CreatePartnerDto,
  UpdatePartnerDto,
  DealRegistration,
  PartnerStatus,
  PartnerTier,
  PartnerType,
} from '../../src/types/partner';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TIER_LABELS,
  TIER_COLORS,
  TYPE_LABELS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_COLORS,
} from '../../src/types/partner';

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

export const Partners: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [viewingPartner, setViewingPartner] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'partners' | 'registrations'>('partners');
  const [scoringRegistration, setScoringRegistration] = useState<string | null>(null);
  const [registrationScores, setRegistrationScores] = useState<Record<string, any>>({});
  const [loadingInsights, setLoadingInsights] = useState<string | null>(null);
  const [partnerInsights, setPartnerInsights] = useState<Record<string, any>>({});
  const [processingAutoApprovals, setProcessingAutoApprovals] = useState(false);
  const [autoApprovalResults, setAutoApprovalResults] = useState<any>(null);

  // Reject registration modal state
  const [rejectingRegistration, setRejectingRegistration] = useState<{ partnerId: string; registrationId: string; accountName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Invite user state
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null); // partnerId
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteIsPrimary, setInviteIsPrimary] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleScoreRegistration = async (partnerId: string, registrationId: string) => {
    setScoringRegistration(registrationId);
    try {
      const score = await partnersAIApi.scoreDealRegistration(partnerId, registrationId);
      setRegistrationScores(prev => ({ ...prev, [registrationId]: score }));
    } catch (error) {
      console.error('Failed to score registration:', error);
    } finally {
      setScoringRegistration(null);
    }
  };

  const handleGetPartnerInsights = async (partnerId: string) => {
    setLoadingInsights(partnerId);
    try {
      const insights = await partnersAIApi.getPartnerInsights(partnerId);
      setPartnerInsights(prev => ({ ...prev, [partnerId]: insights }));
    } catch (error) {
      console.error('Failed to get insights:', error);
    } finally {
      setLoadingInsights(null);
    }
  };

  const handleProcessAutoApprovals = async () => {
    setProcessingAutoApprovals(true);
    try {
      const results = await partnersAIApi.processAutoApprovals();
      setAutoApprovalResults(results);
    } catch (error) {
      console.error('Failed to process auto-approvals:', error);
    } finally {
      setProcessingAutoApprovals(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInviteModal || !inviteEmail) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      await partnersApi.inviteUser(showInviteModal, {
        email: inviteEmail,
        name: inviteName || undefined,
        role: inviteRole,
        isPrimary: inviteIsPrimary,
      });
      setInviteSuccess(true);
      // Reset form after short delay to show success
      setTimeout(() => {
        setShowInviteModal(null);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('MEMBER');
        setInviteIsPrimary(false);
        setInviteSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      setInviteError(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const resetInviteForm = () => {
    setShowInviteModal(null);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('MEMBER');
    setInviteIsPrimary(false);
    setInviteError(null);
    setInviteSuccess(false);
  };

  const {
    partners,
    stats: partnerStats,
    loading: partnersLoading,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePartners({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
  });

  const {
    registrations,
    stats: regStats,
    loading: regsLoading,
    approve,
    reject,
    convert,
    isApproving,
    isRejecting,
    isConverting,
  } = useDealRegistrations();

  const loading = partnersLoading || regsLoading;

  const handleCreatePartner = async (data: CreatePartnerDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create partner:', error);
    }
  };

  const handleUpdatePartner = async (id: string, data: UpdatePartnerDto) => {
    try {
      await update(id, data);
      setEditingPartner(null);
    } catch (error) {
      console.error('Failed to update partner:', error);
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete partner:', error);
    }
  };

  const handleApproveRegistration = async (partnerId: string, registrationId: string) => {
    try {
      await approve(partnerId, registrationId);
    } catch (error) {
      console.error('Failed to approve registration:', error);
    }
  };

  const handleRejectRegistration = async (partnerId: string, registrationId: string, reason: string) => {
    try {
      await reject(partnerId, registrationId, reason);
      setRejectingRegistration(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject registration:', error);
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
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Partner Management</h1>
          <p className="text-[#666]">Manage partners, deal registrations, and channel revenue.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search partners..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'partners' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PartnerStatus | '')}
                className="px-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              >
                <option value="">All Status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
                >
                  <Plus size={16} /> Add Partner
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Handshake size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{partnerStats?.total || 0}</div>
            <div className="text-xs text-[#666]">Total Partners</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{partnerStats?.active || 0}</div>
            <div className="text-xs text-[#666]">Active</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Clock size={18} className="text-orange-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{regStats?.pending || 0}</div>
            <div className="text-xs text-[#666]">Pending Registrations</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <DollarSign size={18} className="text-[#EAD07D]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(partnerStats?.totalRevenue)}</div>
            <div className="text-xs text-[#666]">Partner Revenue</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'partners'
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-white text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          <Handshake size={14} />
          Partners
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'registrations'
              ? 'bg-[#EAD07D] text-[#1A1A1A]'
              : 'bg-white text-[#666] hover:text-[#1A1A1A]'
          }`}
        >
          <FileText size={14} />
          Deal Registrations
          {regStats && regStats.pending > 0 && (
            <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs">
              {regStats.pending}
            </span>
          )}
        </button>
      </div>

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <>
          {partners.length === 0 ? (
            <Card className="p-12 text-center">
              <Handshake size={48} className="mx-auto text-[#999] mb-4" />
              <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
                {searchQuery || statusFilter ? 'No partners found' : 'No partners yet'}
              </h3>
              <p className="text-[#666] mb-6">
                {searchQuery || statusFilter
                  ? 'Try different search criteria'
                  : 'Start building your partner ecosystem.'}
              </p>
              {!searchQuery && !statusFilter && isAdmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
                >
                  <Plus size={18} />
                  Add Partner
                </button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className={`dash-card p-6 group hover:shadow-card transition-all duration-300 relative overflow-hidden ${
                    partner.status !== 'APPROVED' ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${TIER_COLORS[partner.tier]} flex items-center justify-center shadow-sm`}>
                      <Handshake size={20} className="text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={STATUS_COLORS[partner.status]}>
                        {STATUS_LABELS[partner.status]}
                      </Badge>
                      <button
                        onClick={() => setViewingPartner(partner.id)}
                        className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                      >
                        <Users size={14} />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setEditingPartner(partner)}
                            className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(partner.id)}
                            className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[#999] hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{partner.companyName}</h3>
                  {partner.website && (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#999] hover:text-[#EAD07D] mb-2 block"
                    >
                      {partner.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${TIER_COLORS[partner.tier]} text-white`}>
                      {TIER_LABELS[partner.tier]}
                    </span>
                    <span className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666]">
                      {TYPE_LABELS[partner.type]}
                    </span>
                  </div>

                  {/* Partner Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#1A1A1A]">{partner.totalDeals}</div>
                      <div className="text-xs text-[#666]">Deals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(partner.totalRevenue)}</div>
                      <div className="text-xs text-[#666]">Revenue</div>
                    </div>
                    {partner.commissionRate && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-[#EAD07D]">{partner.commissionRate}%</div>
                        <div className="text-xs text-[#666]">Commission</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add New Placeholder - Admin only */}
              {!searchQuery && !statusFilter && isAdmin && (
                <div
                  onClick={() => setShowCreateModal(true)}
                  className="border-2 border-dashed border-[#1A1A1A]/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-all cursor-pointer min-h-[280px] group"
                >
                  <div className="w-16 h-16 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                  </div>
                  <h3 className="font-bold text-[#1A1A1A]">Add Partner</h3>
                  <p className="text-sm text-[#666] mt-2">Onboard a new reseller, referral, or technology partner.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Deal Registrations Tab */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          {/* AI Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#EAD07D]" />
              <span className="text-sm font-medium text-[#1A1A1A]">AI-Powered Review</span>
            </div>
            <button
              onClick={handleProcessAutoApprovals}
              disabled={processingAutoApprovals}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EAD07D] to-[#D4B85C] text-[#1A1A1A] rounded-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
            >
              {processingAutoApprovals ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Auto-Approve Eligible
            </button>
          </div>

          {/* Auto-Approval Results */}
          {autoApprovalResults && (
            <Card className="p-4 bg-gradient-to-r from-[#EAD07D]/10 to-[#EAD07D]/5 border border-[#EAD07D]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm text-[#1A1A1A]"><strong>{autoApprovalResults.approved}</strong> approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-orange-600" />
                    <span className="text-sm text-[#1A1A1A]"><strong>{autoApprovalResults.flaggedForReview}</strong> need review</span>
                  </div>
                </div>
                <button onClick={() => setAutoApprovalResults(null)} className="text-[#666] hover:text-[#1A1A1A]">
                  <X size={16} />
                </button>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
          {registrations.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-[#999] mb-4" />
              <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">No deal registrations</h3>
              <p className="text-[#666]">Partners will submit deal registrations through the portal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-black/5 bg-[#F8F8F6]">
                  <th className="px-4 py-3 text-left font-medium text-[#666]">Deal</th>
                  <th className="px-4 py-3 text-left font-medium text-[#666]">Partner</th>
                  <th className="px-4 py-3 text-left font-medium text-[#666]">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-[#666]">AI Score</th>
                  <th className="px-4 py-3 text-left font-medium text-[#666]">Est. Value</th>
                  <th className="px-4 py-3 text-right font-medium text-[#666]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => {
                  const score = registrationScores[reg.id];
                  return (
                  <tr key={reg.id} className="border-b border-black/5 hover:bg-[#F8F8F6]">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-[#1A1A1A]">{reg.accountName}</div>
                        <div className="text-xs text-[#666]">{reg.contactName} - {reg.contactEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Handshake size={14} className="text-[#999]" />
                        <span className="text-[#666]">{reg.partner?.companyName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={REGISTRATION_STATUS_COLORS[reg.status]}>
                        {REGISTRATION_STATUS_LABELS[reg.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {score ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            score.recommendation === 'AUTO_APPROVE' ? 'bg-green-100 text-green-700' :
                            score.recommendation === 'MANUAL_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {score.score}
                          </div>
                          <div className="text-xs">
                            <div className={`font-medium ${
                              score.recommendation === 'AUTO_APPROVE' ? 'text-green-700' :
                              score.recommendation === 'MANUAL_REVIEW' ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>
                              {score.recommendation === 'AUTO_APPROVE' ? 'Auto-approve' :
                               score.recommendation === 'MANUAL_REVIEW' ? 'Review' : 'Likely reject'}
                            </div>
                            <div className="text-[#999]">{score.suggestedCommissionRate}% comm.</div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleScoreRegistration(reg.partnerId, reg.id)}
                          disabled={scoringRegistration === reg.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-[#666] hover:text-[#1A1A1A] hover:bg-[#EAD07D]/20 rounded-lg transition-all"
                        >
                          {scoringRegistration === reg.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          Score
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-[#1A1A1A]">
                      {formatCurrency(reg.estimatedValue)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {reg.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApproveRegistration(reg.partnerId, reg.id)}
                              disabled={isApproving}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isApproving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingRegistration({ partnerId: reg.partnerId, registrationId: reg.id, accountName: reg.accountName })}
                              disabled={isRejecting}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isRejecting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                              Reject
                            </button>
                          </>
                        )}
                        {reg.status === 'APPROVED' && !reg.opportunityId && (
                          <button
                            onClick={() => convert(reg.partnerId, reg.id)}
                            disabled={isConverting}
                            className="px-3 py-1.5 bg-[#EAD07D] text-[#1A1A1A] rounded-lg text-xs font-medium hover:bg-[#D4B85C] disabled:opacity-50 flex items-center gap-1"
                          >
                            {isConverting ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                            Convert to Opp
                          </button>
                        )}
                        {reg.opportunityId && (
                          <span className="px-3 py-1.5 bg-[#F8F8F6] text-[#666] rounded-lg text-xs">
                            Converted
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </Card>
        </div>
      )}

      {/* Partner Detail Modal */}
      {viewingPartner && (
        <PartnerDetailModal
          partnerId={viewingPartner}
          onClose={() => setViewingPartner(null)}
          onInviteUser={isAdmin ? (partnerId: string) => setShowInviteModal(partnerId) : undefined}
        />
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center">
                  <Mail size={18} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1A1A1A]">Invite Partner User</h3>
                  <p className="text-xs text-[#666]">Send an email invitation to join the Partner Portal</p>
                </div>
              </div>
              <button
                onClick={resetInviteForm}
                className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
              >
                <X size={18} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-[#93C01F]" />
                </div>
                <h4 className="text-lg font-semibold text-[#1A1A1A] mb-2">Invitation Sent!</h4>
                <p className="text-sm text-[#666]">
                  An email has been sent to <strong>{inviteEmail}</strong> with instructions to set up their account.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInviteUser}>
                {inviteError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {inviteError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#666] mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                      placeholder="partner@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#666] mb-1">Name (optional)</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#666] mb-1">Portal Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    >
                      <option value="VIEWER">Viewer - Can view deals and accounts</option>
                      <option value="MEMBER">Member - Can register deals</option>
                      <option value="MANAGER">Manager - Can manage team members</option>
                      <option value="ADMIN">Admin - Full partner access</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteIsPrimary}
                        onChange={(e) => setInviteIsPrimary(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                      />
                      <span className="text-sm font-medium text-[#1A1A1A]">Primary Contact</span>
                      <span className="text-xs text-[#666]">(receives important notifications)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={resetInviteForm}
                    className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail}
                    className="px-5 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPartner) && (
        <PartnerModal
          partner={editingPartner}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPartner(null);
          }}
          onSave={editingPartner
            ? (data) => handleUpdatePartner(editingPartner.id, data)
            : handleCreatePartner
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
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Partner</h3>
                <p className="text-sm text-[#666]">This will also delete all deal registrations.</p>
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
                onClick={() => handleDeletePartner(deleteConfirm)}
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

      {/* Reject Registration Modal */}
      {rejectingRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                  <XCircle size={22} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-[#1A1A1A]">Reject Registration</h2>
                  <p className="text-sm text-[#666] mt-0.5">{rejectingRegistration.accountName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRejectingRegistration(null);
                  setRejectionReason('');
                }}
                className="w-10 h-10 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 pt-6">
              <p className="text-sm text-[#666] mb-4">
                Please provide a reason for rejecting this deal registration. This will be shared with the partner.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="E.g., Account already registered by another partner, incomplete information, does not meet deal registration criteria..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <button
                  onClick={() => {
                    setRejectingRegistration(null);
                    setRejectionReason('');
                  }}
                  className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] font-medium text-sm hover:bg-[#F8F8F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectRegistration(
                    rejectingRegistration.partnerId,
                    rejectingRegistration.registrationId,
                    rejectionReason
                  )}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="px-5 py-2.5 rounded-full bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Reject Registration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Partner Modal Component
interface PartnerModalProps {
  partner: Partner | null;
  onClose: () => void;
  onSave: (data: CreatePartnerDto | UpdatePartnerDto) => Promise<void>;
  saving: boolean;
}

const PartnerModal: React.FC<PartnerModalProps> = ({ partner, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<CreatePartnerDto>({
    companyName: partner?.companyName || '',
    website: partner?.website || '',
    type: partner?.type || 'RESELLER',
    tier: partner?.tier || 'REGISTERED',
    status: partner?.status || 'PROSPECT',
    commissionRate: partner?.commissionRate || undefined,
    portalEnabled: partner?.portalEnabled || false,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save partner');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {partner ? 'Edit Partner' : 'Add Partner'}
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
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Partner Company Inc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="https://partner.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Partner Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as PartnerType })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as PartnerTier })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PartnerStatus })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Commission Rate (%)</label>
              <input
                type="number"
                value={formData.commissionRate || ''}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || undefined })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="15"
                min="0"
                max="100"
                step="0.5"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.portalEnabled}
                  onChange={(e) => setFormData({ ...formData, portalEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm font-medium text-[#1A1A1A]">Enable Partner Portal</span>
                <span className="text-xs text-[#666]">(Allow partner users to access the portal)</span>
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
                  {partner ? 'Update Partner' : 'Add Partner'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Partner Detail Modal
interface PartnerDetailModalProps {
  partnerId: string;
  onClose: () => void;
  onInviteUser?: (partnerId: string) => void;
}

const PartnerDetailModal: React.FC<PartnerDetailModalProps> = ({ partnerId, onClose, onInviteUser }) => {
  const { partner, loading } = usePartner(partnerId);
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const handleLoadInsights = async () => {
    setLoadingInsights(true);
    try {
      const result = await partnersAIApi.getPartnerInsights(partnerId);
      setInsights(result);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  if (loading || !partner) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-3xl p-6">
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#EAD07D]" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${TIER_COLORS[partner.tier]} flex items-center justify-center shadow-sm`}>
              <Handshake size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#1A1A1A]">{partner.companyName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={STATUS_COLORS[partner.status]}>{STATUS_LABELS[partner.status]}</Badge>
                <Badge className={TIER_COLORS[partner.tier] + ' text-white'}>{TIER_LABELS[partner.tier]}</Badge>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1A1A1A]">{partner.totalDeals}</div>
            <div className="text-sm text-[#666]">Total Deals</div>
          </div>
          <div className="bg-[#EAD07D]/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(partner.totalRevenue)}</div>
            <div className="text-sm text-[#666]">Total Revenue</div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#EAD07D]">{partner.commissionRate || 0}%</div>
            <div className="text-sm text-white/60">Commission Rate</div>
          </div>
        </div>

        {/* Partner Users */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Users size={14} className="text-[#666]" /> Partner Users
            </h3>
            {onInviteUser && (
              <button
                onClick={() => onInviteUser(partnerId)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#EAD07D] text-[#1A1A1A] rounded-lg text-xs font-medium hover:bg-[#D4B85C] transition-colors"
              >
                <UserPlus size={12} />
                Invite User
              </button>
            )}
          </div>
          {partner.users && partner.users.length > 0 ? (
            <div className="space-y-2">
              {partner.users.map((pu) => (
                <div key={pu.id} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-sm font-medium text-[#1A1A1A]">
                      {pu.user?.firstName?.[0]}{pu.user?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A1A]">
                        {pu.user?.firstName} {pu.user?.lastName}
                      </div>
                      <div className="text-xs text-[#666]">{pu.user?.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{pu.role}</Badge>
                    {pu.isPrimary && <Badge variant="success">Primary</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
              <Users size={32} className="mx-auto text-[#999] mb-2" />
              <p className="text-sm text-[#666]">No users assigned to this partner</p>
            </div>
          )}
        </div>

        {/* Assigned Accounts */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
            <Building2 size={14} className="text-[#666]" /> Assigned Accounts
          </h3>
          {partner.accounts && partner.accounts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {partner.accounts.map((pa) => (
                <div key={pa.id} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[#999]" />
                    <span className="font-medium text-[#1A1A1A]">{pa.account?.name}</span>
                  </div>
                  {pa.isExclusive && <Badge variant="warning">Exclusive</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
              <Building2 size={32} className="mx-auto text-[#999] mb-2" />
              <p className="text-sm text-[#666]">No accounts assigned to this partner</p>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Sparkles size={14} className="text-[#EAD07D]" /> AI Partner Insights
            </h3>
            <button
              onClick={handleLoadInsights}
              disabled={loadingInsights}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#EAD07D] text-[#1A1A1A] rounded-lg text-xs font-medium hover:bg-[#D4B85C] disabled:opacity-50"
            >
              {loadingInsights ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Generate Insights
            </button>
          </div>

          {insights ? (
            <div className="bg-gradient-to-br from-[#EAD07D]/10 to-[#EAD07D]/5 rounded-xl p-4 border border-[#EAD07D]/30">
              <div className="mb-4">
                <div className="text-xs font-semibold text-[#999] mb-1">OVERALL ASSESSMENT</div>
                <p className="text-sm text-[#1A1A1A]">{insights.overallAssessment}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs font-semibold text-green-600 mb-2">STRENGTHS</div>
                  <ul className="space-y-1">
                    {insights.strengths?.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-[#666] flex items-start gap-1">
                        <TrendingUp size={10} className="text-green-600 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-orange-600 mb-2">IMPROVEMENT AREAS</div>
                  <ul className="space-y-1">
                    {insights.improvementAreas?.map((a: string, i: number) => (
                      <li key={i} className="text-xs text-[#666] flex items-start gap-1">
                        <Target size={10} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {insights.recommendations && insights.recommendations.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-[#999] mb-2">RECOMMENDATIONS</div>
                  <ul className="space-y-1">
                    {insights.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-xs text-[#1A1A1A] flex items-start gap-1">
                        <Lightbulb size={10} className="text-[#EAD07D] mt-0.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.predictedNextQuarterPerformance && (
                <div className="pt-3 border-t border-[#EAD07D]/30">
                  <div className="text-xs font-semibold text-[#999] mb-1">NEXT QUARTER FORECAST</div>
                  <p className="text-sm text-[#1A1A1A]">{insights.predictedNextQuarterPerformance}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
              <BarChart3 size={32} className="mx-auto text-[#999] mb-2" />
              <p className="text-sm text-[#666]">Click "Generate Insights" to get AI-powered partner analysis</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
