import React, { useState, useMemo } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  Pause,
  Settings,
  Zap,
  Mail,
  Phone,
  Search,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Activity,
  Brain,
  Target,
  Calendar,
  RefreshCw,
  Eye,
  Lightbulb,
  MoreHorizontal,
  ChevronRight,
  Users,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useFeatureFlags, useAgentAlerts, useAgentQueue } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import { FeatureGate, Features } from '../../src/components/FeatureGate';
import { AgentType } from '../../src/api/agentAlerts';
import { formatDistanceToNow } from 'date-fns';

interface AIAgentConfig {
  id: AgentType;
  name: string;
  description: string;
  icon: React.ElementType;
  capabilities: string[];
  status: 'enabled' | 'disabled' | 'coming_soon';
  color: string;
}

const AI_AGENT_CONFIGS: AIAgentConfig[] = [
  {
    id: 'DEAL_HEALTH',
    name: 'Deal Health Agent',
    description: 'Monitors deal health and alerts you to at-risk opportunities before they slip away.',
    icon: TrendingUp,
    capabilities: ['Risk Detection', 'Health Scoring', 'Stall Alerts', 'Win Probability'],
    status: 'enabled',
    color: '#93C01F',
  },
  {
    id: 'PIPELINE_ACCELERATION',
    name: 'Pipeline Agent',
    description: 'Identifies bottlenecks and provides recommendations to accelerate deal velocity.',
    icon: Zap,
    capabilities: ['Bottleneck Detection', 'Stage Optimization', 'Velocity Tracking', 'Forecast Accuracy'],
    status: 'enabled',
    color: '#EAD07D',
  },
  {
    id: 'ACCOUNT_INTELLIGENCE',
    name: 'Account Intelligence',
    description: 'Enriches accounts with insights, identifies expansion opportunities, and tracks engagement.',
    icon: Users,
    capabilities: ['Account Enrichment', 'Expansion Signals', 'Risk Monitoring', 'Stakeholder Mapping'],
    status: 'enabled',
    color: '#666666',
  },
  {
    id: 'OUTREACH_OPTIMIZATION',
    name: 'Outreach Agent',
    description: 'Optimizes your outreach with personalized messaging recommendations and timing insights.',
    icon: Mail,
    capabilities: ['Email Optimization', 'Send Time Analysis', 'Message Personalization', 'Sequence Automation'],
    status: 'enabled',
    color: '#1A1A1A',
  },
  {
    id: 'COACHING',
    name: 'Sales Coach',
    description: 'Provides real-time coaching insights based on your activities and performance patterns.',
    icon: Lightbulb,
    capabilities: ['Activity Analysis', 'Best Practice Tips', 'Performance Insights', 'Skill Development'],
    status: 'enabled',
    color: '#EAD07D',
  },
];

export const AIAgents: React.FC = () => {
  const { featureFlags, loading: flagsLoading } = useFeatureFlags();
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<AIAgentConfig | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configAgent, setConfigAgent] = useState<AIAgentConfig | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentType, 'enabled' | 'disabled'>>({
    DEAL_HEALTH: 'enabled',
    PIPELINE_ACCELERATION: 'enabled',
    ACCOUNT_INTELLIGENCE: 'enabled',
    OUTREACH_OPTIMIZATION: 'enabled',
    COACHING: 'enabled',
  });

  const handleOpenConfig = (agent: AIAgentConfig, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfigAgent(agent);
    setShowConfigModal(true);
  };

  const handleToggleAgent = (agentId: AgentType, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAgentStatuses(prev => ({
      ...prev,
      [agentId]: prev[agentId] === 'enabled' ? 'disabled' : 'enabled',
    }));
  };

  // Get real agent data
  const { data: alerts = [], isLoading: alertsLoading } = useAgentAlerts({
    limit: 100,
  });

  // Calculate stats from real data
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayAlerts = alerts.filter(a => new Date(a.createdAt) >= today);
    const weekAlerts = alerts.filter(a => new Date(a.createdAt) >= thisWeek);
    const actionedAlerts = alerts.filter(a => a.status === 'ACTIONED');
    const pendingAlerts = alerts.filter(a => a.status === 'PENDING');

    // Calculate efficiency (actioned / total)
    const efficiency = alerts.length > 0
      ? Math.round((actionedAlerts.length / alerts.length) * 100)
      : 0;

    // Estimate time saved (5 min per alert actioned)
    const timeSaved = actionedAlerts.length * 5;

    // Group alerts by agent
    const alertsByAgent: Record<AgentType, number> = {
      DEAL_HEALTH: 0,
      PIPELINE_ACCELERATION: 0,
      ACCOUNT_INTELLIGENCE: 0,
      OUTREACH_OPTIMIZATION: 0,
      COACHING: 0,
    };

    alerts.forEach(a => {
      if (alertsByAgent[a.agentType] !== undefined) {
        alertsByAgent[a.agentType]++;
      }
    });

    return {
      todayCount: todayAlerts.length,
      weekCount: weekAlerts.length,
      actionedCount: actionedAlerts.length,
      pendingCount: pendingAlerts.length,
      efficiency,
      timeSaved,
      alertsByAgent,
    };
  }, [alerts]);

  // Recent activity for each agent
  const recentAlertsByAgent = useMemo(() => {
    const byAgent: Record<AgentType, typeof alerts> = {
      DEAL_HEALTH: [],
      PIPELINE_ACCELERATION: [],
      ACCOUNT_INTELLIGENCE: [],
      OUTREACH_OPTIMIZATION: [],
      COACHING: [],
    };

    alerts.forEach(alert => {
      if (byAgent[alert.agentType]) {
        byAgent[alert.agentType].push(alert);
      }
    });

    // Sort each and take top 3
    Object.keys(byAgent).forEach(key => {
      byAgent[key as AgentType] = byAgent[key as AgentType]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
    });

    return byAgent;
  }, [alerts]);

  const aiEnabled = useMemo(() => {
    if (!featureFlags) return true;
    const flag = featureFlags.find(f => f.key === 'ai_enabled' || f.key === 'ai_agents_enabled');
    return flag?.enabled ?? true;
  }, [featureFlags]);

  const filteredAgents = useMemo(() => {
    return AI_AGENT_CONFIGS.filter(agent => {
      if (filter === 'all') return true;
      return agentStatuses[agent.id] === filter;
    });
  }, [filter, agentStatuses]);

  const loading = flagsLoading || alertsLoading;
  const enabledCount = Object.values(agentStatuses).filter(s => s === 'enabled').length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  if (!aiEnabled) {
    return (
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#EAD07D] to-[#D4B85C] flex items-center justify-center mb-6 shadow-lg">
            <Brain size={40} className="text-[#1A1A1A]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">AI Agents Not Enabled</h2>
          <p className="text-[#666] mb-6 text-center max-w-md">
            AI Agents are not enabled for your organization. Contact your administrator to enable this feature.
          </p>
          {user?.role === 'ADMIN' && (
            <Link
              to="/dashboard/admin"
              className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors"
            >
              Enable in Admin Settings
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature={Features.CUSTOM_AGENTS}>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EAD07D] to-[#D4B85C] flex items-center justify-center shadow-lg shadow-[#EAD07D]/20">
                  <Brain size={24} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h1 className="text-3xl font-medium text-[#1A1A1A]">AI Agent Dashboard</h1>
                  <p className="text-sm text-[#666]">Monitor and manage your autonomous sales agents</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard/alerts"
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/10 text-[#1A1A1A] rounded-full font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                <AlertCircle size={16} />
                View All Alerts ({stats.pendingCount})
              </Link>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors shadow-lg"
              >
                <Settings size={18} />
                Agent Settings
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Activity size={20} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{enabledCount}</div>
              <div className="text-xs text-[#666] font-medium">Agents Active</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Zap size={20} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.todayCount}</div>
              <div className="text-xs text-[#666] font-medium">Alerts Today</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
              <Target size={20} className="text-[#93C01F]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.efficiency}%</div>
              <div className="text-xs text-[#666] font-medium">Action Rate</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 bg-[#EAD07D] border-[#EAD07D]">
            <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Clock size={20} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">
                {stats.timeSaved >= 60 ? `${Math.floor(stats.timeSaved / 60)}h` : `${stats.timeSaved}m`}
              </div>
              <div className="text-xs text-[#1A1A1A]/70 font-medium">Time Saved</div>
            </div>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { value: 'all', label: 'All Agents' },
            { value: 'enabled', label: 'Enabled' },
            { value: 'disabled', label: 'Disabled' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === tab.value
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'bg-white text-[#666] hover:bg-[#F8F8F6] border border-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Agent Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map((agent, index) => {
              const Icon = agent.icon;
              const alertCount = stats.alertsByAgent[agent.id] || 0;
              const recentAlerts = recentAlertsByAgent[agent.id] || [];

              return (
                <Card
                  key={agent.id}
                  className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-300 group ${
                    selectedAgent?.id === agent.id ? 'ring-2 ring-[#EAD07D] shadow-lg' : ''
                  }`}
                  onClick={() => setSelectedAgent(agent)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: `${agent.color}20` }}
                      >
                        <Icon size={22} style={{ color: agent.color }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1A1A1A]">{agent.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={agentStatuses[agent.id] === 'enabled' ? 'green' : 'outline'}
                            size="sm"
                            dot={agentStatuses[agent.id] === 'enabled'}
                          >
                            {agentStatuses[agent.id] === 'enabled' ? 'Active' : 'Disabled'}
                          </Badge>
                          {alertCount > 0 && (
                            <span className="text-xs text-[#666]">{alertCount} alerts</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[#666] mb-4 leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>

                  {/* Recent Activity */}
                  {recentAlerts.length > 0 ? (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-medium text-[#999]">Recent Activity</p>
                      {recentAlerts.slice(0, 2).map(alert => (
                        <div key={alert.id} className="flex items-start gap-2 text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            alert.priority === 'URGENT' ? 'bg-[#1A1A1A]' :
                            alert.priority === 'HIGH' ? 'bg-[#EAD07D]' : 'bg-[#999]'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[#666] truncate">{alert.title}</p>
                            <p className="text-[#999]">
                              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 py-3 text-center bg-[#F8F8F6] rounded-xl">
                      <p className="text-xs text-[#999]">No recent activity</p>
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenConfig(agent, e)}
                      className="flex-1 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#EAD07D] transition-colors"
                    >
                      Configure
                    </button>
                    <Link
                      to={`/dashboard/alerts?agentType=${agent.id}`}
                      className="px-3 py-2.5 bg-[#1A1A1A] text-white rounded-xl hover:bg-black transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Info Panel */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#FAFAF8]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#EAD07D]" />
                <h3 className="font-bold text-[#1A1A1A]">Agent Details</h3>
              </div>
            </div>
            <div className="p-6">
              {selectedAgent ? (
                <div className="animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${selectedAgent.color}20` }}
                    >
                      <selectedAgent.icon size={18} style={{ color: selectedAgent.color }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A]">{selectedAgent.name}</h4>
                      <p className="text-xs text-[#666]">
                        {stats.alertsByAgent[selectedAgent.id] || 0} alerts generated
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[#666] mb-4">{selectedAgent.description}</p>

                  <h5 className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Capabilities</h5>
                  <div className="space-y-2 mb-6">
                    {selectedAgent.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[#666]">
                        <CheckCircle2 size={14} className="text-[#EAD07D]" />
                        {cap}
                      </div>
                    ))}
                  </div>

                  {/* Agent Performance */}
                  <h5 className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Performance</h5>
                  <div className="bg-[#F8F8F6] rounded-xl p-4 mb-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#666]">Alerts Generated</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {stats.alertsByAgent[selectedAgent.id] || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#666]">Actioned</span>
                      <span className="font-medium text-[#93C01F]">
                        {Math.round((stats.alertsByAgent[selectedAgent.id] || 0) * (stats.efficiency / 100))}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenConfig(selectedAgent)}
                      className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => handleToggleAgent(selectedAgent.id)}
                      className="px-4 py-3 bg-[#F8F8F6] text-[#666] rounded-xl hover:bg-[#F0EBD8] transition-colors"
                    >
                      {agentStatuses[selectedAgent.id] === 'enabled' ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bot size={48} className="mx-auto mb-4 text-[#999] opacity-40" />
                  <p className="text-sm text-[#666] mb-2">Select an agent to learn more</p>
                  <p className="text-xs text-[#999]">Click on any agent card to see details and configuration</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Alerts Section */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-[#1A1A1A]">Recent Agent Activity</h3>
            <Link
              to="/dashboard/alerts"
              className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="py-12 text-center">
              <Activity size={40} className="mx-auto text-[#999] opacity-40 mb-3" />
              <p className="text-[#666]">No agent activity yet</p>
              <p className="text-sm text-[#999]">Agent insights will appear here as they're generated</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => {
                const agentConfig = AI_AGENT_CONFIGS.find(a => a.id === alert.agentType);
                const Icon = agentConfig?.icon || Brain;

                return (
                  <Link
                    key={alert.id}
                    to={`/dashboard/alerts?id=${alert.id}`}
                    className="flex items-start gap-4 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${agentConfig?.color || '#666'}20` }}
                    >
                      <Icon size={18} style={{ color: agentConfig?.color || '#666' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-[#1A1A1A] text-sm">{alert.title}</p>
                          <p className="text-xs text-[#666] mt-0.5 line-clamp-1">{alert.description}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                          alert.priority === 'URGENT' ? 'bg-[#1A1A1A] text-[#EAD07D]' :
                          alert.priority === 'HIGH' ? 'bg-[#EAD07D] text-[#1A1A1A]' :
                          'bg-[#F0EBD8] text-[#666]'
                        }`}>
                          {alert.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#999]">
                        <span>{agentConfig?.name || 'Agent'}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                        {alert.status !== 'PENDING' && (
                          <>
                            <span>•</span>
                            <span className={alert.status === 'ACTIONED' ? 'text-[#93C01F]' : 'text-[#999]'}>
                              {alert.status.toLowerCase()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* AI Insights Banner */}
        <Card variant="dark" className="p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#EAD07D]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EAD07D] flex items-center justify-center">
                <Sparkles size={24} className="text-[#1A1A1A]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">AI-Powered Sales Intelligence</h3>
                <p className="text-white/60 text-sm">
                  Your agents have analyzed {alerts.length} opportunities and generated {stats.actionedCount} actionable insights this week.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/dashboard/conversations"
                className="px-5 py-2.5 bg-white text-[#1A1A1A] rounded-full font-medium hover:bg-gray-100 transition-colors"
              >
                Conversation Intelligence
              </Link>
              <Link
                to="/dashboard/knowledge"
                className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-full font-medium hover:bg-white/20 transition-colors"
              >
                Knowledge Base
              </Link>
            </div>
          </div>
        </Card>

        {/* Agent Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 pb-0">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Agent Settings</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-[#666] mb-4">Manage your AI agent preferences and notification settings.</p>

                <div className="space-y-3">
                  {AI_AGENT_CONFIGS.map(agent => {
                    const Icon = agent.icon;
                    return (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${agent.color}20` }}
                          >
                            <Icon size={16} style={{ color: agent.color }} />
                          </div>
                          <span className="text-sm font-medium text-[#1A1A1A]">{agent.name}</span>
                        </div>
                        <button
                          onClick={() => handleToggleAgent(agent.id)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            agentStatuses[agent.id] === 'enabled' ? 'bg-[#93C01F]' : 'bg-[#E0E0E0]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${
                            agentStatuses[agent.id] === 'enabled' ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Notification Preferences</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#EAD07D]" />
                      <span className="text-sm text-[#666]">Email notifications for urgent alerts</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#EAD07D]" />
                      <span className="text-sm text-[#666]">In-app notifications</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-[#EAD07D]" />
                      <span className="text-sm text-[#666]">Daily digest summary</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium hover:bg-[#F0EBD8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent Configuration Modal */}
        {showConfigModal && configAgent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 pb-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${configAgent.color}20` }}
                  >
                    <configAgent.icon size={18} style={{ color: configAgent.color }} />
                  </div>
                  <h2 className="text-xl font-semibold text-[#1A1A1A]">{configAgent.name}</h2>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-[#666]">{configAgent.description}</p>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#1A1A1A]">Alert Sensitivity</h4>
                  <div className="flex gap-2">
                    {['Low', 'Medium', 'High'].map(level => (
                      <button
                        key={level}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          level === 'Medium' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F8F8F6] text-[#666] hover:bg-[#F0EBD8]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#1A1A1A]">Capabilities</h4>
                  <div className="space-y-2">
                    {configAgent.capabilities.map((cap, i) => (
                      <label key={i} className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#EAD07D]" />
                        <span className="text-sm text-[#666]">{cap}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#1A1A1A]">Alert Frequency</h4>
                  <select className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm">
                    <option>Real-time</option>
                    <option>Hourly digest</option>
                    <option>Daily digest</option>
                    <option>Weekly summary</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium hover:bg-[#F0EBD8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
};
