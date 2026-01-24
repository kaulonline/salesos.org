import React, { useState, useEffect } from 'react';
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
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Activity,
  Brain,
  Target,
  Users,
  Calendar,
  MessageSquare,
  RefreshCw,
  Eye,
  Lightbulb
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'active' | 'paused' | 'configuring';
  tasksCompleted: number;
  tasksToday: number;
  efficiency: number;
  lastActive: string;
  capabilities: string[];
}

interface AgentActivity {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  target: string;
  result: 'success' | 'pending' | 'failed';
  timestamp: string;
  details?: string;
}

const AI_AGENTS: AIAgent[] = [
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Automatically enriches leads with company data, social profiles, and buying signals.',
    icon: Search,
    status: 'active',
    tasksCompleted: 1247,
    tasksToday: 34,
    efficiency: 98,
    lastActive: '2 min ago',
    capabilities: ['Lead Enrichment', 'Company Research', 'News Monitoring', 'Tech Stack Detection']
  },
  {
    id: 'outreach',
    name: 'Outreach Agent',
    description: 'Drafts personalized emails and sequences based on prospect behavior and context.',
    icon: Mail,
    status: 'active',
    tasksCompleted: 892,
    tasksToday: 28,
    efficiency: 94,
    lastActive: '5 min ago',
    capabilities: ['Email Drafting', 'Sequence Automation', 'A/B Testing', 'Send Time Optimization']
  },
  {
    id: 'forecast',
    name: 'Forecast Agent',
    description: 'Analyzes pipeline health and predicts deal outcomes with confidence scoring.',
    icon: TrendingUp,
    status: 'active',
    tasksCompleted: 156,
    tasksToday: 12,
    efficiency: 91,
    lastActive: '10 min ago',
    capabilities: ['Win Probability', 'Revenue Forecast', 'Risk Detection', 'Trend Analysis']
  },
  {
    id: 'meeting',
    name: 'Meeting Prep Agent',
    description: 'Prepares briefing docs before meetings with key insights and talking points.',
    icon: Calendar,
    status: 'active',
    tasksCompleted: 423,
    tasksToday: 8,
    efficiency: 96,
    lastActive: '15 min ago',
    capabilities: ['Meeting Briefs', 'Attendee Research', 'Agenda Suggestions', 'Follow-up Drafts']
  },
  {
    id: 'call',
    name: 'Call Intelligence Agent',
    description: 'Analyzes call recordings for sentiment, objections, and next steps.',
    icon: Phone,
    status: 'paused',
    tasksCompleted: 234,
    tasksToday: 0,
    efficiency: 89,
    lastActive: '2 hours ago',
    capabilities: ['Call Transcription', 'Sentiment Analysis', 'Action Item Extraction', 'Coaching Insights']
  },
  {
    id: 'document',
    name: 'Document Agent',
    description: 'Auto-generates proposals, contracts, and decks from templates and deal data.',
    icon: FileText,
    status: 'configuring',
    tasksCompleted: 67,
    tasksToday: 0,
    efficiency: 87,
    lastActive: 'Configuring...',
    capabilities: ['Proposal Generation', 'Contract Assembly', 'Deck Creation', 'Template Management']
  }
];

const RECENT_ACTIVITY: AgentActivity[] = [
  { id: '1', agentId: 'research', agentName: 'Research Agent', action: 'Enriched contact', target: 'Sarah Chen @ Vertex Tech', result: 'success', timestamp: '2 min ago', details: 'Added LinkedIn, funding info, tech stack' },
  { id: '2', agentId: 'outreach', agentName: 'Outreach Agent', action: 'Drafted email', target: 'Follow-up for GlobalBank', result: 'pending', timestamp: '5 min ago', details: 'Waiting for approval' },
  { id: '3', agentId: 'forecast', agentName: 'Forecast Agent', action: 'Updated probability', target: 'Acme Corp deal', result: 'success', timestamp: '10 min ago', details: 'Increased from 45% to 62%' },
  { id: '4', agentId: 'meeting', agentName: 'Meeting Prep', action: 'Generated brief', target: 'Nebula Inc demo', result: 'success', timestamp: '15 min ago', details: '3-page briefing doc ready' },
  { id: '5', agentId: 'research', agentName: 'Research Agent', action: 'Detected signal', target: 'TechFlow raised Series B', result: 'success', timestamp: '22 min ago', details: 'Funding alert triggered' },
  { id: '6', agentId: 'outreach', agentName: 'Outreach Agent', action: 'Sent sequence email', target: 'James Wilson @ GlobalBank', result: 'success', timestamp: '30 min ago', details: 'Step 3 of 5 sent' },
];

export const AIAgents: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredAgents = AI_AGENTS.filter(agent => {
    if (filter === 'all') return true;
    if (filter === 'active') return agent.status === 'active';
    if (filter === 'paused') return agent.status === 'paused' || agent.status === 'configuring';
    return true;
  });

  const totalTasksToday = AI_AGENTS.reduce((sum, a) => sum + a.tasksToday, 0);
  const activeAgents = AI_AGENTS.filter(a => a.status === 'active').length;
  const avgEfficiency = Math.round(AI_AGENTS.reduce((sum, a) => sum + a.efficiency, 0) / AI_AGENTS.length);

  if (isLoading) {
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

  return (
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
                <h1 className="text-3xl font-medium text-[#1A1A1A]">AI Agents</h1>
                <p className="text-sm text-[#666]">Your autonomous sales workforce</p>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors shadow-lg">
            <Plus size={18} />
            Create Custom Agent
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <Activity size={20} className="text-[#EAD07D]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{activeAgents}/{AI_AGENTS.length}</div>
            <div className="text-xs text-[#666] font-medium">Agents Active</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Zap size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{totalTasksToday}</div>
            <div className="text-xs text-[#666] font-medium">Tasks Today</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <Target size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{avgEfficiency}%</div>
            <div className="text-xs text-[#666] font-medium">Avg Efficiency</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-[#EAD07D] border-[#EAD07D]">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <Clock size={20} className="text-[#EAD07D]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">12.4h</div>
            <div className="text-xs text-[#1A1A1A]/70 font-medium">Time Saved Today</div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { value: 'all', label: 'All Agents' },
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' }
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
                    <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D] shadow-lg">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#1A1A1A]">{agent.name}</h3>
                      <Badge
                        variant={agent.status === 'active' ? 'dark' : agent.status === 'paused' ? 'neutral' : 'yellow'}
                        size="sm"
                        dot
                      >
                        {agent.status === 'active' ? 'Active' : agent.status === 'paused' ? 'Paused' : 'Configuring'}
                      </Badge>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-[#F8F8F6] opacity-0 group-hover:opacity-100 transition-all">
                    <MoreHorizontal size={16} className="text-[#666]" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-[#666] mb-4 leading-relaxed line-clamp-2">
                  {agent.description}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-lg font-bold text-[#1A1A1A]">{agent.tasksToday}</div>
                      <div className="text-[10px] text-[#999] uppercase tracking-wide">Today</div>
                    </div>
                    <div className="w-px h-8 bg-gray-100" />
                    <div>
                      <div className="text-lg font-bold text-[#1A1A1A]">{agent.efficiency}%</div>
                      <div className="text-[10px] text-[#999] uppercase tracking-wide">Efficiency</div>
                    </div>
                  </div>
                  <button className={`p-2 rounded-xl transition-all ${
                    agent.status === 'active'
                      ? 'bg-[#1A1A1A] text-[#EAD07D] hover:bg-black'
                      : 'bg-[#F8F8F6] text-[#999] hover:bg-gray-200'
                  }`}>
                    {agent.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Activity Feed */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#FAFAF8]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#EAD07D] animate-pulse shadow-[0_0_8px_#EAD07D]" />
              <h3 className="font-bold text-[#1A1A1A]">Live Activity</h3>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-white transition-colors">
              <RefreshCw size={14} className="text-[#666]" />
            </button>
          </div>
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {RECENT_ACTIVITY.map((activity, i) => (
              <div
                key={activity.id}
                className="flex gap-3 p-3 rounded-xl hover:bg-[#F8F8F6] transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D] shrink-0">
                  <Bot size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#1A1A1A]">{activity.agentName}</span>
                    <span className="text-xs text-[#999]">•</span>
                    <span className="text-xs text-[#999]">{activity.timestamp}</span>
                  </div>
                  <p className="text-sm text-[#666]">
                    {activity.action} <span className="font-medium text-[#1A1A1A]">{activity.target}</span>
                  </p>
                  {activity.details && (
                    <p className="text-xs text-[#999] mt-1">{activity.details}</p>
                  )}
                </div>
                {activity.result === 'success' && (
                  <CheckCircle2 size={16} className="text-[#1A1A1A] shrink-0" />
                )}
                {activity.result === 'pending' && (
                  <Clock size={16} className="text-[#EAD07D] shrink-0" />
                )}
                {activity.result === 'failed' && (
                  <AlertCircle size={16} className="text-[#999] shrink-0" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Selected Agent Detail Panel */}
      {selectedAgent && (
        <Card className="p-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left: Agent Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D] shadow-xl">
                  <selectedAgent.icon size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">{selectedAgent.name}</h2>
                  <p className="text-[#666]">{selectedAgent.description}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">Capabilities</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedAgent.capabilities.map(cap => (
                  <Badge key={cap} variant="outline" size="md">
                    {cap}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#F8F8F6] p-4 rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A1A]">{selectedAgent.tasksCompleted.toLocaleString()}</div>
                  <div className="text-xs text-[#666]">Total Tasks</div>
                </div>
                <div className="bg-[#F8F8F6] p-4 rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A1A]">{selectedAgent.efficiency}%</div>
                  <div className="text-xs text-[#666]">Success Rate</div>
                </div>
                <div className="bg-[#F8F8F6] p-4 rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A1A]">{selectedAgent.tasksToday}</div>
                  <div className="text-xs text-[#666]">Today</div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="w-full md:w-64 space-y-3">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors">
                <Settings size={16} />
                Configure Agent
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-[#1A1A1A] rounded-full font-medium hover:bg-[#F8F8F6] transition-colors">
                <Eye size={16} />
                View Logs
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-[#1A1A1A] rounded-full font-medium hover:bg-[#F8F8F6] transition-colors">
                <Lightbulb size={16} />
                Training Data
              </button>
              {selectedAgent.status === 'active' ? (
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F8F8F6] border border-gray-200 text-[#666] rounded-full font-medium hover:bg-gray-200 transition-colors">
                  <Pause size={16} />
                  Pause Agent
                </button>
              ) : (
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-medium hover:bg-[#d4bd71] transition-colors">
                  <Play size={16} />
                  Activate Agent
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* AI Insights Banner */}
      <Card variant="dark" className="p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EAD07D]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAD07D] flex items-center justify-center">
              <Sparkles size={24} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">AI Agent Insights</h3>
              <p className="text-white/60 text-sm">Your agents saved you 12.4 hours today and completed 82 tasks autonomously.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white text-[#1A1A1A] rounded-full font-medium hover:bg-gray-100 transition-colors">
              View Report
            </button>
            <button className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-full font-medium hover:bg-white/20 transition-colors">
              Agent Settings
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
