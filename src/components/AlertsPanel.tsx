import React, { useState } from 'react';
import {
  AlertTriangle,
  Brain,
  TrendingUp,
  Users,
  MessageSquare,
  GraduationCap,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAgentAlerts } from '../hooks/useAgentAlerts';
import type { AgentAlert, AgentType, AlertPriority } from '../api/agentAlerts';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '../lib/logger';

// Agent type icon mapping
const agentIcons: Record<AgentType, React.ReactNode> = {
  DEAL_HEALTH: <TrendingUp size={16} />,
  PIPELINE_ACCELERATION: <Zap size={16} />,
  ACCOUNT_INTELLIGENCE: <Users size={16} />,
  OUTREACH_OPTIMIZATION: <MessageSquare size={16} />,
  COACHING: <GraduationCap size={16} />,
};

// Agent type labels
const agentLabels: Record<AgentType, string> = {
  DEAL_HEALTH: 'Deal Health',
  PIPELINE_ACCELERATION: 'Pipeline',
  ACCOUNT_INTELLIGENCE: 'Account Intel',
  OUTREACH_OPTIMIZATION: 'Outreach',
  COACHING: 'Coaching',
};

// Priority badge colors - using brand colors
const priorityColors: Record<AlertPriority, string> = {
  URGENT: 'bg-[#1A1A1A] text-[#EAD07D]',
  HIGH: 'bg-[#EAD07D] text-[#1A1A1A]',
  MEDIUM: 'bg-[#F0EBD8] text-[#666]',
  LOW: 'bg-[#F8F8F6] text-[#999]',
};

// Priority border colors for left accent
const priorityBorderColors: Record<AlertPriority, string> = {
  URGENT: 'border-l-[#1A1A1A]',
  HIGH: 'border-l-[#EAD07D]',
  MEDIUM: 'border-l-[#F0EBD8]',
  LOW: 'border-l-[#999]',
};

interface AlertItemProps {
  alert: AgentAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string, reason?: string) => void;
  onAction: (id: string, notes?: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  onAcknowledge,
  onDismiss,
  onAction,
  isExpanded,
  onToggleExpand,
}) => {
  const timeAgo = formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true });
  const isPending = alert.status === 'PENDING';
  const healthScore = alert.metadata?.healthScore;

  return (
    <div
      className={`border-l-4 ${priorityBorderColors[alert.priority]} bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden transition-all`}
    >
      {/* Main Alert Row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Agent Icon */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            alert.priority === 'URGENT' ? 'bg-[#1A1A1A] text-[#EAD07D]' :
            alert.priority === 'HIGH' ? 'bg-[#EAD07D] text-[#1A1A1A]' :
            'bg-[#EAD07D]/20 text-[#1A1A1A]'
          }`}>
            {agentIcons[alert.agentType]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityColors[alert.priority]}`}>
                {alert.priority}
              </span>
              <span className="text-xs text-[#999]">{agentLabels[alert.agentType]}</span>
              {healthScore !== undefined && (
                <span className={`text-xs font-medium ${
                  healthScore >= 70 ? 'text-[#93C01F]' :
                  healthScore >= 40 ? 'text-[#EAD07D]' :
                  'text-[#1A1A1A]'
                }`}>
                  Score: {healthScore}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-[#1A1A1A] mb-1 line-clamp-1">
              {alert.title}
            </h4>
            <p className="text-xs text-[#666] line-clamp-2">{alert.description}</p>
            <p className="text-[10px] text-[#999] mt-1">{timeAgo}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPending && (
              <>
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="p-1.5 text-[#999] hover:text-[#93C01F] hover:bg-[#93C01F]/10 rounded-full transition-colors"
                  title="Acknowledge"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-1.5 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-full transition-colors"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </>
            )}
            <button
              onClick={onToggleExpand}
              className="p-1.5 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-black/5 mt-2">
          {/* Recommendation */}
          {alert.recommendation && (
            <div className="mb-3 mt-3">
              <p className="text-xs font-medium text-[#1A1A1A] mb-1">Recommendation</p>
              <p className="text-xs text-[#666] bg-[#F8F8F6] rounded-lg p-2">
                {alert.recommendation}
              </p>
            </div>
          )}

          {/* Risk Factors */}
          {alert.metadata?.riskFactors && alert.metadata.riskFactors.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[#1A1A1A] mb-1">Risk Factors</p>
              <ul className="space-y-1">
                {alert.metadata.riskFactors.map((factor, idx) => (
                  <li key={idx} className="text-xs text-[#1A1A1A] flex items-start gap-1.5">
                    <span className="text-[#1A1A1A] mt-0.5">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Positive Signals */}
          {alert.metadata?.positiveSignals && alert.metadata.positiveSignals.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[#1A1A1A] mb-1">Positive Signals</p>
              <ul className="space-y-1">
                {alert.metadata.positiveSignals.map((signal, idx) => (
                  <li key={idx} className="text-xs text-[#93C01F] flex items-start gap-1.5">
                    <span className="text-[#93C01F] mt-0.5">•</span>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Actions */}
          {alert.suggestedActions && alert.suggestedActions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[#1A1A1A] mb-2">Suggested Actions</p>
              <div className="flex flex-wrap gap-2">
                {alert.suggestedActions.map((action, idx) => (
                  <button
                    key={idx}
                    className="px-3 py-1.5 text-xs font-medium bg-[#1A1A1A] text-white rounded-full hover:bg-[#333] transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View Entity Link */}
          {alert.entityType && alert.entityId && (
            <Link
              to={`/dashboard/${alert.entityType.toLowerCase()}s/${alert.entityId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
            >
              View {alert.entityType.toLowerCase()}
              <ExternalLink size={12} />
            </Link>
          )}

          {/* Mark as Actioned */}
          {alert.status !== 'ACTIONED' && alert.status !== 'DISMISSED' && (
            <div className="flex justify-end mt-3 pt-3 border-t border-black/5">
              <button
                onClick={() => onAction(alert.id)}
                className="px-4 py-2 text-xs font-medium bg-[#93C01F]/20 text-[#93C01F] rounded-full hover:bg-[#93C01F]/30 transition-colors"
              >
                Mark as Actioned
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AlertsPanel: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const {
    alerts,
    totalPending,
    loading,
    isFetching,
    acknowledge,
    dismiss,
    markActioned,
    refetch,
  } = useAgentAlerts({ status: 'PENDING', limit: 10 });

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge(id);
    } catch (error) {
      logger.error('Failed to acknowledge alert:', error);
    }
  };

  const handleDismiss = async (id: string, reason?: string) => {
    try {
      await dismiss(id, reason);
    } catch (error) {
      logger.error('Failed to dismiss alert:', error);
    }
  };

  const handleAction = async (id: string, notes?: string) => {
    try {
      await markActioned(id, notes);
    } catch (error) {
      logger.error('Failed to mark alert as actioned:', error);
    }
  };

  // Count by priority
  const urgentCount = alerts.filter(a => a.priority === 'URGENT').length;
  const highCount = alerts.filter(a => a.priority === 'HIGH').length;

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Brain size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">AI Agent Alerts</h3>
            <p className="text-xs text-[#666]">
              {totalPending} pending {totalPending === 1 ? 'alert' : 'alerts'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="px-2.5 py-1 bg-[#1A1A1A] text-[#EAD07D] text-xs font-semibold rounded-full">
              {urgentCount} Urgent
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2.5 py-1 bg-[#EAD07D] text-[#1A1A1A] text-xs font-semibold rounded-full">
              {highCount} High
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#EAD07D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-14 h-14 bg-[#93C01F]/20 rounded-full flex items-center justify-center mb-4">
              <Check size={28} className="text-[#93C01F]" />
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]">All caught up!</p>
            <p className="text-xs text-[#999] mt-1 text-center">
              No pending alerts from AI agents
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onDismiss={handleDismiss}
              onAction={handleAction}
              isExpanded={expandedId === alert.id}
              onToggleExpand={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
            />
          ))
        )}
      </div>

      {/* Footer - Link to full alerts page */}
      {alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/5">
          <Link
            to="/dashboard/alerts"
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            View All Alerts
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
