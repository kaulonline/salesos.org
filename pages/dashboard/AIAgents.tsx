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
  MoreHorizontal
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useFeatureFlags } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import { FeatureGate, Features } from '../../src/components/FeatureGate';

interface AIAgentConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  capabilities: string[];
  status: 'available' | 'coming_soon';
}

const AI_AGENT_CONFIGS: AIAgentConfig[] = [
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Automatically enriches leads with company data, social profiles, and buying signals.',
    icon: Search,
    capabilities: ['Lead Enrichment', 'Company Research', 'News Monitoring', 'Tech Stack Detection'],
    status: 'available'
  },
  {
    id: 'outreach',
    name: 'Outreach Agent',
    description: 'Drafts personalized emails and sequences based on prospect behavior and context.',
    icon: Mail,
    capabilities: ['Email Drafting', 'Sequence Automation', 'A/B Testing', 'Send Time Optimization'],
    status: 'available'
  },
  {
    id: 'forecast',
    name: 'Forecast Agent',
    description: 'Analyzes pipeline health and predicts deal outcomes with confidence scoring.',
    icon: TrendingUp,
    capabilities: ['Win Probability', 'Revenue Forecast', 'Risk Detection', 'Trend Analysis'],
    status: 'available'
  },
  {
    id: 'meeting',
    name: 'Meeting Prep Agent',
    description: 'Prepares briefing docs before meetings with key insights and talking points.',
    icon: Calendar,
    capabilities: ['Meeting Briefs', 'Attendee Research', 'Agenda Suggestions', 'Follow-up Drafts'],
    status: 'available'
  },
  {
    id: 'call',
    name: 'Call Intelligence Agent',
    description: 'Analyzes call recordings for sentiment, objections, and next steps.',
    icon: Phone,
    capabilities: ['Call Transcription', 'Sentiment Analysis', 'Action Item Extraction', 'Coaching Insights'],
    status: 'coming_soon'
  },
  {
    id: 'document',
    name: 'Document Agent',
    description: 'Auto-generates proposals, contracts, and decks from templates and deal data.',
    icon: FileText,
    capabilities: ['Proposal Generation', 'Contract Assembly', 'Deck Creation', 'Template Management'],
    status: 'coming_soon'
  }
];

export const AIAgents: React.FC = () => {
  const { featureFlags, loading } = useFeatureFlags();
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<AIAgentConfig | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'coming_soon'>('all');

  const aiEnabled = useMemo(() => {
    if (!featureFlags) return true; // Default to enabled while loading
    const flag = featureFlags.find(f => f.key === 'ai_enabled' || f.key === 'ai_agents_enabled');
    return flag?.enabled ?? true;
  }, [featureFlags]);

  const filteredAgents = useMemo(() => {
    return AI_AGENT_CONFIGS.filter(agent => {
      if (filter === 'all') return true;
      return agent.status === filter;
    });
  }, [filter]);

  const availableCount = AI_AGENT_CONFIGS.filter(a => a.status === 'available').length;
  const comingSoonCount = AI_AGENT_CONFIGS.filter(a => a.status === 'coming_soon').length;

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
            AI Agents are not enabled for your organization. Contact your administrator to enable this feature
            and unlock autonomous sales workflows.
          </p>
          {user?.role === 'ADMIN' && (
            <button className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors">
              Enable in Admin Settings
            </button>
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
            <div className="text-2xl font-bold text-[#1A1A1A]">{availableCount}</div>
            <div className="text-xs text-[#666] font-medium">Agents Available</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Zap size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">0</div>
            <div className="text-xs text-[#666] font-medium">Tasks Today</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <Target size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">--</div>
            <div className="text-xs text-[#666] font-medium">Efficiency</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-[#EAD07D] border-[#EAD07D]">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <Clock size={20} className="text-[#EAD07D]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">0h</div>
            <div className="text-xs text-[#1A1A1A]/70 font-medium">Time Saved</div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { value: 'all', label: 'All Agents' },
          { value: 'available', label: 'Available' },
          { value: 'coming_soon', label: 'Coming Soon' }
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
            const isComingSoon = agent.status === 'coming_soon';
            return (
              <Card
                key={agent.id}
                className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-300 group ${
                  selectedAgent?.id === agent.id ? 'ring-2 ring-[#EAD07D] shadow-lg' : ''
                } ${isComingSoon ? 'opacity-75' : ''}`}
                onClick={() => setSelectedAgent(agent)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                      isComingSoon ? 'bg-gray-200 text-gray-500' : 'bg-[#1A1A1A] text-[#EAD07D]'
                    }`}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#1A1A1A]">{agent.name}</h3>
                      <Badge
                        variant={isComingSoon ? 'outline' : 'dark'}
                        size="sm"
                        dot={!isComingSoon}
                      >
                        {isComingSoon ? 'Coming Soon' : 'Available'}
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

                {/* Capabilities Preview */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {agent.capabilities.slice(0, 2).map((cap, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-[#F8F8F6] rounded text-[#666]">
                      {cap}
                    </span>
                  ))}
                  {agent.capabilities.length > 2 && (
                    <span className="text-[10px] px-2 py-1 bg-[#F8F8F6] rounded text-[#999]">
                      +{agent.capabilities.length - 2}
                    </span>
                  )}
                </div>

                {/* Action */}
                <button
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isComingSoon
                      ? 'bg-[#F8F8F6] text-[#999] cursor-not-allowed'
                      : 'bg-[#F8F8F6] text-[#1A1A1A] hover:bg-[#EAD07D]'
                  }`}
                  disabled={isComingSoon}
                >
                  {isComingSoon ? 'Notify Me' : 'Configure Agent'}
                </button>
              </Card>
            );
          })}
        </div>

        {/* Info Panel */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#FAFAF8]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#EAD07D]" />
              <h3 className="font-bold text-[#1A1A1A]">Getting Started</h3>
            </div>
          </div>
          <div className="p-6">
            {selectedAgent ? (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D]">
                    <selectedAgent.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A]">{selectedAgent.name}</h4>
                    <p className="text-xs text-[#666]">{selectedAgent.status === 'available' ? 'Ready to configure' : 'Coming soon'}</p>
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

                {selectedAgent.status === 'available' ? (
                  <button className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors">
                    Configure {selectedAgent.name}
                  </button>
                ) : (
                  <button className="w-full py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium cursor-not-allowed">
                    Coming Soon
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot size={48} className="mx-auto mb-4 text-[#999] opacity-40" />
                <p className="text-sm text-[#666] mb-2">Select an agent to learn more</p>
                <p className="text-xs text-[#999]">Click on any agent card to see details and configuration options</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* AI Insights Banner */}
      <Card variant="dark" className="p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EAD07D]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAD07D] flex items-center justify-center">
              <Sparkles size={24} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">AI-Powered CRM</h3>
              <p className="text-white/60 text-sm">
                Configure AI agents to automate research, outreach, and deal analysis across your pipeline.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white text-[#1A1A1A] rounded-full font-medium hover:bg-gray-100 transition-colors">
              View Documentation
            </button>
            <button className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-full font-medium hover:bg-white/20 transition-colors">
              Agent Settings
            </button>
          </div>
        </div>
      </Card>
    </div>
    </FeatureGate>
  );
};
