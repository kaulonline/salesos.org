import React, { useState } from 'react';
import {
  Brain,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  Zap,
  Users,
  MessageSquare,
  GraduationCap,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAgentAlerts } from '../hooks/useAgentAlerts';
import type { AgentAlert, AgentType, AlertPriority } from '../api/agentAlerts';
import { formatDistanceToNow } from 'date-fns';

// Agent type icon mapping
const agentIcons: Record<AgentType, React.ReactNode> = {
  DEAL_HEALTH: <TrendingUp size={14} />,
  PIPELINE_ACCELERATION: <Zap size={14} />,
  ACCOUNT_INTELLIGENCE: <Users size={14} />,
  OUTREACH_OPTIMIZATION: <MessageSquare size={14} />,
  COACHING: <GraduationCap size={14} />,
};

// Agent type labels
const agentLabels: Record<AgentType, string> = {
  DEAL_HEALTH: 'Deal Health',
  PIPELINE_ACCELERATION: 'Pipeline',
  ACCOUNT_INTELLIGENCE: 'Account Intel',
  OUTREACH_OPTIMIZATION: 'Outreach',
  COACHING: 'Coaching',
};

// Priority styles - using brand colors only
const priorityStyles: Record<AlertPriority, { badge: string; border: string; bg: string }> = {
  URGENT: {
    badge: 'bg-[#1A1A1A] text-[#EAD07D]',
    border: 'border-l-[#1A1A1A]',
    bg: 'bg-[#1A1A1A]/5',
  },
  HIGH: {
    badge: 'bg-[#EAD07D] text-[#1A1A1A]',
    border: 'border-l-[#EAD07D]',
    bg: 'bg-[#EAD07D]/10',
  },
  MEDIUM: {
    badge: 'bg-[#F0EBD8] text-[#666]',
    border: 'border-l-[#F0EBD8]',
    bg: 'bg-[#F0EBD8]/30',
  },
  LOW: {
    badge: 'bg-[#F8F8F6] text-[#999]',
    border: 'border-l-[#999]',
    bg: 'bg-white',
  },
};

interface AlertItemProps {
  alert: AgentAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onAcknowledge, onDismiss, onClose }) => {
  const timeAgo = formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true });
  const styles = priorityStyles[alert.priority];
  const healthScore = alert.metadata?.healthScore;

  // Build entity link
  const entityLink = alert.entityType && alert.entityId
    ? `/dashboard/${alert.entityType.toLowerCase()}s/${alert.entityId}`
    : null;

  return (
    <div className={`border-l-4 ${styles.border} ${styles.bg} hover:bg-[#F8F8F6] transition-colors`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Agent Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            alert.priority === 'URGENT' ? 'bg-[#1A1A1A] text-[#EAD07D]' :
            alert.priority === 'HIGH' ? 'bg-[#EAD07D] text-[#1A1A1A]' :
            'bg-[#EAD07D]/20 text-[#1A1A1A]'
          }`}>
            {agentIcons[alert.agentType]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${styles.badge}`}>
                {alert.priority}
              </span>
              <span className="text-[10px] text-[#999] font-medium">
                {agentLabels[alert.agentType]}
              </span>
              {healthScore !== undefined && (
                <span className={`text-[10px] font-semibold ${
                  healthScore >= 70 ? 'text-[#93C01F]' :
                  healthScore >= 40 ? 'text-[#EAD07D]' :
                  'text-[#1A1A1A]'
                }`}>
                  {healthScore}/100
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1 mb-0.5">
              {alert.title}
            </p>
            <p className="text-xs text-[#666] line-clamp-2 mb-1">
              {alert.description}
            </p>

            {/* Recommendation preview */}
            {alert.recommendation && (
              <p className="text-xs text-[#999] line-clamp-1 italic mb-1">
                → {alert.recommendation}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#999]">{timeAgo}</span>
              {entityLink && (
                <Link
                  to={entityLink}
                  onClick={onClose}
                  className="text-[10px] font-medium text-[#EAD07D] hover:text-[#1A1A1A] flex items-center gap-0.5 transition-colors"
                >
                  View <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="p-1.5 text-[#999] hover:text-[#93C01F] hover:bg-[#93C01F]/10 rounded-lg transition-colors"
              title="Acknowledge"
            >
              <Check size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(alert.id);
              }}
              className="p-1.5 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-lg transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AlertsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    alerts,
    totalPending,
    loading,
    isFetching,
    acknowledge,
    dismiss,
    refetch,
  } = useAgentAlerts({ status: 'PENDING', limit: 8 });

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge(id);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismiss(id);
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  // Count urgent alerts
  const urgentCount = alerts.filter(a => a.priority === 'URGENT').length;
  const hasUrgent = urgentCount > 0;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 border rounded-full flex items-center justify-center transition-all shadow-sm backdrop-blur-sm relative group ${
          hasUrgent
            ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#EAD07D] hover:bg-[#333]'
            : 'bg-white/60 border-white/50 hover:bg-white text-[#1A1A1A]'
        }`}
      >
        <Brain size={18} className="group-hover:scale-110 transition-transform" />
        {totalPending > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full border-2 border-white flex items-center justify-center ${
            hasUrgent ? 'bg-[#EAD07D]' : 'bg-[#EAD07D]'
          }`}>
            <span className="text-[10px] font-bold px-1 text-[#1A1A1A]">
              {totalPending > 99 ? '99+' : totalPending}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#1A1A1A] to-[#333]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center">
                  <Brain size={16} className="text-[#EAD07D]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">AI Agent Alerts</h3>
                  <p className="text-[10px] text-white/60">
                    {totalPending} pending {totalPending === 1 ? 'alert' : 'alerts'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Priority Summary */}
            {totalPending > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F8F6] border-b border-gray-100">
                {urgentCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#1A1A1A] text-[#EAD07D] text-[10px] font-bold rounded">
                    {urgentCount} URGENT
                  </span>
                )}
                {alerts.filter(a => a.priority === 'HIGH').length > 0 && (
                  <span className="px-2 py-0.5 bg-[#EAD07D] text-[#1A1A1A] text-[10px] font-bold rounded">
                    {alerts.filter(a => a.priority === 'HIGH').length} HIGH
                  </span>
                )}
              </div>
            )}

            {/* Alert List */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#EAD07D] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-14 h-14 bg-[#93C01F]/20 rounded-full flex items-center justify-center mb-4">
                    <Check size={28} className="text-[#93C01F]" />
                  </div>
                  <p className="text-sm font-medium text-[#1A1A1A]">All clear!</p>
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
                    onClose={() => setIsOpen(false)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {alerts.length > 0 && (
              <div className="border-t border-gray-100 p-3 bg-[#F8F8F6]">
                <Link
                  to="/dashboard/alerts"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#1A1A1A] bg-white hover:bg-[#EAD07D]/10 rounded-xl transition-colors border border-black/5"
                >
                  View All Alerts
                  <ChevronRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AlertsDropdown;
