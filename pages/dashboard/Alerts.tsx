import React, { useState } from 'react';
import {
  Brain,
  Filter,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  TrendingUp,
  Zap,
  Users,
  MessageSquare,
  GraduationCap,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAgentAlerts } from '../../src/hooks/useAgentAlerts';
import type { AgentAlert, AgentType, AlertPriority, AlertStatus } from '../../src/api/agentAlerts';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../../components/ui/Skeleton';

// Agent type icons and labels
const agentConfig: Record<AgentType, { icon: React.ReactNode; label: string; color: string }> = {
  DEAL_HEALTH: { icon: <TrendingUp size={16} />, label: 'Deal Health', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]' },
  PIPELINE_ACCELERATION: { icon: <Zap size={16} />, label: 'Pipeline', color: 'bg-[#93C01F]/20 text-[#93C01F]' },
  ACCOUNT_INTELLIGENCE: { icon: <Users size={16} />, label: 'Account Intel', color: 'bg-blue-100 text-blue-600' },
  OUTREACH_OPTIMIZATION: { icon: <MessageSquare size={16} />, label: 'Outreach', color: 'bg-purple-100 text-purple-600' },
  COACHING: { icon: <GraduationCap size={16} />, label: 'Coaching', color: 'bg-[#F0EBD8] text-[#666]' },
};

// Priority styles
const priorityStyles: Record<AlertPriority, { badge: string; border: string }> = {
  URGENT: { badge: 'bg-[#1A1A1A] text-[#EAD07D]', border: 'border-l-[#1A1A1A]' },
  HIGH: { badge: 'bg-[#EAD07D] text-[#1A1A1A]', border: 'border-l-[#EAD07D]' },
  MEDIUM: { badge: 'bg-[#F0EBD8] text-[#666]', border: 'border-l-[#F0EBD8]' },
  LOW: { badge: 'bg-[#F8F8F6] text-[#999]', border: 'border-l-[#999]' },
};

// Status styles
const statusStyles: Record<AlertStatus, { badge: string; icon: React.ReactNode }> = {
  PENDING: { badge: 'bg-[#EAD07D]/20 text-[#1A1A1A]', icon: <Clock size={12} /> },
  ACKNOWLEDGED: { badge: 'bg-blue-100 text-blue-600', icon: <Check size={12} /> },
  ACTIONED: { badge: 'bg-[#93C01F]/20 text-[#93C01F]', icon: <CheckCircle size={12} /> },
  DISMISSED: { badge: 'bg-[#F8F8F6] text-[#999]', icon: <X size={12} /> },
};

export const Alerts: React.FC = () => {
  const [filterPriority, setFilterPriority] = useState<AlertPriority | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'ALL'>('ALL');
  const [filterAgent, setFilterAgent] = useState<AgentType | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters = {
    ...(filterPriority !== 'ALL' && { priority: filterPriority }),
    ...(filterStatus !== 'ALL' && { status: filterStatus }),
    ...(filterAgent !== 'ALL' && { agentType: filterAgent }),
  };

  const {
    alerts,
    totalPending,
    loading,
    isFetching,
    acknowledge,
    dismiss,
    markActioned,
    refetch,
  } = useAgentAlerts(Object.keys(filters).length > 0 ? filters : undefined);

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge(id);
    } catch (error) {
      console.error('Failed to acknowledge:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismiss(id);
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  const handleAction = async (id: string) => {
    try {
      await markActioned(id);
    } catch (error) {
      console.error('Failed to mark as actioned:', error);
    }
  };

  // Stats
  const urgentCount = alerts.filter(a => a.priority === 'URGENT' && a.status === 'PENDING').length;
  const highCount = alerts.filter(a => a.priority === 'HIGH' && a.status === 'PENDING').length;
  const pendingCount = alerts.filter(a => a.status === 'PENDING').length;
  const actionedCount = alerts.filter(a => a.status === 'ACTIONED').length;

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[600px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
              <Brain size={28} className="text-[#EAD07D]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">AI Agent Alerts</h1>
              <p className="text-[#666] mt-1">Insights and recommendations from your AI agents</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                <AlertTriangle size={18} className="text-[#EAD07D]" />
              </div>
              <span className="text-sm text-[#666]">Urgent</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{urgentCount}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D] flex items-center justify-center">
                <TrendingUp size={18} className="text-[#1A1A1A]" />
              </div>
              <span className="text-sm text-[#666]">High Priority</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{highCount}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0EBD8] flex items-center justify-center">
                <Clock size={18} className="text-[#666]" />
              </div>
              <span className="text-sm text-[#666]">Pending</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <CheckCircle size={18} className="text-[#93C01F]" />
              </div>
              <span className="text-sm text-[#666]">Actioned</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{actionedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Filter size={18} className="text-[#999]" />

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as AlertPriority | 'ALL')}
            className="px-4 py-2 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'ALL')}
            className="px-4 py-2 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="ACTIONED">Actioned</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value as AgentType | 'ALL')}
            className="px-4 py-2 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
          >
            <option value="ALL">All Agents</option>
            <option value="DEAL_HEALTH">Deal Health</option>
            <option value="PIPELINE_ACCELERATION">Pipeline</option>
            <option value="ACCOUNT_INTELLIGENCE">Account Intel</option>
            <option value="OUTREACH_OPTIMIZATION">Outreach</option>
            <option value="COACHING">Coaching</option>
          </select>

          {(filterPriority !== 'ALL' || filterStatus !== 'ALL' || filterAgent !== 'ALL') && (
            <button
              onClick={() => {
                setFilterPriority('ALL');
                setFilterStatus('ALL');
                setFilterAgent('ALL');
              }}
              className="px-4 py-2 rounded-full text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 bg-[#93C01F]/20 rounded-full flex items-center justify-center mb-6">
                <Check size={40} className="text-[#93C01F]" />
              </div>
              <p className="text-xl font-medium text-[#1A1A1A] mb-2">All clear!</p>
              <p className="text-[#666] text-center max-w-md">
                No alerts match your current filters. Your AI agents are monitoring your pipeline.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {alerts.map((alert) => {
                const config = agentConfig[alert.agentType];
                const priority = priorityStyles[alert.priority];
                const status = statusStyles[alert.status];
                const isExpanded = expandedId === alert.id;
                const healthScore = alert.metadata?.healthScore;

                return (
                  <div
                    key={alert.id}
                    className={`border-l-4 ${priority.border} transition-colors hover:bg-[#F8F8F6]/50`}
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Agent Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          {config.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${priority.badge}`}>
                              {alert.priority}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${status.badge}`}>
                              {status.icon}
                              {alert.status}
                            </span>
                            <span className="text-xs text-[#999]">{config.label}</span>
                            {healthScore !== undefined && (
                              <span className={`text-xs font-semibold ${
                                healthScore >= 70 ? 'text-[#93C01F]' :
                                healthScore >= 40 ? 'text-[#EAD07D]' :
                                'text-[#1A1A1A]'
                              }`}>
                                Health: {healthScore}/100
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-medium text-[#1A1A1A] mb-1">{alert.title}</h3>
                          <p className="text-sm text-[#666] mb-2">{alert.description}</p>

                          {alert.recommendation && (
                            <p className="text-sm text-[#999] italic mb-2">
                              Recommendation: {alert.recommendation}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-[#999]">
                            <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                            {alert.entityType && alert.entityId && (
                              <Link
                                to={`/dashboard/${alert.entityType.toLowerCase()}s/${alert.entityId}`}
                                className="flex items-center gap-1 text-[#EAD07D] hover:text-[#1A1A1A] font-medium"
                              >
                                View {alert.entityType.toLowerCase()} <ExternalLink size={12} />
                              </Link>
                            )}
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-black/5">
                              {alert.metadata?.riskFactors && alert.metadata.riskFactors.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-[#1A1A1A] mb-2">Risk Factors</p>
                                  <ul className="space-y-1">
                                    {alert.metadata.riskFactors.map((factor, idx) => (
                                      <li key={idx} className="text-sm text-[#666] flex items-start gap-2">
                                        <span className="text-[#1A1A1A] mt-1">•</span>
                                        {factor}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {alert.metadata?.positiveSignals && alert.metadata.positiveSignals.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-[#1A1A1A] mb-2">Positive Signals</p>
                                  <ul className="space-y-1">
                                    {alert.metadata.positiveSignals.map((signal, idx) => (
                                      <li key={idx} className="text-sm text-[#93C01F] flex items-start gap-2">
                                        <span className="mt-1">•</span>
                                        {signal}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {alert.suggestedActions && alert.suggestedActions.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-[#1A1A1A] mb-2">Suggested Actions</p>
                                  <div className="flex flex-wrap gap-2">
                                    {alert.suggestedActions.map((action, idx) => (
                                      <button
                                        key={idx}
                                        className="px-4 py-2 text-sm font-medium bg-[#F8F8F6] text-[#1A1A1A] rounded-full hover:bg-[#EAD07D]/20 transition-colors"
                                      >
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {alert.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                className="p-2 text-[#999] hover:text-[#93C01F] hover:bg-[#93C01F]/10 rounded-xl transition-colors"
                                title="Acknowledge"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleAction(alert.id)}
                                className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#EAD07D]/20 rounded-xl transition-colors"
                                title="Mark as Actioned"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleDismiss(alert.id)}
                                className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-xl transition-colors"
                                title="Dismiss"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                            className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-xl transition-colors"
                          >
                            <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
