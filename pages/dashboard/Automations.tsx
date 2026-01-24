import React, { useState, useMemo } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Zap,
  Mail,
  Clock,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
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
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { useFeatureFlags } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  popular: boolean;
  trigger: { label: string; icon: React.ElementType };
  actions: { label: string; icon: React.ElementType }[];
}

const TEMPLATES: AutomationTemplate[] = [
  {
    id: '1',
    name: 'New Lead Welcome Sequence',
    description: 'Send personalized welcome email when a new lead is captured, then follow up after 3 days.',
    category: 'Lead',
    icon: Users,
    popular: true,
    trigger: { label: 'Lead Created', icon: Users },
    actions: [
      { label: 'Send Email', icon: Mail },
      { label: 'Wait 3 days', icon: Clock },
      { label: 'Follow-up Email', icon: Mail }
    ]
  },
  {
    id: '2',
    name: 'Deal Stage Notification',
    description: 'Notify team when a deal moves to Proposal stage.',
    category: 'Deal',
    icon: Target,
    popular: true,
    trigger: { label: 'Deal Stage Changed', icon: Target },
    actions: [
      { label: 'If Proposal', icon: GitBranch },
      { label: 'Notify Team', icon: Bell }
    ]
  },
  {
    id: '3',
    name: 'Meeting Follow-up',
    description: 'Auto-send thank you email and create follow-up task after meeting ends.',
    category: 'Calendar',
    icon: Calendar,
    popular: true,
    trigger: { label: 'Meeting Ended', icon: Calendar },
    actions: [
      { label: 'Thank You Email', icon: Mail },
      { label: 'Create Task', icon: CheckCircle2 }
    ]
  },
  {
    id: '4',
    name: 'At-Risk Deal Alert',
    description: "Alert owner when deal health drops and hasn't been touched in 7 days.",
    category: 'Deal',
    icon: TrendingUp,
    popular: false,
    trigger: { label: 'Health Score Drop', icon: TrendingUp },
    actions: [
      { label: 'If < 50%', icon: GitBranch },
      { label: 'Alert Owner', icon: Mail }
    ]
  },
  {
    id: '5',
    name: 'Contract Reminder',
    description: "Remind prospect if contract hasn't been signed within 5 days.",
    category: 'Document',
    icon: FileText,
    popular: false,
    trigger: { label: 'Document Sent', icon: FileText },
    actions: [
      { label: 'Wait 5 days', icon: Clock },
      { label: 'Reminder Email', icon: Mail }
    ]
  },
  {
    id: '6',
    name: 'Call Summary Distribution',
    description: 'AI-summarize calls and share with team',
    category: 'Engagement',
    icon: Phone,
    popular: false,
    trigger: { label: 'Call Ended', icon: Phone },
    actions: [
      { label: 'AI Summary', icon: Sparkles },
      { label: 'Share with Team', icon: MessageSquare }
    ]
  },
];

export const Automations: React.FC = () => {
  const { featureFlags, loading } = useFeatureFlags();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const automationsEnabled = useMemo(() => {
    if (!featureFlags) return true; // Default to enabled while loading
    const flag = featureFlags.find(f => f.key === 'automations_enabled');
    return flag?.enabled ?? true; // Default to enabled if flag not found
  }, [featureFlags]);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || t.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const categories = ['all', 'Lead', 'Deal', 'Calendar', 'Document', 'Engagement'];

  if (loading) {
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

  if (!automationsEnabled) {
    return (
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-[#F8F8F6] flex items-center justify-center mb-6">
            <Workflow size={40} className="text-[#999]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Automations Not Enabled</h2>
          <p className="text-[#666] mb-6 text-center max-w-md">
            Automations are not enabled for your organization. Contact your administrator to enable this feature.
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
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg">
          <Plus size={18} />
          New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-[#1A1A1A]">0</div>
            <div className="text-sm text-[#666]">Active Automations</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Zap size={22} className="text-[#1A1A1A]" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-[#1A1A1A]">0</div>
            <div className="text-sm text-[#666]">Total Runs</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <RefreshCw size={22} className="text-[#666]" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-[#1A1A1A]">--</div>
            <div className="text-sm text-[#666]">Success Rate</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <CheckCircle2 size={22} className="text-[#EAD07D]" />
          </div>
        </Card>
      </div>

      {/* Templates Section */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Start with a Template</h3>
            <p className="text-sm text-[#666]">Choose a pre-built automation to get started quickly</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, index) => {
            const Icon = template.icon;
            return (
              <div
                key={template.id}
                className="p-5 border border-gray-100 rounded-2xl hover:border-[#EAD07D] hover:shadow-lg transition-all cursor-pointer group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D] group-hover:scale-110 transition-transform">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#1A1A1A] text-sm">{template.name}</h4>
                        {template.popular && <Badge variant="yellow" size="sm">Popular</Badge>}
                      </div>
                      <span className="text-xs text-[#999]">{template.category}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#666] mb-4 line-clamp-2">{template.description}</p>

                {/* Workflow Visual */}
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F6] rounded text-[10px] font-medium text-[#666]">
                    <template.trigger.icon size={10} />
                    {template.trigger.label}
                  </div>
                  {template.actions.slice(0, 2).map((action, i) => (
                    <React.Fragment key={i}>
                      <ArrowRight size={10} className="text-[#ccc]" />
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F6] rounded text-[10px] font-medium text-[#666]">
                        <action.icon size={10} />
                        {action.label}
                      </div>
                    </React.Fragment>
                  ))}
                  {template.actions.length > 2 && (
                    <span className="text-[10px] text-[#999]">+{template.actions.length - 2}</span>
                  )}
                </div>

                <button className="w-full py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#EAD07D] transition-colors">
                  Use Template
                </button>
              </div>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Workflow size={48} className="mx-auto mb-4 text-[#999] opacity-40" />
            <p className="text-[#666]">No templates match your search</p>
          </div>
        )}
      </Card>

      {/* Empty State for No Automations */}
      <Card className="p-12 text-center border-dashed border-2 border-gray-200">
        <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28} className="text-[#EAD07D]" />
        </div>
        <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No automations yet</h3>
        <p className="text-[#666] mb-6 max-w-md mx-auto">
          Create your first automation to save time and automate repetitive tasks.
          Start with a template above or create a custom workflow.
        </p>
        <button className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors">
          Create Custom Automation
        </button>
      </Card>
    </div>
  );
};
