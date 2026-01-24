import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Copy,
  Trash2,
  MoreHorizontal,
  Zap,
  Mail,
  Clock,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  Search,
  ChevronRight,
  Users,
  Target,
  Calendar,
  FileText,
  Bell,
  Sparkles,
  TrendingUp,
  Phone,
  MessageSquare,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: { type: string; icon: React.ElementType; label: string };
  actions: { type: string; icon: React.ElementType; label: string }[];
  status: 'active' | 'paused' | 'draft';
  runs: number;
  successRate: number;
  lastRun: string;
  createdBy: { name: string; avatar: string };
  category: 'lead' | 'deal' | 'engagement' | 'notification';
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  popular: boolean;
}

const AUTOMATIONS: Automation[] = [
  {
    id: '1',
    name: 'New Lead Welcome Sequence',
    description: 'Send personalized welcome email when a new lead is captured, then follow up after 3 days.',
    trigger: { type: 'lead_created', icon: Users, label: 'Lead Created' },
    actions: [
      { type: 'send_email', icon: Mail, label: 'Send Email' },
      { type: 'wait', icon: Clock, label: 'Wait 3 days' },
      { type: 'send_email', icon: Mail, label: 'Follow-up Email' }
    ],
    status: 'active',
    runs: 1247,
    successRate: 98,
    lastRun: '5 min ago',
    createdBy: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    category: 'lead'
  },
  {
    id: '2',
    name: 'Deal Stage Notification',
    description: 'Notify team and update Slack when a deal moves to Proposal stage.',
    trigger: { type: 'deal_stage_changed', icon: Target, label: 'Deal Stage Changed' },
    actions: [
      { type: 'condition', icon: GitBranch, label: 'If Proposal' },
      { type: 'notify_team', icon: Bell, label: 'Notify Team' },
      { type: 'slack_message', icon: MessageSquare, label: 'Post to Slack' }
    ],
    status: 'active',
    runs: 89,
    successRate: 100,
    lastRun: '2 hours ago',
    createdBy: { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    category: 'deal'
  },
  {
    id: '3',
    name: 'Meeting Follow-up',
    description: 'Auto-send thank you email and create follow-up task after meeting ends.',
    trigger: { type: 'meeting_ended', icon: Calendar, label: 'Meeting Ended' },
    actions: [
      { type: 'send_email', icon: Mail, label: 'Thank You Email' },
      { type: 'create_task', icon: CheckCircle2, label: 'Create Task' },
      { type: 'ai_summary', icon: Sparkles, label: 'AI Summary' }
    ],
    status: 'active',
    runs: 423,
    successRate: 95,
    lastRun: '1 hour ago',
    createdBy: { name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    category: 'engagement'
  },
  {
    id: '4',
    name: 'At-Risk Deal Alert',
    description: 'Alert owner when deal health drops below 50% and hasn\'t been touched in 7 days.',
    trigger: { type: 'health_score_drop', icon: TrendingUp, label: 'Health Score Drop' },
    actions: [
      { type: 'condition', icon: GitBranch, label: 'If < 50%' },
      { type: 'send_email', icon: Mail, label: 'Alert Owner' },
      { type: 'create_task', icon: CheckCircle2, label: 'Urgent Task' }
    ],
    status: 'paused',
    runs: 67,
    successRate: 92,
    lastRun: '3 days ago',
    createdBy: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    category: 'notification'
  },
  {
    id: '5',
    name: 'Contract Sent Reminder',
    description: 'Remind prospect if contract hasn\'t been signed within 5 days.',
    trigger: { type: 'document_sent', icon: FileText, label: 'Document Sent' },
    actions: [
      { type: 'wait', icon: Clock, label: 'Wait 5 days' },
      { type: 'condition', icon: GitBranch, label: 'If Not Signed' },
      { type: 'send_email', icon: Mail, label: 'Reminder Email' }
    ],
    status: 'draft',
    runs: 0,
    successRate: 0,
    lastRun: 'Never',
    createdBy: { name: 'Marcus', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
    category: 'engagement'
  }
];

const TEMPLATES: AutomationTemplate[] = [
  { id: '1', name: 'Lead Nurture Sequence', description: '5-step email sequence for new leads', category: 'Lead', icon: Users, popular: true },
  { id: '2', name: 'Deal Won Celebration', description: 'Notify team and log activity on won deals', category: 'Deal', icon: Target, popular: true },
  { id: '3', name: 'Stale Lead Re-engagement', description: 'Re-engage leads with no activity in 30 days', category: 'Lead', icon: RefreshCw, popular: false },
  { id: '4', name: 'Meeting Prep Reminder', description: 'Send briefing doc 1 hour before meeting', category: 'Calendar', icon: Calendar, popular: true },
  { id: '5', name: 'Proposal Viewed Alert', description: 'Instant alert when proposal is opened', category: 'Document', icon: Eye, popular: false },
  { id: '6', name: 'Call Summary Distribution', description: 'AI-summarize calls and share with team', category: 'Engagement', icon: Phone, popular: false },
];

const getCategoryColor = (category: Automation['category']) => {
  switch (category) {
    case 'lead': return 'bg-[#F8F8F6] text-[#666]';
    case 'deal': return 'bg-[#EAD07D]/20 text-[#1A1A1A]';
    case 'engagement': return 'bg-[#1A1A1A] text-white';
    case 'notification': return 'bg-amber-100 text-amber-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export const Automations: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredAutomations = AUTOMATIONS.filter(auto => {
    const matchesFilter = filter === 'all' || auto.status === filter;
    const matchesSearch = auto.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeCount = AUTOMATIONS.filter(a => a.status === 'active').length;
  const totalRuns = AUTOMATIONS.reduce((sum, a) => sum + a.runs, 0);
  const avgSuccess = Math.round(AUTOMATIONS.filter(a => a.runs > 0).reduce((sum, a) => sum + a.successRate, 0) / AUTOMATIONS.filter(a => a.runs > 0).length);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96 mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D]">
              <Workflow size={20} />
            </div>
            <h1 className="text-3xl font-medium text-[#1A1A1A]">Automations</h1>
          </div>
          <p className="text-[#666]">Build workflows that work while you sleep</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[#1A1A1A] rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <Sparkles size={16} />
            Templates
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg">
            <Plus size={18} />
            New Automation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-[#1A1A1A]">{activeCount}</div>
            <div className="text-sm text-[#666]">Active Automations</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Zap size={22} className="text-[#1A1A1A]" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-[#1A1A1A]">{totalRuns.toLocaleString()}</div>
            <div className="text-sm text-[#666]">Total Runs</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <RefreshCw size={22} className="text-[#666]" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-[#1A1A1A]">{avgSuccess}%</div>
            <div className="text-sm text-[#666]">Success Rate</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <CheckCircle2 size={22} className="text-[#EAD07D]" />
          </div>
        </Card>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <Card className="p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#1A1A1A]">Quick Start Templates</h3>
            <button onClick={() => setShowTemplates(false)} className="text-sm text-[#666] hover:text-[#1A1A1A]">
              Hide
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(template => (
              <div
                key={template.id}
                className="p-4 border border-gray-100 rounded-xl hover:border-[#EAD07D] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F8F8F6] flex items-center justify-center group-hover:bg-[#EAD07D]/20 transition-colors">
                    <template.icon size={18} className="text-[#666] group-hover:text-[#1A1A1A]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[#1A1A1A] text-sm">{template.name}</h4>
                      {template.popular && <Badge variant="yellow" size="sm">Popular</Badge>}
                    </div>
                    <p className="text-xs text-[#666] mt-1">{template.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'paused', 'draft'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status as typeof filter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === status
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {filteredAutomations.map((automation, index) => (
          <Card
            key={automation.id}
            className="p-6 hover:shadow-lg transition-all duration-300 group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-[#1A1A1A] text-lg group-hover:text-[#EAD07D] transition-colors">
                    {automation.name}
                  </h3>
                  <Badge
                    variant={automation.status === 'active' ? 'green' : automation.status === 'paused' ? 'neutral' : 'outline'}
                    size="sm"
                    dot
                  >
                    {automation.status}
                  </Badge>
                  <Badge className={getCategoryColor(automation.category)} size="sm">
                    {automation.category}
                  </Badge>
                </div>
                <p className="text-sm text-[#666] mb-4">{automation.description}</p>

                {/* Workflow Visual */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F8F6] rounded-lg">
                    <automation.trigger.icon size={14} className="text-[#666]" />
                    <span className="text-xs font-medium text-[#1A1A1A]">{automation.trigger.label}</span>
                  </div>
                  {automation.actions.map((action, i) => (
                    <React.Fragment key={i}>
                      <ArrowRight size={14} className="text-[#ccc]" />
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F8F6] rounded-lg">
                        <action.icon size={14} className="text-[#666]" />
                        <span className="text-xs font-medium text-[#1A1A1A]">{action.label}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 lg:gap-8">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#1A1A1A]">{automation.runs.toLocaleString()}</div>
                  <div className="text-[10px] text-[#999] uppercase tracking-wide">Runs</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#1A1A1A]">{automation.successRate}%</div>
                  <div className="text-[10px] text-[#999] uppercase tracking-wide">Success</div>
                </div>
                <div className="text-center hidden md:block">
                  <div className="text-sm font-medium text-[#1A1A1A]">{automation.lastRun}</div>
                  <div className="text-[10px] text-[#999] uppercase tracking-wide">Last Run</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Avatar src={automation.createdBy.avatar} size="sm" className="hidden md:block" />
                <button className={`p-2.5 rounded-xl transition-all ${
                  automation.status === 'active'
                    ? 'bg-[#EAD07D]/20 text-[#1A1A1A] hover:bg-[#EAD07D]/30'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                  {automation.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
                  <Settings size={18} />
                </button>
                <button className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAutomations.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Workflow size={28} className="text-[#999]" />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No automations found</h3>
          <p className="text-[#666] mb-6">Try adjusting your filters or create a new automation.</p>
          <button className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors">
            Create Automation
          </button>
        </Card>
      )}
    </div>
  );
};
