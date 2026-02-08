import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  Send,
  Edit2,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { usePortalRegistration, useSubmitRegistration } from '../../src/hooks/usePortal';
import type { DealRegistrationStatus } from '../../src/types/portal';

const STATUS_CONFIG: Record<DealRegistrationStatus, { bg: string; text: string; icon: React.ElementType; label: string; description: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText, label: 'Draft', description: 'This registration has not been submitted yet' },
  PENDING: { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', icon: Clock, label: 'Pending Approval', description: 'Waiting for review by our team' },
  UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, label: 'Under Review', description: 'Currently being reviewed' },
  APPROVED: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', icon: CheckCircle, label: 'Approved', description: 'Your deal registration has been approved' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle, label: 'Rejected', description: 'This registration was not approved' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock, label: 'Expired', description: 'The protection period has ended' },
  CONVERTED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: TrendingUp, label: 'Converted', description: 'This has been converted to an opportunity' },
  WON: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', icon: Award, label: 'Won', description: 'Congratulations! This deal was won' },
  LOST: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle, label: 'Lost', description: 'This deal was lost' },
};

export function RegistrationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: registration, isLoading, error } = usePortalRegistration(id || '');
  const submitMutation = useSubmitRegistration();

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await submitMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to submit registration:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded-lg w-48" />
            <div className="h-64 bg-gray-200 rounded-[32px]" />
            <div className="h-48 bg-gray-200 rounded-[32px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-[#1A1A1A] mb-2">Registration Not Found</h2>
            <p className="text-[#666] mb-6">This registration doesn't exist or you don't have access to it.</p>
            <Link
              to="/portal/registrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white font-medium text-sm"
            >
              <ArrowLeft size={16} />
              Back to Registrations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[registration.status];
  const StatusIcon = statusConfig.icon;
  const isDraft = registration.status === 'DRAFT';
  const canEdit = isDraft;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/portal/registrations')}
            className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Registrations
          </button>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-light text-[#1A1A1A]">
                  {registration.accountName}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-[#666]">{registration.registrationNumber}</p>
            </div>

            <div className="flex items-center gap-3">
              {canEdit && (
                <Link
                  to={`/portal/registrations/${id}/edit`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-[#F8F8F6] transition-colors font-medium text-sm"
                >
                  <Edit2 size={16} />
                  Edit
                </Link>
              )}
              {isDraft && (
                <button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm disabled:opacity-50"
                >
                  <Send size={16} />
                  {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`${statusConfig.bg} rounded-[24px] p-5 mb-6 flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center`}>
            <StatusIcon size={24} className={statusConfig.text} />
          </div>
          <div>
            <p className={`font-medium ${statusConfig.text}`}>{statusConfig.label}</p>
            <p className="text-sm text-[#666]">{statusConfig.description}</p>
          </div>
        </div>

        {/* Rejection Reason */}
        {registration.status === 'REJECTED' && registration.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-[24px] p-5 mb-6">
            <p className="font-medium text-red-700 mb-1">Rejection Reason</p>
            <p className="text-sm text-red-600">{registration.rejectionReason}</p>
          </div>
        )}

        {/* Approval Info */}
        {(registration.status === 'APPROVED' || registration.status === 'CONVERTED') && (
          <div className="bg-[#93C01F]/10 rounded-[24px] p-5 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <Shield size={24} className="text-[#93C01F]" />
              </div>
              <div>
                <p className="font-medium text-[#1A1A1A]">Deal Protected</p>
                <p className="text-sm text-[#666]">
                  {registration.approvedUntil
                    ? `Protection expires on ${new Date(registration.approvedUntil).toLocaleDateString()}`
                    : 'Approved'}
                </p>
              </div>
            </div>
            {registration.commissionRate && (
              <div className="text-right">
                <p className="text-sm text-[#666]">Commission Rate</p>
                <p className="text-xl font-medium text-[#93C01F]">{registration.commissionRate}%</p>
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account & Contact */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-5 flex items-center gap-2">
              <Building2 size={20} className="text-[#EAD07D]" />
              Account & Contact
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#999] mb-1">Account Name</p>
                <p className="font-medium text-[#1A1A1A]">{registration.accountName}</p>
              </div>

              <div className="pt-4 border-t border-black/5">
                <p className="text-sm text-[#999] mb-1">Contact Name</p>
                <p className="font-medium text-[#1A1A1A] flex items-center gap-2">
                  <User size={16} className="text-[#666]" />
                  {registration.contactName}
                </p>
              </div>

              {registration.contactTitle && (
                <div>
                  <p className="text-sm text-[#999] mb-1">Title</p>
                  <p className="text-[#1A1A1A] flex items-center gap-2">
                    <Briefcase size={16} className="text-[#666]" />
                    {registration.contactTitle}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-[#999] mb-1">Email</p>
                <p className="text-[#1A1A1A] flex items-center gap-2">
                  <Mail size={16} className="text-[#666]" />
                  <a href={`mailto:${registration.contactEmail}`} className="hover:underline">
                    {registration.contactEmail}
                  </a>
                </p>
              </div>

              {registration.contactPhone && (
                <div>
                  <p className="text-sm text-[#999] mb-1">Phone</p>
                  <p className="text-[#1A1A1A] flex items-center gap-2">
                    <Phone size={16} className="text-[#666]" />
                    {registration.contactPhone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Deal Information */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-5 flex items-center gap-2">
              <DollarSign size={20} className="text-[#EAD07D]" />
              Deal Information
            </h2>

            <div className="space-y-4">
              {registration.estimatedValue && (
                <div>
                  <p className="text-sm text-[#999] mb-1">Estimated Value</p>
                  <p className="text-2xl font-light text-[#1A1A1A]">
                    ${registration.estimatedValue.toLocaleString()}
                  </p>
                </div>
              )}

              {registration.estimatedCloseDate && (
                <div>
                  <p className="text-sm text-[#999] mb-1">Expected Close Date</p>
                  <p className="font-medium text-[#1A1A1A] flex items-center gap-2">
                    <Calendar size={16} className="text-[#666]" />
                    {new Date(registration.estimatedCloseDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {registration.estimatedCommission && (
                <div className="pt-4 border-t border-black/5">
                  <p className="text-sm text-[#999] mb-1">Estimated Commission</p>
                  <p className="text-xl font-medium text-[#93C01F]">
                    ${registration.estimatedCommission.toLocaleString()}
                  </p>
                </div>
              )}

              {registration.productInterest && registration.productInterest.length > 0 && (
                <div className="pt-4 border-t border-black/5">
                  <p className="text-sm text-[#999] mb-2">Product Interest</p>
                  <div className="flex flex-wrap gap-2">
                    {registration.productInterest.map((product) => (
                      <span
                        key={product}
                        className="px-3 py-1 rounded-full bg-[#F8F8F6] text-sm text-[#666]"
                      >
                        <Package size={12} className="inline mr-1" />
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Details */}
          {(registration.useCase || registration.competitorInfo || registration.notes) && (
            <div className="lg:col-span-2 bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <h2 className="text-lg font-medium text-[#1A1A1A] mb-5 flex items-center gap-2">
                <FileText size={20} className="text-[#EAD07D]" />
                Additional Details
              </h2>

              <div className="space-y-4">
                {registration.useCase && (
                  <div>
                    <p className="text-sm text-[#999] mb-1">Use Case / Business Need</p>
                    <p className="text-[#1A1A1A] whitespace-pre-wrap">{registration.useCase}</p>
                  </div>
                )}

                {registration.competitorInfo && (
                  <div className="pt-4 border-t border-black/5">
                    <p className="text-sm text-[#999] mb-1">Competitor Information</p>
                    <p className="text-[#1A1A1A] whitespace-pre-wrap">{registration.competitorInfo}</p>
                  </div>
                )}

                {registration.notes && (
                  <div className="pt-4 border-t border-black/5">
                    <p className="text-sm text-[#999] mb-1">Notes</p>
                    <p className="text-[#1A1A1A] whitespace-pre-wrap">{registration.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Linked Opportunity */}
          {registration.opportunity && (
            <div className="lg:col-span-2 bg-[#1A1A1A] rounded-[32px] p-6 text-white">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-[#EAD07D]" />
                Linked Opportunity
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">{registration.opportunity.name}</p>
                  <p className="text-white/60 text-sm">
                    Stage: {registration.opportunity.stage.replace('_', ' ')}
                  </p>
                </div>
                {registration.opportunity.amount && (
                  <div className="text-right">
                    <p className="text-sm text-white/60">Deal Value</p>
                    <p className="text-2xl font-light text-[#EAD07D]">
                      ${registration.opportunity.amount.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-6 bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
          <h2 className="text-lg font-medium text-[#1A1A1A] mb-5 flex items-center gap-2">
            <Clock size={20} className="text-[#EAD07D]" />
            Timeline
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-[#EAD07D]" />
              <div>
                <p className="text-sm text-[#1A1A1A]">Registration Created</p>
                <p className="text-xs text-[#666]">
                  {new Date(registration.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {registration.approvedAt && (
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-[#93C01F]" />
                <div>
                  <p className="text-sm text-[#1A1A1A]">Approved</p>
                  <p className="text-xs text-[#666]">
                    {new Date(registration.approvedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-[#999]" />
              <div>
                <p className="text-sm text-[#1A1A1A]">Last Updated</p>
                <p className="text-xs text-[#666]">
                  {new Date(registration.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegistrationDetail;
