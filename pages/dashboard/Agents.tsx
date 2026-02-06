import React, { useState, useEffect } from 'react';
import { Bot, Power, Settings2, Activity, MessageSquare, Search, Phone, Mail, FileText, Zap, X, Play, Pause, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAgents, useAgentAnalytics, useAgentExecutions, useUpdateAgentStatus, useRunAgent } from '../../src/hooks/useAgents';
import { useToast } from '../../src/components/ui/Toast';
import type { AgentType, AgentStatusType, AgentStatus } from '../../src/api/agents';

const AGENT_ICONS: Record<AgentType, React.ElementType> = {
  DEAL_HEALTH: Activity,
  PIPELINE_ACCELERATION: Zap,
  ACCOUNT_INTELLIGENCE: Search,
  OUTREACH_OPTIMIZATION: Mail,
  COACHING: MessageSquare,
  NEXT_BEST_ACTION: FileText,
};

const AGENT_COLORS: Record<AgentType, string> = {
  DEAL_HEALTH: 'bg-[#93C01F]',
  PIPELINE_ACCELERATION: 'bg-[#EAD07D]',
  ACCOUNT_INTELLIGENCE: 'bg-[#1A1A1A]',
  OUTREACH_OPTIMIZATION: 'bg-blue-500',
  COACHING: 'bg-purple-500',
  NEXT_BEST_ACTION: 'bg-[#EAD07D]',
};

const STATUS_STYLES: Record<AgentStatusType, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', dot: 'bg-[#93C01F]' },
  PAUSED: { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', dot: 'bg-[#EAD07D]' },
  ERROR: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
  DISABLED: { bg: 'bg-[#F8F8F6]', text: 'text-[#666]', dot: 'bg-[#999]' },
};

// Helper to derive status from agent data
const getAgentStatus = (agent: AgentStatus): AgentStatusType => {
  if (agent.errorCount > 0 && agent.errorCount > agent.executionCount * 0.5) return 'ERROR';
  if (!agent.enabled) return 'PAUSED';
  return 'ACTIVE';
};

interface AgentConfig {
  maxExecutionsPerDay: number;
  timeoutSeconds: number;
  retryAttempts: number;
  autoApprove: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  maxExecutionsPerDay: 100,
  timeoutSeconds: 30,
  retryAttempts: 3,
  autoApprove: false,
};

export const Agents: React.FC = () => {
  const { agents, loading: isLoading, error, refetch, updateConfig, isUpdating } = useAgents();
  const { analytics } = useAgentAnalytics();
  const { executions } = useAgentExecutions({ limit: 10 });
  const updateStatus = useUpdateAgentStatus();
  const runAgent = useRunAgent();
  const { showToast } = useToast();

  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [configForm, setConfigForm] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Update config form when selected agent changes
  useEffect(() => {
    if (selectedAgent && agents) {
      const agent = agents.find(a => a.type === selectedAgent);
      if (agent?.limits) {
        setConfigForm({
          maxExecutionsPerDay: agent.limits.rateLimitPerDay || 100,
          timeoutSeconds: Math.round((agent.limits.maxExecutionTimeMs || 30000) / 1000),
          retryAttempts: 3, // Not in API yet, use default
          autoApprove: !agent.requiresApproval,
        });
      }
    } else {
      setConfigForm(DEFAULT_CONFIG);
    }
  }, [selectedAgent, agents]);

  const handleToggleAgent = async (type: AgentType, currentStatus: AgentStatusType) => {
    const newStatus: AgentStatusType = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await updateStatus.mutateAsync({ type, status: newStatus });
      showToast({
        type: 'success',
        title: `Agent ${newStatus === 'ACTIVE' ? 'Activated' : 'Paused'}`,
        message: `${type.replace(/_/g, ' ')} is now ${newStatus.toLowerCase()}`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to Update Agent',
        message: (err as Error).message || 'Please try again',
      });
    }
  };

  const handleRunAgent = async (type: AgentType) => {
    try {
      await runAgent.mutateAsync({ type });
      showToast({
        type: 'success',
        title: 'Agent Started',
        message: `${type.replace(/_/g, ' ')} is now running`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to Run Agent',
        message: (err as Error).message || 'Please try again',
      });
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      if (selectedAgent) {
        await updateConfig(selectedAgent, {
          requiresApproval: !configForm.autoApprove,
        });
        showToast({
          type: 'success',
          title: 'Configuration Saved',
          message: `Settings for ${selectedAgent.replace(/_/g, ' ')} have been updated`,
        });
      }
      setShowConfigModal(false);
      setSelectedAgent(null);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to Save Configuration',
        message: (err as Error).message || 'Please try again',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-[24px]" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[280px] rounded-[32px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Agent Orchestration</h1>
          <p className="text-[#666]">Manage your digital workforce.</p>
        </div>
        <Card className="p-12 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Failed to Load Agents</h3>
          <p className="text-[#666] mb-6">There was an error loading your agents. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const activeAgents = agents?.filter(a => a.enabled).length || 0;
  const totalExecutions = agents?.reduce((sum, a) => sum + a.executionCount, 0) || 0;
  const totalErrors = agents?.reduce((sum, a) => sum + a.errorCount, 0) || 0;
  const successRate = totalExecutions > 0 ? ((totalExecutions - totalErrors) / totalExecutions) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Agent Orchestration</h1>
          <p className="text-[#666] max-w-2xl">Manage your digital workforce. Configure autonomy levels, review performance, and assign specific playbooks.</p>
        </div>
        <button
          onClick={() => setShowHireModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-bold shadow-lg hover:bg-[#333] transition-transform hover:scale-105"
        >
          <PlusIcon /> Hire New Agent
        </button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card className="flex items-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
            <Bot size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">{activeAgents}/{agents?.length || 0}</div>
            <div className="text-xs text-[#666]">Active Agents</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">{totalExecutions.toLocaleString()}</div>
            <div className="text-xs text-[#666]">Total Executions</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full bg-[#93C01F]/20 flex items-center justify-center text-[#93C01F]">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <div className="text-xs text-[#666]">Success Rate</div>
          </div>
        </Card>
        <Card
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-4 p-6 border-dashed border-2 border-black/10 bg-transparent shadow-none hover:border-[#1A1A1A] cursor-pointer transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666]">
            <Settings2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-[#1A1A1A]">Global Config</div>
            <div className="text-xs text-[#666]">Safety & Limits</div>
          </div>
        </Card>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents?.map((agent) => {
          const Icon = AGENT_ICONS[agent.type] || Bot;
          const color = AGENT_COLORS[agent.type] || 'bg-[#1A1A1A]';
          const agentStatus = getAgentStatus(agent);
          const statusStyle = STATUS_STYLES[agentStatus] || STATUS_STYLES.DISABLED;
          const isActive = agent.enabled;

          return (
            <div
              key={agent.type}
              className={`group relative bg-white rounded-[32px] p-8 border transition-all duration-300 ${
                isActive ? 'border-black/5 shadow-sm hover:shadow-lg' : 'border-black/5 opacity-80'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4">
                  <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1A1A]">{agent.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="dark" size="sm">{agent.type.replace(/_/g, ' ')}</Badge>
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${statusStyle.text} ${statusStyle.bg} px-2 py-0.5 rounded-full`}>
                        <span className={`w-1.5 h-1.5 ${statusStyle.dot} rounded-full ${isActive ? 'animate-pulse' : ''}`}></span>
                        {agentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleAgent(agent.type, agentStatus)}
                  disabled={updateStatus.isPending}
                  className={`w-12 h-8 rounded-full flex items-center px-1 transition-colors ${
                    isActive ? 'bg-[#1A1A1A] justify-end' : 'bg-[#F8F8F6] justify-start'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              {/* Description */}
              <p className="text-[#666] mb-8 min-h-[48px] text-sm leading-relaxed">
                {agent.description}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8 bg-[#F8F8F6] p-4 rounded-2xl">
                <div>
                  <div className="text-lg font-bold text-[#1A1A1A]">{agent.executionCount}</div>
                  <div className="text-[10px] uppercase font-bold text-[#999] tracking-wider">Executions</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#1A1A1A]">
                    {agent.executionCount > 0 ? Math.round(((agent.executionCount - agent.errorCount) / agent.executionCount) * 100) : 0}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-[#999] tracking-wider">Success</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#1A1A1A]">{agent.errorCount}</div>
                  <div className="text-[10px] uppercase font-bold text-[#999] tracking-wider">Errors</div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedAgent(agent.type);
                    setShowConfigModal(true);
                  }}
                  className="flex-1 py-3 rounded-xl border border-black/10 font-bold text-sm hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Settings2 size={16} /> Configure
                </button>
                <button
                  onClick={() => {
                    setSelectedAgent(agent.type);
                    setShowLogsModal(true);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#F2F1EA] text-[#1A1A1A] font-bold text-sm hover:bg-[#EAD07D] transition-colors flex items-center justify-center gap-2"
                >
                  <Activity size={16} /> View Logs
                </button>
              </div>

              {/* Run Agent Button */}
              {isActive && (
                <button
                  onClick={() => handleRunAgent(agent.type)}
                  disabled={runAgent.isPending}
                  className="absolute top-8 right-24 w-10 h-10 rounded-full bg-[#93C01F] text-white flex items-center justify-center hover:bg-[#7AA019] transition-colors shadow-lg"
                  title="Run agent now"
                >
                  <Play size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Hire New Agent Modal */}
      {showHireModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">Hire New Agent</h2>
              <button onClick={() => setShowHireModal(false)} className="text-[#666] hover:text-[#1A1A1A]">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 pt-6">
              <p className="text-[#666] mb-6">
                All available agent types are already configured in your workspace. You can activate any paused agent using the toggle switch.
              </p>
              <div className="space-y-3">
                {agents?.filter(a => !a.enabled).map(agent => {
                  const status = getAgentStatus(agent);
                  return (
                    <div key={agent.type} className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${AGENT_COLORS[agent.type]} flex items-center justify-center text-white`}>
                          {React.createElement(AGENT_ICONS[agent.type] || Bot, { size: 20 })}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1A1A1A]">{agent.name}</div>
                          <div className="text-xs text-[#666]">{status}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleToggleAgent(agent.type, status);
                          setShowHireModal(false);
                        }}
                        className="px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333]"
                      >
                        Activate
                      </button>
                    </div>
                  );
                })}
                {agents?.every(a => a.enabled) && (
                  <p className="text-center text-[#666] py-4">All agents are already active!</p>
                )}
              </div>
              <button
                onClick={() => setShowHireModal(false)}
                className="w-full mt-6 py-3 border border-black/10 rounded-full font-medium text-[#666] hover:bg-[#F8F8F6]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Agent Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">
                {selectedAgent ? `Configure ${selectedAgent.replace(/_/g, ' ')}` : 'Global Configuration'}
              </h2>
              <button onClick={() => { setShowConfigModal(false); setSelectedAgent(null); }} className="text-[#666] hover:text-[#1A1A1A]">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Max Executions per Day</label>
                  <input
                    type="number"
                    value={configForm.maxExecutionsPerDay}
                    onChange={(e) => setConfigForm({ ...configForm, maxExecutionsPerDay: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={configForm.timeoutSeconds}
                    onChange={(e) => setConfigForm({ ...configForm, timeoutSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Retry Attempts</label>
                  <input
                    type="number"
                    value={configForm.retryAttempts}
                    onChange={(e) => setConfigForm({ ...configForm, retryAttempts: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <div className="font-medium text-[#1A1A1A]">Auto-approve actions</div>
                    <div className="text-xs text-[#666]">Allow agent to take actions without confirmation</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigForm({ ...configForm, autoApprove: !configForm.autoApprove })}
                    className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                      configForm.autoApprove ? 'bg-[#1A1A1A] justify-end' : 'bg-[#F0EBD8] justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm"></div>
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowConfigModal(false); setSelectedAgent(null); }}
                  disabled={isSavingConfig}
                  className="flex-1 py-3 border border-black/10 rounded-full font-medium text-[#666] hover:bg-[#F8F8F6] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingConfig ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Logs Modal */}
      {showLogsModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">
                {selectedAgent.replace(/_/g, ' ')} Logs
              </h2>
              <button onClick={() => { setShowLogsModal(false); setSelectedAgent(null); }} className="text-[#666] hover:text-[#1A1A1A]">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 pt-6 overflow-y-auto flex-1">
              {executions?.filter(e => e.agentType === selectedAgent).length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">No execution logs yet</p>
                  <p className="text-sm text-[#999]">Run the agent to see logs here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executions?.filter(e => e.agentType === selectedAgent).map((execution) => (
                    <div key={execution.id} className="p-4 bg-[#F8F8F6] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          execution.status === 'COMPLETED' ? 'bg-[#93C01F]/20 text-[#93C01F]' :
                          execution.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                          'bg-[#EAD07D]/20 text-[#1A1A1A]'
                        }`}>
                          {execution.status}
                        </span>
                        <span className="text-xs text-[#999]">
                          {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : new Date(execution.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {execution.durationMs && (
                        <p className="text-sm text-[#666]">Duration: {(execution.durationMs / 1000).toFixed(2)}s</p>
                      )}
                      {execution.error && (
                        <p className="text-sm text-red-600 mt-2">{execution.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setShowLogsModal(false); setSelectedAgent(null); }}
                className="w-full mt-6 py-3 border border-black/10 rounded-full font-medium text-[#666] hover:bg-[#F8F8F6]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
