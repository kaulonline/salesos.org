import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Percent,
  ShoppingCart,
  FileSignature,
  Clock,
  User,
  MessageSquare,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { usePendingApprovals } from '../../hooks/useApprovalWorkflows';
import type { ApprovalRequest, ApprovalEntity, ApprovalDecision } from '../../types';

interface PendingApprovalsProps {
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const entityConfig: Record<ApprovalEntity, { icon: React.ReactNode; label: string; color: string; path: string }> = {
  QUOTE: { icon: <FileText className="w-4 h-4" />, label: 'Quote', color: 'bg-blue-100 text-blue-700', path: '/dashboard/quotes' },
  DISCOUNT: { icon: <Percent className="w-4 h-4" />, label: 'Discount', color: 'bg-purple-100 text-purple-700', path: '/dashboard/discount-rules' },
  ORDER: { icon: <ShoppingCart className="w-4 h-4" />, label: 'Order', color: 'bg-green-100 text-green-700', path: '/dashboard/orders' },
  CONTRACT: { icon: <FileSignature className="w-4 h-4" />, label: 'Contract', color: 'bg-orange-100 text-orange-700', path: '/dashboard/contracts' },
};

export function PendingApprovals({ maxItems, showHeader = true, compact = false }: PendingApprovalsProps) {
  const navigate = useNavigate();
  const { pendingRequests: requests, loading, error, refetch, decide, isDeciding } = usePendingApprovals();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    requestId: string;
    action: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [comment, setComment] = useState('');

  const displayedRequests = maxItems ? requests.slice(0, maxItems) : requests;

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenDecisionDialog = (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    setDecisionDialog({ open: true, requestId, action });
    setComment('');
  };

  const handleCloseDecisionDialog = () => {
    setDecisionDialog(null);
    setComment('');
  };

  const handleSubmitDecision = async () => {
    if (!decisionDialog) return;

    try {
      await decide(
        decisionDialog.requestId,
        {
          action: decisionDialog.action,
          comment: comment.trim() || undefined,
        },
      );
      handleCloseDecisionDialog();
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleViewEntity = (request: ApprovalRequest) => {
    const config = entityConfig[request.entityType];
    navigate(`${config.path}/${request.entityId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
        <span className="text-red-700">{error}</span>
        <button
          onClick={() => refetch()}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No Pending Approvals</h3>
        <p className="text-sm text-gray-500">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
            <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`space-y-${compact ? '2' : '3'}`}>
        {displayedRequests.map((request) => {
          const config = entityConfig[request.entityType];
          const isExpanded = expandedId === request.id;

          return (
            <Card key={request.id} className={`border ${isExpanded ? 'border-[#1C1C1C]' : 'border-gray-200'}`}>
              <div className={`p-${compact ? '3' : '4'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
                    {config.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {request.entityName || `${config.label} #${request.entityId.slice(-6)}`}
                      </span>
                      <Badge variant="secondary" className={config.color}>
                        {config.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {request.requestedByName || request.submittedByName || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {request.currentStep?.name && (
                      <p className="text-sm text-gray-500 mt-1">
                        Step {request.currentStepOrder}: {request.currentStep.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleViewEntity(request)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDecisionDialog(request.id, 'APPROVED')}
                      disabled={isDeciding}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDecisionDialog(request.id, 'REJECTED')}
                      disabled={isDeciding}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    {request.decisions && request.decisions.length > 0 && (
                      <button
                        onClick={() => handleToggleExpand(request.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && request.decisions && request.decisions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <ApprovalTimeline decisions={request.decisions} />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {maxItems && requests.length > maxItems && (
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/dashboard/approval-workflows')}
            className="text-[#1C1C1C] hover:underline text-sm font-medium"
          >
            View All ({requests.length - maxItems} more)
          </button>
        </div>
      )}

      {/* Decision Dialog */}
      {decisionDialog?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {decisionDialog.action === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {decisionDialog.action === 'APPROVED' ? 'Comment (optional)' : 'Reason for rejection'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors resize-none"
                placeholder={decisionDialog.action === 'APPROVED' ? 'Add an optional comment...' : 'Please provide a reason...'}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseDecisionDialog}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={isDeciding || (decisionDialog.action === 'REJECTED' && !comment.trim())}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50
                  ${decisionDialog.action === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
              >
                {isDeciding && <Loader2 className="w-4 h-4 animate-spin" />}
                {decisionDialog.action === 'APPROVED' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ApprovalTimelineProps {
  decisions: ApprovalDecision[];
}

function ApprovalTimeline({ decisions }: ApprovalTimelineProps) {
  if (decisions.length === 0) {
    return <p className="text-sm text-gray-500">No decisions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {decisions.map((decision, index) => (
        <div key={decision.id || index} className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              decision.decision === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            {decision.decision === 'APPROVED' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">
                {decision.approver?.name || 'Unknown'}
              </span>
              <Badge
                variant={decision.decision === 'APPROVED' ? 'success' : 'destructive'}
                className="text-xs"
              >
                {decision.decision}
              </Badge>
              <span className="text-xs text-gray-500">
                {format(new Date(decision.createdAt || decision.decidedAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            {decision.comment && (
              <div className="flex items-start gap-1.5 mt-1 text-sm text-gray-600">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{decision.comment}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact card version for dashboard widgets
export function PendingApprovalsCard() {
  const { pendingRequests: requests, loading } = usePendingApprovals();

  return (
    <Card>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Approvals</h3>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              requests.length > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {loading ? '...' : requests.length}
          </span>
        </div>
        <PendingApprovals maxItems={3} showHeader={false} compact />
      </div>
    </Card>
  );
}

export default PendingApprovals;
